import { useMemo, useState } from 'preact/hooks';
import type { FilterMeta } from '../lib/types';

interface Props {
  meta: FilterMeta;
  /** Current query params serialized by the server */
  current: {
    vendor?: string;
    priceKey?: string;
    sort?: string;
    search?: string;
  };
  /** Hide the product-type filter on category pages (already implied by URL) */
  showProductType?: boolean;
  productTypes?: { name: string; slug: string }[];
  currentTypeSlug?: string;
}

/**
 * Filter/sort bar. State lives in the URL (query params), so every filter
 * combination is a crawlable, shareable page rendered on the server.
 * The island only builds URLs and navigates — no client-side data fetching.
 */
export default function FilterBar({
  meta,
  current,
  showProductType = true,
  productTypes = [],
  currentTypeSlug,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const apply = (patch: Record<string, string | null>, basePath?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete('page'); // filters reset pagination
    const entries = Object.entries(patch);
    for (const [key, value] of entries) {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const [filterKey, filterValue] = entries[0] ?? ['category', null];
    const filterType = entries.length > 1 ? 'multiple' : filterKey;
    window.posthog?.capture('product_filter_applied', {
      filter_type: filterType,
      is_clearing: basePath === '/shop' || (entries.length > 0 && entries.every(([, value]) => !value)),
      ...(filterType === 'sort' ? { sort_option: filterValue } : {}),
    });
    const qs = params.toString();
    window.location.assign(`${basePath ?? window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  const activeCount = useMemo(
    () => [current.vendor, current.priceKey].filter(Boolean).length,
    [current],
  );

  const pill = (key: string, label: string, active: boolean) => (
    <button
      type="button"
      onClick={() => setOpen(open === key ? null : key)}
      aria-expanded={open === key}
      class={`border px-4 py-2 text-xs tracking-widest uppercase transition-colors ${
        active ? 'border-ink bg-ink text-cream' : 'border-sand hover:border-ink'
      }`}
    >
      {label} {open === key ? '−' : '+'}
    </button>
  );

  return (
    <div class="relative">
      <div class="flex flex-wrap items-center gap-2">
        {showProductType && productTypes.length > 0 && pill('type', 'Categoría', Boolean(currentTypeSlug))}
        {pill('vendor', 'Marca', Boolean(current.vendor))}
        {pill('price', 'Precio', Boolean(current.priceKey))}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => apply({ vendor: null, price: null })}
            class="px-3 py-2 text-xs tracking-wide text-taupe underline hover:text-ink"
          >
            Limpiar ({activeCount})
          </button>
        )}

        <div class="ml-auto">
          <label class="flex items-center gap-2 text-xs tracking-widest text-taupe uppercase">
            Ordenar
            <select
              value={current.sort ?? 'newest'}
              onChange={(e) => apply({ sort: (e.target as HTMLSelectElement).value })}
              class="border border-sand bg-cream px-2 py-2 text-xs"
            >
              <option value="newest">Novedades</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
          </label>
        </div>
      </div>

      {open === 'type' && (
        <Dropdown onClose={() => setOpen(null)}>
          {productTypes.map((t) => (
            <DropdownItem
              key={t.slug}
              active={t.slug === currentTypeSlug}
              onSelect={() => apply({}, t.slug === currentTypeSlug ? '/shop' : `/${t.slug}`)}
            >
              {t.name}
            </DropdownItem>
          ))}
        </Dropdown>
      )}

      {open === 'vendor' && (
        <Dropdown onClose={() => setOpen(null)}>
          {meta.vendors.filter(Boolean).map((vendor) => (
            <DropdownItem
              key={vendor}
              active={vendor === current.vendor}
              onSelect={() => apply({ vendor: vendor === current.vendor ? null : vendor })}
            >
              {vendor}
            </DropdownItem>
          ))}
        </Dropdown>
      )}

      {open === 'price' && (
        <Dropdown onClose={() => setOpen(null)}>
          {meta.price.ranges
            .filter((r) => r.count > 0)
            .map((range) => (
              <DropdownItem
                key={range.key}
                active={range.key === current.priceKey}
                onSelect={() => apply({ price: range.key === current.priceKey ? null : range.key })}
              >
                {range.label} <span class="text-stone">({range.count})</span>
              </DropdownItem>
            ))}
        </Dropdown>
      )}
    </div>
  );
}

function Dropdown({ children, onClose }: { children: preact.ComponentChildren; onClose: () => void }) {
  return (
    <>
      <div class="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />
      <div class="absolute top-full left-0 z-30 mt-2 max-h-72 w-72 overflow-y-auto border border-sand bg-cream p-2 shadow-sm">
        {children}
      </div>
    </>
  );
}

function DropdownItem({
  children,
  active,
  onSelect,
}: {
  children: preact.ComponentChildren;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      class={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-bone ${
        active ? 'bg-bone font-medium' : ''
      }`}
    >
      {children}
    </button>
  );
}
