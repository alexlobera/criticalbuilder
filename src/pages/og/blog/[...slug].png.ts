import type { APIRoute, GetStaticPaths } from 'astro';
import { pngResponse, renderOgImage } from '../../../lib/og';
import { getPosts, longDate, postNumber, type BlogPost } from '../../../lib/posts';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: BlogPost }> = async ({ props, site }) => {
  const { post } = props;
  return pngResponse(
    await renderOgImage({
      title: post.data.title,
      meta: `${postNumber(post)}  ·  ${longDate(post.data.pubDate)}`.toUpperCase(),
      host: site!.host,
    }),
  );
};
