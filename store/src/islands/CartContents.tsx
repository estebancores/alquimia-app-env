import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  cartItems,
  cartTotal,
  clearCart,
  FREE_SHIPPING_THRESHOLD,
  removeFromCart,
  setQty,
  whatsappOrderUrl,
} from '../stores/cart';
import { formatPrice } from '../lib/format';

interface Props {
  whatsappNumber: string;
}

/** Progress toward the free-shipping threshold, with a celebration state. */
function FreeShippingMeter({ total }: { total: number }) {
  const achieved = total >= FREE_SHIPPING_THRESHOLD;
  const pct = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div class="mb-10 border border-sand bg-bone p-5" role="status">
      <div class="flex items-center gap-3">
        <span
          class={`relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            achieved ? 'bg-emerald-700 text-cream' : 'bg-sand text-taupe'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true">
            <path d="M3 7h11v9H3z" />
            <path d="M14 10h4l3 3v3h-7" />
            <circle cx="7" cy="17.5" r="1.5" />
            <circle cx="17" cy="17.5" r="1.5" />
          </svg>
          {achieved && (
            <span class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-ink text-cream animate-[pop_0.45s_ease-out]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="size-2.5" aria-hidden="true">
                <path d="M4 12l5 5L20 6" />
              </svg>
            </span>
          )}
        </span>
        <p class="text-sm">
          {achieved ? (
            <span class="font-medium text-emerald-700">¡Genial! Tu pedido tiene envío gratis.</span>
          ) : (
            <>
              Te faltan <strong class="font-medium">{formatPrice(FREE_SHIPPING_THRESHOLD - total)}</strong> para envío gratis.
            </>
          )}
        </p>
      </div>
      <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sand">
        <div
          class={`h-full rounded-full transition-[width] duration-500 ease-out ${achieved ? 'bg-emerald-600' : 'bg-ink'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Full cart page: line items, quantity controls, WhatsApp order CTA. */
export default function CartContents({ whatsappNumber }: Props) {
  const items = useStore(cartItems);
  const total = useStore(cartTotal);
  const [submitting, setSubmitting] = useState(false);

  const confirmPurchase = async () => {
    if (submitting) return;
    setSubmitting(true);
    window.posthog?.capture('checkout_started', {
      item_count: items.reduce((count, item) => count + item.qty, 0),
      unique_product_count: items.length,
      value: total,
      currency: 'COP',
    });
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const distinctId = window.posthog?.get_distinct_id();
    const sessionId = window.posthog?.get_session_id();
    if (distinctId) headers['X-POSTHOG-DISTINCT-ID'] = distinctId;
    if (sessionId) headers['X-POSTHOG-SESSION-ID'] = sessionId;
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.productId,
            variant_id: i.variantId,
            name:
              i.variantTitle && i.variantTitle !== 'Default Title'
                ? `${i.title} (${i.variantTitle})`
                : i.title,
            quantity: i.qty,
            price: i.price,
          })),
          total_amount: total,
        }),
      });
      if (!response.ok) throw new Error('Order API request failed');
    } catch (error) {
      window.posthog?.captureException(error);
      // Order logging is best-effort — never block the WhatsApp checkout.
    } finally {
      setSubmitting(false);
      window.open(whatsappOrderUrl(whatsappNumber), '_blank', 'noopener');
    }
  };

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
    <>
      <FreeShippingMeter total={total} />
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
                  onClick={() => {
                    window.posthog?.capture('cart_item_removed', {
                      product_id: item.productId,
                      variant_id: item.variantId,
                      quantity: item.qty,
                      value: item.price * item.qty,
                      currency: 'COP',
                    });
                    removeFromCart(item.variantId);
                  }}
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
        <button
          type="button"
          onClick={confirmPurchase}
          disabled={submitting}
          class="mt-6 block w-full bg-ink px-6 py-4 text-center text-sm tracking-widest text-cream uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Confirmando…' : 'Confirmar compra'}
        </button>
        <a
          href="/shop"
          class="mt-3 block border border-ink px-6 py-4 text-center text-sm tracking-widest uppercase transition-colors hover:bg-ink hover:text-cream"
        >
          Seguir comprando
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
    </>
  );
}
