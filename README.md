# Critical Builder

Personal blog built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com), deployed to Cloudflare. The look (monospace type, light and dark themes, colours) follows the MIT-licensed [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) theme.

## Commands

Requires Node 24 (`nvm use` picks it up from `.nvmrc`).

| Command                         | What it does                                                          |
| ------------------------------- | --------------------------------------------------------------------- |
| `npm install`                   | Install dependencies                                                  |
| `npm run dev`                   | Dev server at `localhost:4321` for writing (drafts are visible)       |
| `npm run build`                 | Production build to `./dist`                                          |
| `npm run preview`               | Build, then run the site and newsletter Worker at `localhost:8787`    |
| `npm run check`                 | Type-check the site and the Worker                                    |
| `npm run newsletter -- <slug>`  | Turn a published post into a Resend broadcast (see below)             |
| `npm run deploy`                | Build and deploy to Cloudflare from your machine                      |

## Writing a post

Add a Markdown (`.md`) or MDX (`.mdx`) file to `src/content/blog/`. The file name is the URL:
`src/content/blog/build-vs-buy.md` → `/blog/build-vs-buy`.

```md
---
title: Build vs. buy, revisited
description: One or two sentences. Used on the home page, in RSS and in link previews.
pubDate: 2026-11-12
updatedDate: 2026-12-01 # optional
tags: [architecture, leadership] # optional
cover: ./build-vs-buy/cover.jpg # optional
coverAlt: Two shipping containers on a dock # required with a cover
draft: true # optional; drafts only show in `npm run dev`
---

Post body…
```

`src/content/blog/style-guide.md` is a draft that shows every supported Markdown element. Keep it as a reference or delete it.

Images can sit next to the post (e.g. `src/content/blog/build-vs-buy/diagram.png`) and be referenced with a relative path. Astro optimises them at build time.

**Cover images.** The home page shows the newest post large, then the rest one per row with a thumbnail. `cover` is optional: a post without one gets a generated cover showing its number (and its title on the large version). A landscape image works best; covers are cropped to 16:9 for thumbnails and 16:7 for the featured post, and shown uncropped at the top of the post. The cover is also included in the newsletter email.

## URLs

| Path                 | Page                                           |
| -------------------- | ---------------------------------------------- |
| `/`                  | Intro and all posts                            |
| `/blog/<slug>`       | A post                                         |
| `/blog/tags/<tag>`   | Posts with a tag                               |
| `/newsletter`        | Newsletter signup                              |
| `/rss.xml`           | RSS feed                                       |
| `/sitemap-index.xml` | Sitemap                                        |
| `/og/...png`         | Generated social preview images (one per post) |

`/blog` itself isn't a page yet: `public/_redirects` sends it to `/` with a temporary (302) redirect. When the home page needs to show only recent posts, add `src/pages/blog/index.astro`, delete those redirect lines, and limit the list in `src/pages/index.astro`.

To add a page such as `/about`, create `src/pages/about.astro` using `BaseLayout`, then add it to `NAV_LINKS` in `src/consts.ts`.

## Configuration

- `src/consts.ts`: site title, description, home page heading, author and navigation.
- `astro.config.mjs`: `site` must be the production URL (used for canonical links, RSS, sitemap and social images).
- `src/styles/global.css`: Tailwind setup and the colour tokens for light and dark mode. Tailwind classes like `bg-bg`, `text-muted` and `text-accent` use these tokens, so they switch with the theme.
- `src/styles/prose.css`: article typography.
- `src/lib/wordmark.ts`: the pixel wordmark (letter shapes and layout), drawn by `src/components/Wordmark.astro` in the header and by `src/lib/og.ts` on social images. `public/favicon.svg` is a short pixel "CB" version.
- `src/lib/og.ts`: the social preview images.

## Newsletter (Resend)

Signups use double opt-in and need no database:

1. The form posts to `/api/subscribe` (a small Cloudflare Worker, `worker/index.ts`). It checks the email (plus a honeypot field, a per-IP rate limit and, optionally, Cloudflare Turnstile) and emails a signed confirmation link.
2. The link opens `/newsletter/confirm`, where the reader presses **Confirm**. A button rather than the link itself, so email security scanners that open links can't subscribe anyone.
3. `/api/confirm` checks the signature and adds the contact to a Resend segment.

The form works without JavaScript (the Worker redirects to `/newsletter/check-email`, `/confirmed`, `/expired` or `/error`); with JavaScript it shows messages inline.

### One-time setup

1. **Domain.** In Resend → Domains, add the sending domain (`news.criticalbuilder.com` by default; change `NEWSLETTER_FROM` in `wrangler.jsonc` to use another) and add the DNS records it lists in Cloudflare DNS.
2. **Segment.** In Resend → Audience, create a segment (e.g. "Newsletter") and put its ID in `RESEND_SEGMENT_ID` in `wrangler.jsonc`.
3. **API key.** In Resend → API Keys, create a key with full access (it needs to manage contacts).
4. **Worker secrets:**
   ```sh
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put NEWSLETTER_SECRET   # paste the output of: openssl rand -base64 32
   ```
5. **Local files** (both gitignored): copy `.env.example` to `.env` (used by `npm run newsletter`) and `.dev.vars.example` to `.dev.vars` (used by `npm run preview`).
6. **Optional, recommended: Turnstile.** In Cloudflare → Turnstile, add a widget for your domain. Set `PUBLIC_TURNSTILE_SITE_KEY` as a build variable (Worker → Settings → Build → Variables) and run `npx wrangler secret put TURNSTILE_SECRET_KEY`.

### Sending a post

1. Publish the post and wait for the deploy, since the email links to it.
2. Run:
   ```sh
   npm run build
   npm run newsletter -- build-vs-buy            # creates a draft broadcast in Resend
   ```
3. Review the draft in Resend → Broadcasts and send it.

Options: `--send` sends immediately instead of creating a draft, `--preview` only writes the email to `.newsletter/<slug>.html` so you can open it in a browser, and `--force` skips the check that the post is live.

The email contains the full post, with absolute links and the same code highlighting as the site. Every email includes Resend's unsubscribe link.

## Deploying to Cloudflare

Pages are static files. `wrangler.jsonc` tells Cloudflare to serve `./dist` as static assets, with clean URLs and `404.html` for unknown paths. Only `/api/*` and `/newsletter/confirm` run the Worker.

**Automatic deploys from GitHub (recommended):**

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick `criticalbuilder`.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
3. Every push to `main` deploys. Other branches get preview URLs.
4. Add the custom domain under the Worker's **Settings → Domains & Routes**.

**From your machine:** `npx wrangler login` once, then `npm run deploy`.
