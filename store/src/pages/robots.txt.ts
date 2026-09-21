import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site, url }) => {
  const base = (site ?? new URL(url.origin)).href.replace(/\/$/, '');
  const body = `User-agent: *
Allow: /
Disallow: /cart

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  });
};
