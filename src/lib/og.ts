// Build-time social preview images (Open Graph / Twitter cards), 1200x630 PNG.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

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
    fontFile('newsreader', 'newsreader-latin-500-normal.woff'),
    fontFile('newsreader', 'newsreader-latin-400-italic.woff'),
    fontFile('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
  ]).then(([serif, serifItalic, mono]) => [
    { name: 'Newsreader', data: serif, weight: 500, style: 'normal' },
    { name: 'Newsreader', data: serifItalic, weight: 400, style: 'italic' },
    { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
  ]);
  return fonts;
}

const PAPER = '#f5f1e8';
const INK = '#1b1915';
const MUTED = '#6c665b';
const RULE = '#d6cebd';
const ACCENT = '#d2401c';

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

interface OgOptions {
  title: string;
  /** Italic line under the title. */
  subtitle?: string;
  /** Bottom-left meta line, e.g. "No. 003 · 12 Nov 2026". */
  meta: string;
  /** Bottom-right, usually the domain. */
  host: string;
}

export async function renderOgImage({ title, subtitle, meta, host }: OgOptions) {
  const titleSize = title.length > 70 ? 60 : title.length > 40 ? 72 : 88;

  const tree = el(
    'div',
    {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: PAPER,
      color: INK,
      padding: '72px 84px 64px',
      fontFamily: 'Newsreader',
      borderLeft: `16px solid ${ACCENT}`,
    },
    [
      el('div', { display: 'flex', alignItems: 'center', gap: '18px' }, [
        el('div', { width: '20px', height: '20px', backgroundColor: ACCENT }),
        el(
          'div',
          { fontFamily: 'JetBrains Mono', fontSize: '24px', letterSpacing: '4px', color: INK },
          'CRITICAL BUILDER',
        ),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px' }, [
        el(
          'div',
          {
            display: 'flex',
            fontSize: `${titleSize}px`,
            fontWeight: 500,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
          },
          title,
        ),
        ...(subtitle
          ? [
              el(
                'div',
                { display: 'flex', fontSize: '34px', fontStyle: 'italic', color: MUTED, lineHeight: 1.3 },
                subtitle,
              ),
            ]
          : []),
      ]),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `2px solid ${RULE}`,
          paddingTop: '26px',
          fontFamily: 'JetBrains Mono',
          fontSize: '22px',
          color: MUTED,
          letterSpacing: '1px',
        },
        [el('div', {}, meta), el('div', {}, host)],
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
