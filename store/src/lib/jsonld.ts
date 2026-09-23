import type { Product } from './types';
import { imageUrl, minPriceVariant, stripHtml } from './format';
import {
  SITE_NAME,
  SITE_LEGAL_NAME,
  SITE_TAGLINE,
  SITE_LOCALE,
  SITE_CURRENCY,
  GEO_REGION,
  GEO_PLACENAME,
  SOCIAL_URLS,
  WHATSAPP_NUMBER,
} from './site';

export interface Crumb {
  name: string;
  href: string;
}

export function organizationJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    '@id': `${siteUrl}/#organization`,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    description: SITE_TAGLINE,
    url: siteUrl,
    logo: `${siteUrl}/favicon-32.png`,
    currenciesAccepted: SITE_CURRENCY,
    areaServed: { '@type': 'Country', name: GEO_PLACENAME },
    address: { '@type': 'PostalAddress', addressCountry: GEO_REGION },
    ...(WHATSAPP_NUMBER
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            telephone: `+${WHATSAPP_NUMBER}`,
            availableLanguage: 'Spanish',
          },
        }
      : {}),
    ...(SOCIAL_URLS.length ? { sameAs: SOCIAL_URLS } : {}),
  };
}

/** WebSite schema with a SearchAction so Google can surface a sitelinks search box. */
export function websiteJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: SITE_NAME,
    url: siteUrl,
    inLanguage: SITE_LOCALE,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/shop?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
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
    url: `${siteUrl}/product/${product.handle}`,
    image: images,
    sku: variant?.sku ?? undefined,
    category: product.product_type ?? undefined,
    brand: product.vendor
      ? { '@type': 'Brand', name: product.vendor }
      : undefined,
    offers: variant?.price
      ? {
          '@type': 'Offer',
          url: `${siteUrl}/product/${product.handle}`,
          priceCurrency: SITE_CURRENCY,
          price: Number(variant.price),
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@id': `${siteUrl}/#organization` },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: GEO_REGION,
            },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
              transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
            },
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: GEO_REGION,
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 1,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/ReturnShippingFees',
          },
        }
      : undefined,
  };
}

/** CollectionPage wrapper for product listing pages (shop, categories). */
export function collectionPageJsonLd(
  siteUrl: string,
  page: { name: string; path: string; description?: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    url: new URL(page.path, siteUrl).href,
    inLanguage: SITE_LOCALE,
    isPartOf: { '@id': `${siteUrl}/#website` },
    ...(page.description ? { description: page.description } : {}),
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
