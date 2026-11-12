// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs, the sitemap, RSS and social-preview images.
  site: 'https://criticalbuilder.com',

  // Clean URLs: /blog/my-post (no trailing slash), emitted as blog/my-post.html.
  // Cloudflare serves these at the extensionless path.
  trailingSlash: 'never',
  build: { format: 'file' },

  integrations: [
    mdx(),
    sitemap({
      // Newsletter status pages (check your inbox, confirmed, …) aren't for search engines.
      filter: (page) => !new URL(page).pathname.startsWith('/newsletter/'),
    }),
  ],

  env: {
    schema: {
      // Cloudflare Turnstile site key for the newsletter form. Optional: leave unset to skip the bot check.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },

  markdown: {
    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
      // Colors are applied in global.css so code follows the site's theme toggle.
      defaultColor: false,
    },
  },

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: ['400', '700'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
