# Critical Builder

Personal blog built with [Astro](https://astro.build), deployed to Cloudflare.

## Commands

Requires Node 24 (`nvm use` picks it up from `.nvmrc`).

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm install`     | Install dependencies                                |
| `npm run dev`     | Dev server at `localhost:4321` (drafts are visible) |
| `npm run build`   | Production build to `./dist`                        |
| `npm run preview` | Serve the production build locally                  |
| `npm run check`   | Type-check `.astro` and `.ts` files                 |
| `npm run deploy`  | Build and deploy to Cloudflare from your machine    |

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
draft: true # optional; drafts only show in `npm run dev`
---

Post body…
```

`src/content/blog/style-guide.md` is a draft that shows every supported Markdown element. Keep it as a reference or delete it.

Images can sit next to the post (e.g. `src/content/blog/build-vs-buy/diagram.png`) and be referenced with a relative path. Astro optimises them at build time.

## URLs

| Path               | Page                                               |
| ------------------ | -------------------------------------------------- |
| `/`                | Intro and latest posts                             |
| `/blog`            | All posts and tags                                 |
| `/blog/<slug>`     | A post                                             |
| `/blog/tags`       | All tags                                           |
| `/blog/tags/<tag>` | Posts with a tag                                   |
| `/rss.xml`         | RSS feed                                           |
| `/sitemap-index.xml` | Sitemap                                          |
| `/og/...png`       | Generated social preview images (one per post)     |

To add a page such as `/about`, create `src/pages/about.astro` using `BaseLayout`, then add it to `NAV_LINKS` in `src/consts.ts`.

## Configuration

- `src/consts.ts`: site title, description, author and navigation.
- `astro.config.mjs`: `site` must be the production URL (used for canonical links, RSS, sitemap and social images).
- `src/styles/global.css`: colour tokens (light and dark) and layout.
- `src/styles/prose.css`: article typography.

## Deploying to Cloudflare

The site is fully static. `wrangler.jsonc` tells Cloudflare Workers to serve `./dist` as static assets, with clean URLs and `404.html` for unknown paths.

**Automatic deploys from GitHub (recommended):**

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → pick `criticalbuilder`.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
3. Every push to `main` deploys. Other branches get preview URLs.
4. Add the custom domain under the Worker's **Settings → Domains & Routes**.

**From your machine:** `npx wrangler login` once, then `npm run deploy`.
