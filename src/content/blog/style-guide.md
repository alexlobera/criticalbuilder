---
title: Style guide
description: Every Markdown element this blog supports, so you can see how posts render. Drafts only show up in development.
pubDate: 2026-11-12
tags: [meta]
draft: true
---

This post is a **draft**, so it only appears when you run `npm run dev`. Keep it as a reference or delete it. Everything is set in JetBrains Mono, and [links look like this](https://astro.build).

It has no `cover`, so the home page shows a generated cover with its number and title. To use an image instead, put it next to the post and add `cover: ./style-guide/cover.jpg` and `coverAlt: A short description` to the frontmatter.

## Section heading

Headings are prefixed with Markdown-style `##` markers in the accent colour.

### A smaller heading

Use these sparingly for sub-points inside a section.

#### Label heading

For small, structural labels.

## Lists

- An unordered item
- Another item, with `inline code`
- A third, with a nested list:
  - Nested item
  - Another nested item

1. First step
2. Second step
3. Third step

## Quotes

> Simplicity is prerequisite for reliability.
>
> Edsger W. Dijkstra

## Code

```ts
export function readingTime(body: string, wordsPerMinute = 230): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
```

```bash
npm run dev
```

## Tables

| Option   | Cost   | Notes                     |
| -------- | ------ | ------------------------- |
| Build    | Weeks  | Full control              |
| Buy      | Months | Contracts and integration |
| Postpone | Free   | Until it isn't            |

## Footnotes and rules

Footnotes are supported too.[^1]

---

That's everything.

[^1]: They collect at the end of the post.
