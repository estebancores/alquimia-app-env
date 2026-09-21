import type {
  Category,
  FilterMeta,
  Product,
  ProductListParams,
  ProductListResult,
} from './types';
import { slugify } from './format';

const API_BASE = import.meta.env.API_BASE_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Tiny in-memory TTL cache. Railway has no ISR, so SSR + short-lived server
 * cache is our equivalent: repeated requests within the TTL never hit the API.
 */
const cache = new Map<string, { expires: number; data: unknown }>();

async function fetchJson<T>(path: string, ttlMs = 60_000): Promise<T> {
  const url = `${API_BASE}${path}`;
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.data as T;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error && err.name === 'AbortError'
        ? 'API request timed out'
        : `API unreachable: ${(err as Error).message}`,
      0,
      url,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new ApiError(`API responded ${res.status}`, res.status, url);
  }
  const body = (await res.json()) as { success: boolean; data: T; pagination?: unknown };
  if (!body.success) throw new ApiError('API returned success: false', res.status, url);

  cache.set(url, { expires: Date.now() + ttlMs, data: body });
  return body as unknown as T;
}

interface RawListResponse {
  data: Product[];
  pagination: { page: number; limit: number; total: number };
}

/** Paginated, filtered product listing. Only public + active products. */
export async function getProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  // `public` is the storefront visibility flag (scraped products keep
  // Shopify's own status, often 'draft', so we don't filter on status).
  const qs = new URLSearchParams({ public: 'true' });
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 24));
  if (params.search) qs.set('search', params.search);
  if (params.vendor) qs.set('vendor', params.vendor);
  if (params.productType) qs.set('product_type', params.productType);
  if (params.minPrice != null) qs.set('min_price', String(params.minPrice));
  if (params.maxPrice != null) qs.set('max_price', String(params.maxPrice));

  const raw = await fetchJson<RawListResponse>(`/products?${qs.toString()}`);
  const { data: products, pagination } = raw;
  return {
    products,
    pagination,
    totalPages: Math.max(1, Math.ceil(pagination.total / pagination.limit)),
  };
}

/** Filter metadata (vendors, product types, price ranges). Cached longer. */
export async function getFilterMeta(): Promise<FilterMeta> {
  const raw = await fetchJson<{ data: FilterMeta }>('/products/meta', 5 * 60_000);
  return raw.data;
}

/** Single product by UUID. */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const raw = await fetchJson<{ data: Product }>(`/products/${id}`, 2 * 60_000);
    return raw.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Product lookup by handle (slug). The API has no /products/by-handle route,
 * but `search` matches the handle column, so we search and pick the exact match.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const qs = new URLSearchParams({
    public: 'true',
    search: slug,
    limit: '10',
  });
  const raw = await fetchJson<RawListResponse>(`/products?${qs.toString()}`, 2 * 60_000);
  return raw.data.find((p) => p.handle === slug) ?? raw.data[0] ?? null;
}

/** Latest products for the "New Arrivals" section (API sorts by created_at desc). */
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const { products } = await getProducts({ page: 1, limit });
  return products;
}

/**
 * Categories are derived from distinct `product_type` values. Each gets a
 * representative image from its first product. Results are cached (5 min).
 */
export async function getCategories(max = 8): Promise<Category[]> {
  const meta = await getFilterMeta();
  const types = meta.product_types.filter(Boolean).slice(0, max);

  return Promise.all(
    types.map(async (name): Promise<Category> => {
      let image = null;
      try {
        const { products } = await getProducts({ productType: name, limit: 1 });
        image = products[0]?.images[0] ?? null;
      } catch {
        // A missing category thumbnail must not break the page.
      }
      return { name, slug: slugify(name), image };
    }),
  );
}

/** Resolve a URL slug (e.g. "body-lotion") back to the original product_type. */
export async function resolveCategorySlug(slug: string): Promise<string | null> {
  const meta = await getFilterMeta();
  return meta.product_types.find((t) => slugify(t) === slug) ?? null;
}

/** Related products: same product_type, excluding the current product. */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!product.product_type) return [];
  const { products } = await getProducts({ productType: product.product_type, limit: limit + 1 });
  return products.filter((p) => p.id !== product.id).slice(0, limit);
}

/** Fetch every public product (paged) — used only by the sitemap endpoint. */
export async function getAllProductsForSitemap(): Promise<Product[]> {
  const all: Product[] = [];
  let page = 1;
  for (;;) {
    const { products, totalPages } = await getProducts({ page, limit: 100 });
    all.push(...products);
    if (page >= totalPages || products.length === 0) break;
    page += 1;
  }
  return all;
}
