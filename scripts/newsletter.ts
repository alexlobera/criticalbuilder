/**
 * Turns a published post into a Resend broadcast.
 *
 *   npm run newsletter -- <slug>            Create a draft broadcast to review and send in Resend
 *   npm run newsletter -- <slug> --send     Create it and send it right away
 *   npm run newsletter -- <slug> --preview  Only write the email HTML to .newsletter/<slug>.html
 *
 * The email is built from the post as rendered by `npm run build` (dist/blog/<slug>.html), so it
 * has the same content, links and code highlighting as the site. Before creating a broadcast the
 * script checks the post is live, because the email links to it (skip with --force).
 *
 * Needs RESEND_API_KEY (in .env). SITE_URL, NEWSLETTER_FROM and RESEND_SEGMENT_ID come from
 * wrangler.jsonc, or can be overridden with environment variables of the same name.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { Resend } from 'resend';
import { unstable_readConfig } from 'wrangler';

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    send: { type: 'boolean', default: false },
    preview: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const slug = positionals[0];
if (!slug || flags.help) {
  console.log('Usage: npm run newsletter -- <slug> [--send | --preview] [--force]');
  process.exit(slug ? 0 : 1);
}

const vars = unstable_readConfig({ config: 'wrangler.jsonc' }, { hideWarnings: true }).vars as Record<string, string>;
const config = {
  siteUrl: (process.env.SITE_URL ?? vars.SITE_URL).replace(/\/$/, ''),
  from: process.env.NEWSLETTER_FROM ?? vars.NEWSLETTER_FROM,
  segmentId: process.env.RESEND_SEGMENT_ID ?? vars.RESEND_SEGMENT_ID,
  apiKey: process.env.RESEND_API_KEY ?? '',
};

const post = await readBuiltPost(slug);
const postUrl = `${config.siteUrl}/blog/${slug}`;
const html = emailHtml(post, postUrl, config.siteUrl);
const text = [
  post.title,
  '',
  post.description,
  '',
  `Read it on the web: ${postUrl}`,
  '',
  '—',
  'You are receiving this because you subscribed to Critical Builder.',
  'Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}',
].join('\n');

await mkdir('.newsletter', { recursive: true });
const previewPath = join('.newsletter', `${slug}.html`);
await writeFile(previewPath, html);
console.log(`Email HTML written to ${previewPath}`);
if (flags.preview) process.exit(0);

if (!config.apiKey) fail('RESEND_API_KEY is not set. Add it to .env (see .env.example).');
if (!config.segmentId) fail('RESEND_SEGMENT_ID is empty. Set it in wrangler.jsonc.');

if (!flags.force) {
  const res = await fetch(postUrl, { method: 'HEAD', redirect: 'manual' }).catch(() => null);
  if (res?.status !== 200) {
    fail(`${postUrl} returned ${res?.status ?? 'no response'}. Deploy the post first, or pass --force.`);
  }
}

const resend = new Resend(config.apiKey);
const base = {
  name: `${post.number} · ${post.title}`,
  segmentId: config.segmentId,
  from: config.from,
  subject: post.title,
  previewText: post.description,
  html,
  text,
};
const { data, error } = flags.send
  ? await resend.broadcasts.create({ ...base, send: true })
  : await resend.broadcasts.create(base);

if (error || !data) fail(`Resend error: ${error?.message ?? 'unknown error'}`);

console.log(
  flags.send
    ? `Sending "${post.title}" to your subscribers (broadcast ${data.id}).`
    : `Draft broadcast created (${data.id}). Review and send it in Resend → Broadcasts.`,
);

// ── Helpers ───────────────────────────────────────────────────────────────

interface BuiltPost {
  title: string;
  titleHtml: string;
  description: string;
  descriptionHtml: string;
  number: string;
  date: string;
  contentHtml: string;
}

async function readBuiltPost(slug: string): Promise<BuiltPost> {
  const file = join('dist', 'blog', `${slug}.html`);
  const page = await readFile(file, 'utf8').catch(() =>
    fail(`${file} not found. Run \`npm run build\` first (drafts are never built).`),
  );

  const meta = (attr: string) =>
    new RegExp(`<meta ${attr}="([^"]*)"`).exec(page)?.[1] ??
    fail(`Couldn't find <meta ${attr}> in ${file}.`);
  const content = /<!-- email-content:start -->([\s\S]*?)<!-- email-content:end -->/.exec(page)?.[1];
  if (!content) fail(`Couldn't find the post content markers in ${file}.`);

  const titleHtml = meta('property="og:title" content');
  const descriptionHtml = meta('name="description" content');
  const published = new Date(decode(meta('property="article:published_time" content')));

  return {
    title: decode(titleHtml),
    titleHtml,
    description: decode(descriptionHtml),
    descriptionHtml,
    number: /data-post-number[^>]*>([^<]*)</.exec(page)?.[1]?.trim() ?? '',
    date: published.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    contentHtml: content,
  };
}

/** Makes the site's rendered HTML email-safe. */
function emailSafe(html: string, siteUrl: string): string {
  return (
    html
      // Shiki writes colours as CSS variables (for the site's theme toggle); email needs real colours.
      .replace(/style="([^"]*--shiki-light:[^"]*)"/g, (_, style: string) => {
        const color = /--shiki-light:\s*([^;]+)/.exec(style)?.[1];
        return color ? `style="color:${color}"` : '';
      })
      // Keep only the <img> of a <picture> (its src is a JPEG/PNG every email client can show),
      // and drop responsive attributes that point at relative files.
      .replace(/<\/?picture[^>]*>|<source\b[^>]*>/g, '')
      .replace(/\s(srcset|sizes)="[^"]*"/g, '')
      // Root-relative links and images → absolute URLs.
      .replace(/\b(href|src)="\/(?!\/)/g, `$1="${siteUrl}/`)
  );
}

function emailHtml(post: BuiltPost, postUrl: string, siteUrl: string): string {
  const host = new URL(siteUrl).host;
  // Light-mode colours from src/styles/global.css; email clients get a system monospace font.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${post.titleHtml}</title>
<style>
  body { margin: 0; padding: 0; background: #fafafa; }
  .wrap { font-family: Menlo, Consolas, 'SF Mono', 'Courier New', monospace; color: #22272a; }
  .brand { font-size: 15px; line-height: 1.15; font-weight: bold; letter-spacing: 2px; color: #121212; }
  .meta { font-size: 12px; color: #4a5565; margin: 28px 0 10px; }
  .meta b { color: #cb2a42; }
  .meta a { color: #4f746f; }
  .title { font-size: 24px; line-height: 1.3; font-weight: bold; margin: 0 0 12px; }
  .title a { color: #121212; text-decoration: none; }
  .dek { font-size: 15px; line-height: 1.6; color: #4a5565; margin: 0 0 24px; padding-bottom: 24px; border-bottom: 1px dashed #4a5565; }
  .content { font-size: 15px; line-height: 1.75; }
  .content p, .content ul, .content ol, .content blockquote, .content pre, .content table, .content figure { margin: 0 0 20px; }
  .content h2, .content h3, .content h4 { color: #121212; font-weight: bold; line-height: 1.35; }
  .content h2 { font-size: 19px; margin: 32px 0 10px; }
  .content h3 { font-size: 16px; margin: 26px 0 8px; }
  .content h4 { font-size: 15px; margin: 24px 0 8px; }
  .content a { color: #121212; text-decoration: underline; text-decoration-color: #cb2a42; }
  .content strong { color: #121212; }
  .content li { margin-bottom: 6px; }
  .content blockquote { margin-left: 0; padding-left: 14px; border-left: 2px solid #cb2a42; color: #4a5565; font-style: italic; }
  .content code { font-size: 14px; padding: 1px 4px; border: 1px dotted #4a5565; border-radius: 2px; }
  .content pre { font-size: 13px; line-height: 1.6; background: #f0f0f0; border: 1px solid #d4d4d4; padding: 14px 16px; overflow-x: auto; white-space: pre; }
  .content pre code { border: 0; padding: 0; font-size: 13px; }
  .content img { max-width: 100%; height: auto; border: 1px solid #d4d4d4; }
  .content table { border-collapse: collapse; font-size: 13px; }
  .content th, .content td { border-bottom: 1px dashed #d4d4d4; padding: 6px 14px 6px 0; text-align: left; }
  .content hr { border: 0; border-top: 1px dashed #4a5565; margin: 28px 0; }
  .content .footnotes { font-size: 13px; border-top: 1px dashed #4a5565; margin-top: 32px; padding-top: 10px; }
  .content .sr-only { display: none; }
  .cta { font-size: 13px; margin: 32px 0 0; padding-top: 20px; border-top: 1px dashed #4a5565; }
  .cta a { color: #cb2a42; }
  .footer { font-size: 12px; line-height: 1.5; color: #4a5565; margin: 24px 0 0; }
  .footer a { color: #4a5565; }
</style>
</head>
<body>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;">
  <tr><td align="center" style="padding:36px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td class="wrap">
        <p class="brand" style="margin:0;">CRITICAL<br><span style="color:#cb2a42;">BUILDER</span></p>
        <p class="meta"><b>${post.number}</b> / ${post.date} / <a href="${postUrl}">Read on the web</a></p>
        <h1 class="title"><a href="${postUrl}">${post.titleHtml}</a></h1>
        <p class="dek">${post.descriptionHtml}</p>
        <div class="content">${emailSafe(post.contentHtml, siteUrl)}</div>
        <p class="cta"><a href="${postUrl}">Read it on ${host} &rarr;</a></p>
        <p class="footer">You're receiving this because you subscribed to Critical Builder at ${host}.
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}
