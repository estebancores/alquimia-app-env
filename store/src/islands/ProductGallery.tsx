import { useEffect, useRef, useState } from 'preact/hooks';
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
 * Product image gallery. On mobile it's a horizontal swipe slider; on
 * sm+ screens a grid with a large first slot. When the selected variant
 * links to an image (variant.image_id), that image is promoted to the
 * first position in both layouts.
 */
export default function ProductGallery({ images, variants, title }: Props) {
  const variantId = useStore(selectedVariantId);
  const selected = variants.find((v) => v.id === variantId);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  let ordered = images;
  const variantImage = selected?.image_id
    ? images.find((img) => img.id === selected.image_id)
    : undefined;
  if (variantImage && variantImage.id !== images[0]?.id) {
    ordered = [variantImage, ...images.filter((img) => img.id !== variantImage.id)];
  }

  // Jump the slider back to the promoted image when the variant changes order.
  const firstId = ordered[0]?.id;
  useEffect(() => {
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [firstId]);

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  if (!ordered.length) {
    return (
      <div class="flex aspect-4/5 items-center justify-center bg-bone">
        <span class="font-serif text-sm tracking-widest text-stone uppercase">Alquimia</span>
      </div>
    );
  }

  const slide = (image: ProductImage, i: number, widths: number[], sizes: string) => {
    const src = imageUrl(image);
    return (
      <div class="h-full w-full overflow-hidden bg-bone">
        {src ? (
          <img
            src={src}
            srcset={srcSet(src, widths)}
            sizes={sizes}
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
  };

  return (
    <>
      {/* Mobile: horizontal snap slider */}
      <div class="sm:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          class="flex snap-x snap-mandatory overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:size-0"
        >
          {ordered.map((image, i) => (
            <div key={image.id} class="aspect-4/5 w-full shrink-0 snap-center">
              {slide(image, i, BIG_WIDTHS, '100vw')}
            </div>
          ))}
        </div>
        {ordered.length > 1 && (
          <div class="mt-3 flex items-center justify-center gap-2">
            {ordered.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Imagen ${i + 1}`}
                aria-current={i === active}
                class={`h-1.5 rounded-full transition-all ${
                  i === active ? 'w-4 bg-ink' : 'w-1.5 bg-sand'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: large first image + grid */}
      <div class="hidden grid-cols-2 gap-gutter sm:grid">
        {ordered.map((image, i) => (
          <div
            key={image.id}
            class={`aspect-4/5 ${i === 0 ? 'sm:col-span-2' : ''}`}
          >
            {slide(
              image,
              i,
              i === 0 ? BIG_WIDTHS : GRID_WIDTHS,
              i === 0 ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, 50vw',
            )}
          </div>
        ))}
      </div>
    </>
  );
}
