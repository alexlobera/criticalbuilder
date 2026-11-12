import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  // The file name becomes the URL: src/content/blog/my-post.md -> /blog/my-post.
  // Add `slug: other-name` to the frontmatter to override it.
  // Files starting with an underscore are ignored.
  loader: glob({ base: './src/content/blog', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        tags: z.array(z.string()).default([]),
        // Optional cover image, relative to the post file (e.g. ./build-vs-buy/cover.jpg).
        // Posts without one get a generated cover showing their number and title.
        cover: image().optional(),
        // Describes the cover for screen readers. Required when there's a cover.
        coverAlt: z.string().optional(),
        // Drafts are visible in `npm run dev` but never built for production.
        draft: z.boolean().default(false),
      })
      .refine((post) => !post.cover || post.coverAlt, {
        message: 'Add `coverAlt` to describe the cover image.',
        path: ['coverAlt'],
      }),
});

export const collections = { blog };
