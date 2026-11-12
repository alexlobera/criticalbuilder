import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  // The file name becomes the URL: src/content/blog/my-post.md -> /blog/my-post.
  // Add `slug: other-name` to the frontmatter to override it.
  // Files starting with an underscore are ignored.
  loader: glob({ base: './src/content/blog', pattern: '**/[^_]*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // Drafts are visible in `npm run dev` but never built for production.
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
