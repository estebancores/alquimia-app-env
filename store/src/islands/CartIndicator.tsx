import { useStore } from '@nanostores/preact';
import { cartCount } from '../stores/cart';

/** Header cart link with live item count (persisted across pages). */
export default function CartIndicator() {
  const count = useStore(cartCount);

  return (
    <a
      href="/cart"
      class="relative flex items-center gap-1 text-sm tracking-wide text-taupe transition-colors hover:text-ink"
      aria-label={`Carrito, ${count} artículos`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 && (
        <span class="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] text-cream">
          {count}
        </span>
      )}
    </a>
  );
}
