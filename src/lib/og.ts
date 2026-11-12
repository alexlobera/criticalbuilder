// Build-time social preview images (Open Graph / Twitter cards), 1200x630 PNG.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { WORDMARK_HEIGHT, WORDMARK_WIDTH, wordmarkRuns } from './wordmark';

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
interface FontSpec {
  name: string;
  data: Buffer;
  weight: FontWeight;
  style: 'normal' | 'italic';
}

// Satori needs TTF/OTF/WOFF (not WOFF2), so read the static Fontsource files.
const fontFile = (pkg: string, file: string) =>
  readFile(join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file));

let fonts: Promise<FontSpec[]> | undefined;
function loadFonts(): Promise<FontSpec[]> {
  fonts ??= Promise.all([
    fontFile('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
    fontFile('jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff'),
  ]).then(([regular, bold]) => [
    { name: 'JetBrains Mono', data: regular, weight: 400, style: 'normal' },
    { name: 'JetBrains Mono', data: bold, weight: 700, style: 'normal' },
  ]);
  return fonts;
}

// Light-mode colours from src/styles/global.css.
const BG = '#fafafa';
const STRONG = '#121212';
const TEXT = '#22272a';
const MUTED = '#4a5565';
const ACCENT = '#cb2a42';

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/** The pixel wordmark, `px` pixels per dot. */
const wordmark = (px: number) =>
  el(
    'div',
    {
      display: 'flex',
      position: 'relative',
      width: `${WORDMARK_WIDTH * px}px`,
      height: `${WORDMARK_HEIGHT * px}px`,
    },
    wordmarkRuns().map(({ x, y, length, mark }) =>
      el('div', {
        position: 'absolute',
        left: `${x * px}px`,
        top: `${y * px}px`,
        width: `${length * px}px`,
        height: `${px}px`,
        backgroundColor: mark === 'a' ? ACCENT : STRONG,
      }),
    ),
  );

interface OgOptions {
  title: string;
  /** Line under the title. */
  subtitle?: string;
  /** Bottom-left meta line, e.g. "#003 · 12 Nov 2026". */
  meta: string;
  /** Bottom-right, usually the domain. */
  host: string;
}

export async function renderOgImage({ title, subtitle, meta, host }: OgOptions) {
  const titleSize = title.length > 60 ? 52 : title.length > 32 ? 62 : 76;

  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: BG,
      color: TEXT,
      padding: '64px 72px 56px',
      fontFamily: 'JetBrains Mono',
    },
    [
      wordmark(5),
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          maxWidth: '1000px',
        },
        [
          el(
            'div',
            {
              display: 'flex',
              fontSize: `${titleSize}px`,
              fontWeight: 700,
              lineHeight: 1.18,
              color: STRONG,
            },
            title,
          ),
          ...(subtitle
            ? [el('div', { display: 'flex', fontSize: '30px', color: MUTED, lineHeight: 1.45 }, subtitle)]
            : []),
        ],
      ),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `2px dashed ${MUTED}`,
          paddingTop: '24px',
          fontSize: '24px',
        },
        [el('div', { color: ACCENT, fontWeight: 700 }, meta), el('div', { color: MUTED }, host)],
      ),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Uint8Array(png);
}

export const pngResponse = (png: Uint8Array<ArrayBuffer>) =>
  new Response(png, { headers: { 'Content-Type': 'image/png' } });
