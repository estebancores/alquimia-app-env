import { getFilterMeta, getProducts } from './api';
import { minPriceVariant } from './format';
import type { FilterMeta, Product, ProductListResult } from './types';

export interface ListingState {
  page: number;
  vendor?: string;
  priceKey?: string;
  sort: 'newest' | 'price_asc' | 'price_desc';
  search?: string;
}

export interface ListingData {
  state: ListingState;
  meta: FilterMeta;
  result: ProductListResult;
  /** Query params (minus page) to preserve in pagination links */
  paginationParams: URLSearchParams;
}

export function parseListingState(url: URL): ListingState {
  const sort = url.searchParams.get('sort');
  return {
    page: Math.max(1, Number(url.searchParams.get('page')) || 1),
    vendor: url.searchParams.get('vendor') ?? undefined,
    priceKey: url.searchParams.get('price') ?? undefined,
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest',
    search: url.searchParams.get('search')?.trim() || undefined,
  };
}

/** Products loaded per "Cargar más" step. */
export const LISTING_PAGE_SIZE = 24;

/**
 * Fetch a listing. `?page=N` is cumulative ("load more" pattern): the page
 * renders products from pages 1..N. Each underlying page request is cached,
 * so clicking deeper only fetches the newest page. The API orders by
 * created_at desc and has no sort param, so price sorting is applied to the
 * loaded products server-side (until the API grows a `sort` query param).
 */
export async function loadListing(
  url: URL,
  productType?: string,
  options: { onSale?: boolean } = {},
): Promise<ListingData> {
  const state = parseListingState(url);
  const meta = await getFilterMeta();

  const range = state.priceKey
    ? meta.price.ranges.find((r) => r.key === state.priceKey)
    : undefined;

  const pageResults = await Promise.all(
    Array.from({ length: state.page }, (_, i) =>
      getProducts({
        page: i + 1,
        limit: LISTING_PAGE_SIZE,
        search: state.search,
        vendor: state.vendor,
        productType,
        minPrice: range?.min ?? undefined,
        maxPrice: range?.max ?? undefined,
        onSale: options.onSale,
      }),
    ),
  );

  // state.page >= 1 (parseListingState), so pageResults is never empty.
  const result: ProductListResult = {
    products: pageResults.flatMap((r) => r.products),
    pagination: pageResults[0]!.pagination,
    totalPages: pageResults[0]!.totalPages,
  };

  if (state.sort !== 'newest') {
    const dir = state.sort === 'price_asc' ? 1 : -1;
    result.products = [...result.products].sort((a: Product, b: Product) => {
      const pa = Number(minPriceVariant(a)?.price ?? Infinity);
      const pb = Number(minPriceVariant(b)?.price ?? Infinity);
      return (pa - pb) * dir;
    });
  }

  const paginationParams = new URLSearchParams();
  if (state.search) paginationParams.set('search', state.search);
  if (state.vendor) paginationParams.set('vendor', state.vendor);
  if (state.priceKey) paginationParams.set('price', state.priceKey);
  if (state.sort !== 'newest') paginationParams.set('sort', state.sort);

  return { state, meta, result, paginationParams };
}

/** Canonical URL for a listing page: path + page only (filters get canonicalized away). */
export function listingCanonical(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}
