import type { APIRoute } from 'astro';
import { getAllProductsForSitemap, getFilterMeta } from '../lib/api';
import { slugify } from '../lib/format';

const PAGE_SIZE = 24;

/**
 * Dynamic sitemap. @astrojs/sitemap only covers prerendered routes, but this
 * store is fully SSR (catalog changes with every scraper run), so the sitemap
 * is generated on demand from the API: home, category pages (including
 * paginated pages), and every public product.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL(url.origin)).href.replace(/\/$/, '');

  const [meta, products] = await Promise.all([getFilterMeta(), getAllProductsForSitemap()]);

  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: `${base}/`, priority: '1.0' },
    { loc: `${base}/shop`, priority: '0.9' },
    { loc: `${base}/terminos`, priority: '0.3' },
  ];

  const countByType = new Map<string, number>();
  for (const product of products) {
    if (product.product_type) {
      countByType.set(product.product_type, (countByType.get(product.product_type) ?? 0) + 1);
    }
  }

  for (const type of meta.product_types.filter(Boolean)) {
    const slug = slugify(type);
    const total = countByType.get(type) ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    urls.push({ loc: `${base}/${slug}`, priority: '0.8' });
    for (let p = 2; p <= pages; p++) {
      urls.push({ loc: `${base}/${slug}?page=${p}`, priority: '0.5' });
    }
  }

  const shopPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  for (let p = 2; p <= shopPages; p++) {
    urls.push({ loc: `${base}/shop?page=${p}`, priority: '0.5' });
  }

  for (const product of products) {
    urls.push({
      loc: `${base}/product/${product.handle}`,
      lastmod: new Date(product.updated_at).toISOString(),
      priority: '0.7',
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc.replace(/&/g, '&amp;')}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
