import { useStore } from '@nanostores/preact';
import { selectedVariantId } from '../stores/variant';
import { imageUrl } from '../lib/format';
import type { ProductImage, ProductVariant } from '../lib/types';

interface Props {
  images: ProductImage[];
  variants: ProductVariant[];
  title: string;
}

const BIG_WIDTHS = [480, 768, 1024, 1440];
const GRID_WIDTHS = [320, 480, 640];

/** Shopify CDN serves resized copies via `&width=`; other hosts ignore it harmlessly only if CDN. */
function srcSet(src: string, widths: number[]): string | undefined {
  if (!src.includes('cdn.shopify.com')) return undefined;
  const sep = src.includes('?') ? '&' : '?';
  return widths.map((w) => `${src}${sep}width=${w} ${w}w`).join(', ');
}

/**
 * Product image grid. When the selected variant links to an image
 * (variant.image_id), that image is promoted to the large first slot.
 */
export default function ProductGallery({ images, variants, title }: Props) {
  const variantId = useStore(selectedVariantId);
  const selected = variants.find((v) => v.id === variantId);

  let ordered = images;
  const variantImage = selected?.image_id
    ? images.find((img) => img.id === selected.image_id)
    : undefined;
  if (variantImage && variantImage.id !== images[0]?.id) {
    ordered = [variantImage, ...images.filter((img) => img.id !== variantImage.id)];
  }

  return (
    <div class="grid grid-cols-1 gap-gutter sm:grid-cols-2">
      {ordered.length ? (
        ordered.map((image, i) => {
          const src = imageUrl(image);
          const widths = i === 0 ? BIG_WIDTHS : GRID_WIDTHS;
          return (
            <div class={`aspect-4/5 overflow-hidden bg-bone ${i === 0 ? 'sm:col-span-2' : ''}`}>
              {src ? (
                <img
                  src={src}
                  srcset={srcSet(src, widths)}
                  sizes={i === 0 ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, 50vw'}
                  alt={image.alt ?? `${title} — imagen ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  class="h-full w-full object-cover"
                />
              ) : (
                <div class="flex h-full w-full items-center justify-center" role="img" aria-label={title}>
                  <span class="font-serif text-sm tracking-widest text-stone uppercase">Alquimia</span>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div class="flex aspect-4/5 items-center justify-center bg-bone sm:col-span-2">
          <span class="font-serif text-sm tracking-widest text-stone uppercase">Alquimia</span>
        </div>
      )}
    </div>
  );
}
