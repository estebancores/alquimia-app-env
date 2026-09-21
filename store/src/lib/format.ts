import type { Product, ProductImage, ProductVariant } from './types';

/** URL-safe slug from an arbitrary label ("Body Lotion" -> "body-lotion"). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatPrice(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? cop.format(n) : '';
}

/**
 * Preferred display image URL: R2 copy first, original Shopify src as fallback.
 * URLs on the raw R2 storage endpoint (*.r2.cloudflarestorage.com) require
 * signed requests and are not publicly readable, so they are skipped — only a
 * public R2 domain (pub-*.r2.dev or a custom domain) is used directly.
 */
export function imageUrl(image: ProductImage | null | undefined): string | null {
  if (!image) return null;
  if (image.r2_url && !image.r2_url.includes('.r2.cloudflarestorage.com')) return image.r2_url;
  return image.original_src ?? null;
}

/** Cheapest variant with a price, used for card/list price display. */
export function minPriceVariant(product: Product): ProductVariant | null {
  const priced = product.variants.filter((v) => v.price != null);
  if (!priced.length) return null;
  return priced.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min));
}

/** Strip HTML tags for meta descriptions. */
export function stripHtml(html: string | null | undefined, maxLength = 160): string {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
