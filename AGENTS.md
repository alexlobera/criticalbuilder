## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Project notes

- Node 24 (`.nvmrc`). Run `nvm use` before npm commands.
- Static site, deployed to Cloudflare Workers static assets (`wrangler.jsonc`). Don't add an SSR adapter unless a page needs server rendering.
- The only server code is the newsletter Worker in `worker/index.ts` (double opt-in via HMAC-signed tokens, Resend REST API). It runs only for paths in `assets.run_worker_first`. It has its own tsconfig; `npm run cf-typegen` regenerates its types after changing `wrangler.jsonc`.
- `npm run newsletter -- <slug>` (scripts/newsletter.ts) builds a broadcast from `dist/blog/<slug>.html`, using the `email-content:start/end` markers and the `data-post-number` element in the post template. Keep both, and keep its email colours in sync with `global.css`.
- With `build.format: 'file'`, `Astro.url.pathname` ends in `.html` at build time. Use `cleanPath()` from `src/lib/url.ts` for anything URL-related.
- The home page lists all posts; `/blog` is a temporary 302 to `/` (`public/_redirects`) until it becomes a real archive page.
- URLs are permanent: posts live at `/blog/<file-name>` with no dates and no trailing slash (`trailingSlash: 'never'`, `build.format: 'file'`). Don't change these settings or post file names once a post is published.
- Blog posts: `src/content/blog/*.md(x)`, schema in `src/content.config.ts`. Post helpers (sorting, numbering, tags, reading time) live in `src/lib/posts.ts`.
- Social preview images are generated at build time by `src/lib/og.ts` (satori + resvg) using the static Fontsource `.woff` files.
- Styling is Tailwind CSS 4 (`@tailwindcss/vite`), based on the Astro Cactus theme. Colours are CSS variables in `src/styles/global.css` with light/dark values, exposed to Tailwind via `@theme inline` (`bg-bg`, `text-strong`, `text-muted`, `text-link`, `text-accent`, `border-rule`, `bg-surface`). Use these instead of raw colours or `dark:` variants: dark mode is `prefers-color-scheme` unless `html[data-theme]` overrides it.
- Single font: JetBrains Mono via the Astro Fonts API (`--font-jetbrains`, mapped to Tailwind's `font-mono`). Article typography is plain CSS in `src/styles/prose.css`.
- Post lists use `FeaturedPost` (newest post on the home page), `PostList` (one per row with a thumbnail), `PostMeta` and `Cover`. Covers come from the optional `cover` + `coverAlt` frontmatter (`image()` in the schema); without one, `Cover` draws a generated cover.
- Run `npm run check` and `npm run build` before committing.
