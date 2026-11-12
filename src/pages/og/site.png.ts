import type { APIRoute } from 'astro';
import { AUTHOR, SITE_DESCRIPTION } from '../../consts';
import { pngResponse, renderOgImage } from '../../lib/og';

export const GET: APIRoute = async ({ site }) =>
  pngResponse(
    await renderOgImage({
      // The wordmark already says "Critical Builder", so lead with what the blog is about.
      title: SITE_DESCRIPTION,
      meta: `By ${AUTHOR}`,
      host: site!.host,
    }),
  );
