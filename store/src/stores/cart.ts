import { persistentAtom } from '@nanostores/persistent';
import { computed } from 'nanostores';
import { FREE_SHIPPING_THRESHOLD } from '../lib/constants';

export { FREE_SHIPPING_THRESHOLD };

export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  title: string;
  variantTitle: string;
  price: number;
  image: string | null;
  qty: number;
}

/** Cart persisted in localStorage — survives navigation and reloads. */
export const cartItems = persistentAtom<CartItem[]>('alquimia:cart', [], {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
});

export const cartCount = computed(cartItems, (items) =>
  items.reduce((sum, item) => sum + item.qty, 0),
);

export const cartTotal = computed(cartItems, (items) =>
  items.reduce((sum, item) => sum + item.price * item.qty, 0),
);

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1): void {
  const items = cartItems.get();
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    cartItems.set(
      items.map((i) => (i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i)),
    );
  } else {
    cartItems.set([...items, { ...item, qty }]);
  }
}

export function setQty(variantId: string, qty: number): void {
  if (qty <= 0) return removeFromCart(variantId);
  cartItems.set(cartItems.get().map((i) => (i.variantId === variantId ? { ...i, qty } : i)));
}

export function removeFromCart(variantId: string): void {
  cartItems.set(cartItems.get().filter((i) => i.variantId !== variantId));
}

export function clearCart(): void {
  cartItems.set([]);
}

/** Build a WhatsApp order message from the current cart. */
export function whatsappOrderUrl(phone: string): string {
  const items = cartItems.get();
  const lines = items.map(
    (i) =>
      `• ${i.title}${i.variantTitle && i.variantTitle !== 'Default Title' ? ` (${i.variantTitle})` : ''} x${i.qty} — $${(i.price * i.qty).toLocaleString('es-CO')}`,
  );
  const total = cartTotal.get();
  const message = [
    'Hola, quiero hacer este pedido:',
    '',
    ...lines,
    '',
    `Total: $${total.toLocaleString('es-CO')} COP`,
    ...(total >= FREE_SHIPPING_THRESHOLD ? ['Envío: gratis'] : []),
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
