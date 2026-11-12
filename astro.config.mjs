// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs, the sitemap, RSS and social-preview images.
  site: 'https://criticalbuilder.com',

  // Clean URLs: /blog/my-post (no trailing slash), emitted as blog/my-post.html.
  // Cloudflare serves these at the extensionless path.
  trailingSlash: 'never',
  build: { format: 'file' },

  integrations: [mdx(), sitemap()],

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
      name: 'Newsreader',
      cssVariable: '--font-serif',
      weights: ['200 800'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: ['400', '500'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
