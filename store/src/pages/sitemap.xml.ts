import type { APIRoute } from 'astro';
import { getAllProductsForSitemap, getFilterMeta } from '../lib/api';
import { slugify, imageUrl } from '../lib/format';

const PAGE_SIZE = 24;
const MAX_IMAGES_PER_URL = 5;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
  images?: { loc: string; title: string }[];
}

/**
 * Dynamic sitemap. @astrojs/sitemap only covers prerendered routes, but this
 * store is fully SSR (catalog changes with every scraper run), so the sitemap
 * is generated on demand from the API: home, category pages (including
 * paginated pages), and every public product — with image extensions so
 * Google Images picks up the catalog.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL(url.origin)).href.replace(/\/$/, '');

  const [meta, products] = await Promise.all([getFilterMeta(), getAllProductsForSitemap()]);

  const urls: SitemapUrl[] = [
    { loc: `${base}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/shop`, changefreq: 'daily', priority: '0.9' },
    { loc: `${base}/sale`, changefreq: 'daily', priority: '0.8' },
    { loc: `${base}/terminos`, changefreq: 'monthly', priority: '0.3' },
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
    urls.push({ loc: `${base}/${slug}`, changefreq: 'daily', priority: '0.8' });
    for (let p = 2; p <= pages; p++) {
      urls.push({ loc: `${base}/${slug}?page=${p}`, changefreq: 'daily', priority: '0.5' });
    }
  }

  const shopPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  for (let p = 2; p <= shopPages; p++) {
    urls.push({ loc: `${base}/shop?page=${p}`, changefreq: 'daily', priority: '0.5' });
  }

  for (const product of products) {
    urls.push({
      loc: `${base}/product/${product.handle}`,
      lastmod: new Date(product.updated_at).toISOString(),
      changefreq: 'weekly',
      priority: '0.7',
      images: product.images
        .map((img) => imageUrl(img))
        .filter((src): src is string => Boolean(src))
        .slice(0, MAX_IMAGES_PER_URL)
        .map((loc) => ({ loc, title: product.title })),
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map((u) => {
    const images = (u.images ?? [])
      .map(
        (img) =>
          `    <image:image><image:loc>${escapeXml(img.loc)}</image:loc><image:title>${escapeXml(img.title)}</image:title></image:image>`,
      )
      .join('\n');
    return `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority>\n${images}\n  </url>`;
  })
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
