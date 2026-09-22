import type { APIRoute } from 'astro';
import { getFilterMeta } from '../lib/api';
import { slugify, formatPrice, minPriceVariant, stripHtml } from '../lib/format';
import type { Product } from '../lib/types';
import { SITE_NAME, SITE_TAGLINE, SITE_CURRENCY, GEO_PLACENAME, WHATSAPP_URL } from '../lib/site';

/**
 * llms.txt — the emerging convention for AI crawlers/assistants
 * (https://llmstxt.org). A concise Markdown map of the store; the full product
 * catalog lives in /llms-full.txt.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? new URL(url.origin)).href.replace(/\/$/, '');

  let categories: string[] = [];
  try {
    const meta = await getFilterMeta();
    categories = meta.product_types.filter(Boolean);
  } catch {
    // API down — emit the static map only.
  }

  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_TAGLINE} Tienda online en ${GEO_PLACENAME}; pedidos y envíos coordinados por WhatsApp. Precios en ${SITE_CURRENCY}.`,
    '',
    '## Páginas',
    '',
    `- [Inicio](${base}/): portada con categorías y novedades`,
    `- [Tienda](${base}/shop): catálogo completo con filtros y búsqueda (?search=)`,
    `- [Términos y políticas](${base}/terminos): envíos, devoluciones y datos personales`,
    '',
    '## Categorías',
    '',
    ...categories.map((t) => `- [${t}](${base}/${slugify(t)})`),
    '',
    '## Recursos',
    '',
    `- [Catálogo completo para LLMs](${base}/llms-full.txt): todos los productos con precios`,
    `- [Sitemap](${base}/sitemap.xml)`,
    ...(WHATSAPP_URL ? [`- [WhatsApp](${WHATSAPP_URL}): pedidos y atención al cliente`] : []),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};

/** Kept as a separate export so llms-full.txt.ts can share the formatter. */
export function formatProductLine(base: string, product: Product) {
  const variant = minPriceVariant(product);
  const price = variant?.price ? ` — ${formatPrice(variant.price)}` : '';
  const desc = stripHtml(product.body_html, 120);
  return `- [${product.title}](${base}/product/${product.handle})${price}${desc ? `: ${desc}` : ''}`;
}
