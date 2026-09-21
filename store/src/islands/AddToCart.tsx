import { useState } from 'preact/hooks';
import type { Product } from '../lib/types';
import { addToCart } from '../stores/cart';
import { formatPrice, imageUrl } from '../lib/format';

interface Props {
  product: Product;
}

/** Variant (size) selector + add-to-cart button for the product page. */
export default function AddToCart({ product }: Props) {
  const variants = product.variants.filter((v) => v.price != null);
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? null);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const hasRealVariants = variants.length > 1 || (variants[0] && variants[0].title !== 'Default Title');

  const handleAdd = () => {
    if (!selected) return;
    const variantImage =
      product.images.find((img) => img.id === selected.image_id) ?? product.images[0] ?? null;
    addToCart({
      productId: product.id,
      variantId: selected.id,
      slug: product.handle,
      title: product.title,
      variantTitle: selected.title,
      price: Number(selected.price),
      image: imageUrl(variantImage),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!variants.length) {
    return <p class="text-sm text-taupe">No disponible por el momento.</p>;
  }

  return (
    <div class="space-y-6">
      {hasRealVariants && (
        <fieldset>
          <legend class="mb-3 text-xs tracking-widest text-taupe uppercase">Opción</legend>
          <div class="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                aria-pressed={variant.id === selectedId}
                class={`min-w-12 border px-4 py-2 text-sm transition-colors ${
                  variant.id === selectedId
                    ? 'border-ink bg-ink text-cream'
                    : 'border-sand hover:border-ink'
                }`}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {selected && (
        <p class="text-lg" aria-live="polite">
          {selected.compare_at_price && Number(selected.compare_at_price) > Number(selected.price) && (
            <s class="mr-3 text-stone">{formatPrice(selected.compare_at_price)}</s>
          )}
          {formatPrice(selected.price)}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!selected}
        class="w-full bg-ink px-8 py-4 text-sm tracking-widest text-cream uppercase transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:min-w-64"
      >
        {added ? 'Agregado ✓' : 'Agregar al carrito'}
      </button>
    </div>
  );
}
