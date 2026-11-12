---
title: Style guide
description: Every Markdown element this blog supports, so you can see how posts render. Drafts only show up in development.
pubDate: 2026-11-12
tags: [meta]
draft: true
---

This post is a **draft**, so it only appears when you run `npm run dev`. Keep it as a reference or delete it. Body text is set in Newsreader with metadata in JetBrains Mono, and [links look like this](https://astro.build).

## Section heading

Second-level headings get a section mark that hangs in the left margin on wide screens. Paragraphs are kept to a comfortable measure of roughly sixty-five characters per line.

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
