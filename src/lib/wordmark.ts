// The pixel wordmark: CRITICAL over BUILDER, drawn on a 5×7 grid per letter.
// Used by the header (src/components/Wordmark.astro) and the social preview images (src/lib/og.ts).
// The favicon (public/favicon.svg) is a short "CB" version drawn by hand.

const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};

/** Pixel rows for a word, one empty column between letters. `mark` fills the pixels. */
function word(text: string, mark: string): string[] {
  return Array.from({ length: 7 }, (_, y) =>
    [...text].map((letter) => GLYPHS[letter][y].replaceAll('#', mark)).join('.'),
  );
}

const top = word('CRITICAL', 'i');
const bottom = word('BUILDER', 'a');
const width = Math.max(top[0].length, bottom[0].length);
const LINE_GAP = 2;

/** Rows of the wordmark: `i` = ink (text colour), `a` = accent (red), `.` = empty. */
export const WORDMARK: string[] = [
  ...top,
  ...Array.from({ length: LINE_GAP }, () => ''),
  ...bottom,
].map((row) => row.padEnd(width, '.'));

export const WORDMARK_WIDTH = width;
export const WORDMARK_HEIGHT = WORDMARK.length;

export interface Run {
  x: number;
  y: number;
  length: number;
  mark: 'i' | 'a';
}

/** Horizontal runs of same-coloured pixels, so each run can be drawn as one rectangle. */
export function wordmarkRuns(): Run[] {
  const runs: Run[] = [];
  WORDMARK.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const mark = row[x];
      let end = x;
      while (end < row.length && row[end] === mark) end++;
      if (mark === 'i' || mark === 'a') runs.push({ x, y, length: end - x, mark });
      x = end;
    }
  });
  return runs;
}
