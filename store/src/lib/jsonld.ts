import type { Product } from './types';
import { imageUrl, minPriceVariant, stripHtml } from './format';

export interface Crumb {
  name: string;
  href: string;
}

const SITE_NAME = 'Alquimia';

export function organizationJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/favicon.svg`,
  };
}

export function breadcrumbJsonLd(siteUrl: string, crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.href, siteUrl).href,
    })),
  };
}

export function productJsonLd(siteUrl: string, product: Product) {
  const variant = minPriceVariant(product);
  const images = product.images
    .map((img) => imageUrl(img))
    .filter((src): src is string => Boolean(src));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: stripHtml(product.body_html, 300) || product.title,
    image: images,
    sku: variant?.sku ?? undefined,
    brand: product.vendor
      ? { '@type': 'Brand', name: product.vendor }
      : undefined,
    offers: variant?.price
      ? {
          '@type': 'Offer',
          url: `${siteUrl}/product/${product.handle}`,
          priceCurrency: 'COP',
          price: Number(variant.price),
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
        }
      : undefined,
  };
}

export function itemListJsonLd(siteUrl: string, products: Product[], listUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: new URL(listUrl, siteUrl).href,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/product/${product.handle}`,
      name: product.title,
    })),
  };
}
