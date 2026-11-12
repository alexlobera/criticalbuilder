import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export type BlogPost = BlogEntry & {
  /** Sequential number in publication order (oldest = 1). 0 for drafts. */
  number: number;
  /** Estimated reading time in minutes. */
  minutes: number;
};

const WORDS_PER_MINUTE = 230;

function readingTime(body = ''): number {
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** All posts, newest first. Drafts are only included in development. */
export async function getPosts(): Promise<BlogPost[]> {
  const entries = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);

  const published = entries
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
  const numbers = new Map(published.map((entry, index) => [entry.id, index + 1]));

  return entries
    .map((entry) => ({
      ...entry,
      number: numbers.get(entry.id) ?? 0,
      minutes: readingTime(entry.body),
    }))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface Tag {
  slug: string;
  name: string;
  posts: BlogPost[];
}

/** Tags across all posts, most used first. */
export function getTags(posts: BlogPost[]): Tag[] {
  const tags = new Map<string, Tag>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = tagSlug(name);
      if (!slug) continue;
      const tag = tags.get(slug) ?? { slug, name, posts: [] };
      tag.posts.push(post);
      tags.set(slug, tag);
    }
  }
  return [...tags.values()].sort(
    (a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name),
  );
}

export const postUrl = (post: BlogEntry) => `/blog/${post.id}`;
export const tagUrl = (name: string) => `/blog/tags/${tagSlug(name)}`;
export const ogImageUrl = (post: BlogEntry) => `/og/blog/${post.id}.png`;

/** 2026-11-12 */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** 12 Nov 2026 */
export const longDate = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** #007 */
export const postNumber = (post: BlogPost) =>
  post.number ? `#${String(post.number).padStart(3, '0')}` : 'Draft';
