import type { APIRoute } from 'astro';
import { getFilterMeta, getAllProductsForSitemap } from '../lib/api';
import { slugify } from '../lib/format';
import { SITE_NAME, SITE_TAGLINE, SITE_CURRENCY, GEO_PLACENAME, WHATSAPP_URL } from '../lib/site';
import { formatProductLine } from './llms.txt';

/**
 * llms-full.txt — the complete catalog for AI assistants: every public product
 * with price and description, grouped by category.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL(url.origin)).href.replace(/\/$/, '');

  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_TAGLINE} Tienda online en ${GEO_PLACENAME}; pedidos por WhatsApp. Precios en ${SITE_CURRENCY}.`,
    '',
  ];

  try {
    const [meta, products] = await Promise.all([getFilterMeta(), getAllProductsForSitemap()]);

    lines.push('## Categorías', '');
    for (const type of meta.product_types.filter(Boolean)) {
      lines.push(`- [${type}](${base}/${slugify(type)})`);
    }

    const byType = new Map<string, typeof products>();
    for (const product of products) {
      const type = product.product_type || 'Otros';
      const list = byType.get(type) ?? [];
      list.push(product);
      byType.set(type, list);
    }

    lines.push('', '## Productos', '');
    for (const [type, items] of byType) {
      lines.push(`### ${type}`, '');
      for (const product of items) {
        lines.push(formatProductLine(base, product));
      }
      lines.push('');
    }
  } catch {
    lines.push('_El catálogo no está disponible en este momento._', '');
  }

  if (WHATSAPP_URL) {
    lines.push('## Contacto', '', `- [WhatsApp](${WHATSAPP_URL}): pedidos y atención al cliente`, '');
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
