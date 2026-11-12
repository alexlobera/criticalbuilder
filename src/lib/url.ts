/**
 * The page's public path. With `build.format: 'file'`, Astro sees `/blog/post.html` and
 * `/index.html` at build time, but the site is served at `/blog/post` and `/`.
 */
export function cleanPath(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, '') || '/';
}
