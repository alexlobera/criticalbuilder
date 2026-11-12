/**
 * Newsletter endpoints for the static site.
 *
 *   POST /api/subscribe     Validates the email, then sends a confirmation link (double opt-in).
 *   GET  /newsletter/confirm  Static page with a "Confirm" button; the token is injected here so
 *                           email link scanners that prefetch URLs can't subscribe anyone.
 *   POST /api/confirm       Verifies the signed token and adds the contact to Resend.
 *
 * Everything else is served from static assets without reaching this Worker
 * (see `run_worker_first` in wrangler.jsonc).
 *
 * Forms work without JavaScript (303 redirects to status pages). Requests sent with
 * `Accept: application/json` get JSON instead, for inline messages.
 */

interface Env {
  ASSETS: Fetcher;
  SUBSCRIBE_LIMITER?: RateLimit;
  SITE_URL: string;
  NEWSLETTER_FROM: string;
  RESEND_SEGMENT_ID: string;
  RESEND_API_KEY: string;
  NEWSLETTER_SECRET: string;
  TURNSTILE_SECRET_KEY?: string;
}

type ErrorCode = 'invalid_email' | 'captcha' | 'rate_limited' | 'invalid_token' | 'expired' | 'server';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const RESEND_API = 'https://api.resend.com';

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      return subscribe(request, env);
    }
    if (url.pathname === '/api/confirm' && request.method === 'POST') {
      return confirm(request, env);
    }
    if (url.pathname === '/newsletter/confirm' && request.method === 'GET') {
      return confirmPage(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

// ── Handlers ──────────────────────────────────────────────────────────────

async function subscribe(request: Request, env: Env): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return fail(request, 'invalid_email', 400);

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (String(form.get('website') ?? '').trim()) return succeed(request, '/newsletter/check-email');

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (env.SUBSCRIBE_LIMITER) {
    const { success } = await env.SUBSCRIBE_LIMITER.limit({ key: ip });
    if (!success) return fail(request, 'rate_limited', 429);
  }

  const email = normalizeEmail(form.get('email'));
  if (!email) return fail(request, 'invalid_email', 400);

  if (env.TURNSTILE_SECRET_KEY) {
    const passed = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, form.get('cf-turnstile-response'), ip);
    if (!passed) return fail(request, 'captcha', 400);
  }

  if (!env.RESEND_API_KEY || !env.NEWSLETTER_SECRET) {
    console.error('Newsletter is not configured: RESEND_API_KEY and NEWSLETTER_SECRET are required.');
    return fail(request, 'server', 500);
  }

  const token = await signToken(env.NEWSLETTER_SECRET, { e: email, t: Date.now() });
  const confirmUrl = `${env.SITE_URL}/newsletter/confirm?token=${token}`;

  const sent = await resend(env, 'POST', '/emails', confirmationEmail(env, email, confirmUrl), {
    // Repeated submissions within 10 minutes don't send duplicate emails.
    'Idempotency-Key': `confirm/${email}/${Math.floor(Date.now() / 600_000)}`,
  });
  if (!sent.ok) {
    console.error('Failed to send confirmation email', sent.status, await sent.text());
    return fail(request, 'server', 502);
  }

  return succeed(request, '/newsletter/check-email');
}

async function confirm(request: Request, env: Env): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const token = String(form?.get('token') ?? '');

  const payload = TOKEN_PATTERN.test(token) ? await verifyToken(env.NEWSLETTER_SECRET, token) : null;
  if (!payload) return fail(request, 'invalid_token', 400);
  if (Date.now() - payload.t > TOKEN_TTL_MS) return fail(request, 'expired', 400);

  if (!env.RESEND_SEGMENT_ID) {
    console.error('Newsletter is not configured: RESEND_SEGMENT_ID is empty.');
    return fail(request, 'server', 500);
  }

  const added = await addContact(env, payload.e);
  if (!added) return fail(request, 'server', 502);

  return succeed(request, '/newsletter/confirmed');
}

/** Serves the static confirm page with the token placed in its hidden form field. */
async function confirmPage(request: Request, env: Env): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const page = await env.ASSETS.fetch(request);
  if (!TOKEN_PATTERN.test(token)) return page;

  return new HTMLRewriter()
    .on('input[name="token"]', {
      element(el) {
        el.setAttribute('value', token);
      },
    })
    .transform(page);
}

// ── Resend ────────────────────────────────────────────────────────────────

async function resend(
  env: Env,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  let res = await fetch(`${RESEND_API}${path}`, init);
  // Resend allows a few requests per second; retry once if we hit that.
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    res = await fetch(`${RESEND_API}${path}`, init);
  }
  return res;
}

/** Creates the contact, or re-subscribes an existing one, in the newsletter segment. */
async function addContact(env: Env, email: string): Promise<boolean> {
  const segment = env.RESEND_SEGMENT_ID;
  const created = await resend(env, 'POST', '/contacts', {
    email,
    unsubscribed: false,
    segments: [{ id: segment }],
  });
  if (created.ok) return true;

  // Most likely the contact already exists (e.g. they unsubscribed and came back).
  const createError = await created.text();
  // Same as Resend's SDK: the address goes in the path as-is, only URL-unsafe characters escaped.
  const path = `/contacts/${encodeURIComponent(email).replace('%40', '@')}`;
  const updated = await resend(env, 'PATCH', path, { unsubscribed: false });
  if (!updated.ok) {
    console.error('Failed to add contact', created.status, createError, updated.status, await updated.text());
    return false;
  }

  const joined = await resend(env, 'POST', `${path}/segments/${segment}`);
  if (!joined.ok && joined.status !== 409) {
    // Usually means they're already in the segment, which is fine. Log anything else.
    console.warn('Adding existing contact to segment returned', joined.status, await joined.text());
  }
  return true;
}

function confirmationEmail(env: Env, to: string, confirmUrl: string) {
  const site = new URL(env.SITE_URL).host;
  return {
    from: env.NEWSLETTER_FROM,
    to,
    subject: 'Confirm your subscription to Critical Builder',
    text: [
      'Confirm your subscription to Critical Builder',
      '',
      'Open this link to start getting new posts by email:',
      confirmUrl,
      '',
      `If you didn't ask to subscribe at ${site}, ignore this email and you won't hear from us again.`,
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f1e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="font-family:Menlo,Consolas,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#1b1915;padding-bottom:28px;">
          <span style="display:inline-block;width:9px;height:9px;background:#d2401c;"></span>&nbsp;&nbsp;Critical Builder
        </td></tr>
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;color:#1b1915;padding-bottom:16px;">
          Confirm your subscription
        </td></tr>
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.55;color:#47433b;padding-bottom:28px;">
          Click the button below to start getting new posts by email. The link works for 7 days.
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <a href="${confirmUrl}" style="display:inline-block;background:#1b1915;color:#f5f1e8;font-family:Menlo,Consolas,monospace;font-size:13px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 22px;">Confirm subscription &rarr;</a>
        </td></tr>
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.5;color:#6c665b;border-top:1px solid #e2dbcd;padding-top:20px;">
          If you didn't ask to subscribe at ${site}, ignore this email and you won't hear from us again.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function verifyTurnstile(secret: string, token: unknown, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', String(token));
  body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = await res.json<{ success: boolean }>().catch(() => ({ success: false }));
  return result.success;
}

const wantsJson = (request: Request) => request.headers.get('Accept')?.includes('application/json') ?? false;

function succeed(request: Request, page: string): Response {
  if (wantsJson(request)) return Response.json({ ok: true });
  return Response.redirect(new URL(page, request.url).toString(), 303);
}

function fail(request: Request, error: ErrorCode, status: number): Response {
  if (wantsJson(request)) return Response.json({ ok: false, error }, { status });
  const page = error === 'expired' ? '/newsletter/expired' : '/newsletter/error';
  return Response.redirect(new URL(page, request.url).toString(), 303);
}

// ── Signed tokens (HMAC-SHA256, no database needed) ───────────────────────

interface TokenPayload {
  /** Email */
  e: string;
  /** Issued at, ms since epoch */
  t: number;
}

const encoder = new TextEncoder();

function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(secret: string, token: string): Promise<TokenPayload | null> {
  if (!secret) return null;
  const [body, signature] = token.split('.');
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as TokenPayload;
    return typeof payload.e === 'string' && typeof payload.t === 'number' ? payload : null;
  } catch {
    return null;
  }
}
