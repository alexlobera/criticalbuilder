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
- URLs are permanent: posts live at `/blog/<file-name>` with no dates and no trailing slash (`trailingSlash: 'never'`, `build.format: 'file'`). Don't change these settings or post file names once a post is published.
- Blog posts: `src/content/blog/*.md(x)`, schema in `src/content.config.ts`. Post helpers (sorting, numbering, tags, reading time) live in `src/lib/posts.ts`.
- Social preview images are generated at build time by `src/lib/og.ts` (satori + resvg) using the static Fontsource `.woff` files.
- Layout uses a two-column grid (`.wrap.row` with `.margin` + `.main`) defined in `src/styles/global.css`. Colours are CSS tokens with light/dark variants.
- Run `npm run check` and `npm run build` before committing.
