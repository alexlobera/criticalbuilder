import type { APIRoute } from 'astro';
import { AUTHOR, SITE_DESCRIPTION, SITE_TITLE } from '../../consts';
import { pngResponse, renderOgImage } from '../../lib/og';

export const GET: APIRoute = async ({ site }) =>
  pngResponse(
    await renderOgImage({
      title: SITE_TITLE,
      subtitle: SITE_DESCRIPTION,
      meta: `By ${AUTHOR}`,
      host: site!.host,
    }),
  );
