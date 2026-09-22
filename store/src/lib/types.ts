/** Shapes returned by the Alquimia REST API (api/ package). */

export interface ProductImage {
  id: string;
  product_id: string;
  shopify_image_id: number | null;
  original_src: string;
  r2_key: string | null;
  r2_url: string | null;
  alt: string | null;
  position: number | null;
  width: number | null;
  height: number | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  shopify_variant_id: number;
  title: string;
  sku: string | null;
  price: string | null;
  compare_at_price: string | null;
  grams: number | null;
  position: number | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image_id?: string | null;
  /** Hex color set in admin (e.g. "#ff5733"); null when the variant has no color. */
  color?: string | null;
}

export interface Product {
  id: string;
  source_domain: string;
  shopify_product_id: number;
  handle: string;
  title: string;
  body_html: string | null;
  product_type: string | null;
  vendor: string | null;
  status: string | null;
  public: boolean;
  provider_price: string | null;
  tags: string[] | string;
  created_at: string;
  updated_at: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface PriceRange {
  key: string;
  label: string;
  min: number | null;
  max: number | null;
  count: number;
}

export interface FilterMeta {
  vendors: string[];
  product_types: string[];
  source_domains: string[];
  statuses: string[];
  price: {
    min: number;
    max: number;
    ranges: PriceRange[];
  };
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  vendor?: string;
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
}

export interface ProductListResult {
  products: Product[];
  pagination: Pagination;
  totalPages: number;
}

export interface Category {
  /** Original product_type value from the API */
  name: string;
  /** URL-safe slug, e.g. "Body Lotion" -> "body-lotion" */
  slug: string;
  /** Representative image (first product of the category), if any */
  image: ProductImage | null;
}
