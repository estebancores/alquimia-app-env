import { useStore } from '@nanostores/preact';
import {
  cartItems,
  cartTotal,
  clearCart,
  removeFromCart,
  setQty,
  whatsappOrderUrl,
} from '../stores/cart';
import { formatPrice } from '../lib/format';

interface Props {
  whatsappNumber: string;
}

/** Full cart page: line items, quantity controls, WhatsApp order CTA. */
export default function CartContents({ whatsappNumber }: Props) {
  const items = useStore(cartItems);
  const total = useStore(cartTotal);

  if (!items.length) {
    return (
      <div class="py-24 text-center">
        <p class="text-taupe">Tu carrito está vacío.</p>
        <a
          href="/shop"
          class="mt-6 inline-block border border-ink px-8 py-3 text-sm tracking-widest uppercase transition-colors hover:bg-ink hover:text-cream"
        >
          Explorar la tienda
        </a>
      </div>
    );
  }

  return (
    <div class="grid gap-12 lg:grid-cols-[1fr_320px]">
      <ul class="divide-y divide-sand">
        {items.map((item) => (
          <li key={item.variantId} class="flex gap-5 py-6">
            <a href={`/product/${item.slug}`} class="block h-28 w-24 shrink-0 overflow-hidden bg-bone">
              {item.image && (
                <img src={item.image} alt={item.title} width="96" height="112" loading="lazy" class="h-full w-full object-cover" />
              )}
            </a>
            <div class="flex flex-1 flex-col justify-between">
              <div>
                <a href={`/product/${item.slug}`} class="text-sm hover:underline">{item.title}</a>
                {item.variantTitle !== 'Default Title' && (
                  <p class="mt-1 text-xs text-taupe">{item.variantTitle}</p>
                )}
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center border border-sand">
                  <button
                    type="button"
                    onClick={() => setQty(item.variantId, item.qty - 1)}
                    aria-label="Reducir cantidad"
                    class="px-3 py-1 hover:bg-bone"
                  >
                    −
                  </button>
                  <span class="min-w-8 text-center text-sm" aria-live="polite">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.variantId, item.qty + 1)}
                    aria-label="Aumentar cantidad"
                    class="px-3 py-1 hover:bg-bone"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.variantId)}
                  class="text-xs text-stone underline hover:text-ink"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <p class="text-sm">{formatPrice(item.price * item.qty)}</p>
          </li>
        ))}
      </ul>

      <aside class="h-fit border border-sand bg-bone p-6">
        <h2 class="font-serif text-xl">Resumen</h2>
        <dl class="mt-4 flex justify-between text-sm">
          <dt class="text-taupe">Total</dt>
          <dd class="font-medium">{formatPrice(total)}</dd>
        </dl>
        <p class="mt-2 text-xs text-stone">Envío y confirmación por WhatsApp.</p>
        <a
          href={whatsappOrderUrl(whatsappNumber)}
          target="_blank"
          rel="noopener"
          class="mt-6 block bg-ink px-6 py-4 text-center text-sm tracking-widest text-cream uppercase transition-opacity hover:opacity-90"
        >
          Pedir por WhatsApp
        </a>
        <button
          type="button"
          onClick={clearCart}
          class="mt-3 w-full text-center text-xs text-stone underline hover:text-ink"
        >
          Vaciar carrito
        </button>
      </aside>
    </div>
  );
}
