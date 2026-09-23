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
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

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

  const closeLightbox = () => {
    setLightbox(null);
    setZoomed(false);
  };

  const step = (dir: number) => {
    setLightbox((i) => (i == null ? null : (i + dir + ordered.length) % ordered.length));
    setZoomed(false);
  };

  // While the lightbox is open: lock body scroll and wire keyboard nav.
  const lightboxOpen = lightbox != null;
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen, ordered.length]);

  // Click-to-zoom: first click zooms to 2.2x anchored at the click point;
  // while zoomed, the origin follows the cursor to pan. Second click resets.
  const onZoomClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
    setZoomed(true);
  };

  const onZoomMove = (e: MouseEvent) => {
    if (!zoomed) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const lbIndex = lightbox == null ? 0 : Math.min(lightbox, ordered.length - 1);
  const lbImage = ordered[lbIndex];
  const lbSrc = lbImage ? imageUrl(lbImage) : null;

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

      {/* Desktop: large first image + grid; click opens the lightbox */}
      <div class="hidden grid-cols-2 gap-gutter sm:grid">
        {ordered.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightbox(i)}
            aria-label={`Ver imagen ${i + 1} a pantalla completa`}
            class={`block aspect-4/5 w-full cursor-zoom-in p-0 text-left ${i === 0 ? 'sm:col-span-2' : ''}`}
          >
            {slide(
              image,
              i,
              i === 0 ? BIG_WIDTHS : GRID_WIDTHS,
              i === 0 ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 30vw, 50vw',
            )}
          </button>
        ))}
      </div>

      {/* Lightbox: full-size image + click-to-zoom with cursor-follow pan */}
      {lightbox != null && lbImage && lbSrc && (
        <div
          class="fixed inset-0 z-50 flex flex-col bg-cream/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${title}`}
          onClick={closeLightbox}
        >
          <div class="flex items-center justify-between px-gutter py-4">
            <span class="text-xs tracking-widest text-taupe uppercase">
              {lbIndex + 1} / {ordered.length}
            </span>
            <button
              type="button"
              onClick={closeLightbox}
              aria-label="Cerrar galería"
              class="p-2 text-ink transition-opacity hover:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-6" aria-hidden="true">
                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div class="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-8">
            <img
              key={lbImage.id}
              src={lbSrc}
              alt={lbImage.alt ?? `${title} — imagen ${lbIndex + 1}`}
              onClick={onZoomClick}
              onMouseMove={onZoomMove}
              draggable={false}
              class="max-h-full max-w-full object-contain select-none"
              style={{
                transform: zoomed ? 'scale(2.2)' : 'scale(1)',
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transition: 'transform 0.25s ease, transform-origin 0.15s linear',
                cursor: zoomed ? 'zoom-out' : 'zoom-in',
              }}
            />

            {ordered.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Imagen anterior"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  class="absolute top-1/2 left-4 -translate-y-1/2 rounded-full border border-sand bg-cream/80 p-3 text-ink transition-colors hover:bg-cream"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Imagen siguiente"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  class="absolute top-1/2 right-4 -translate-y-1/2 rounded-full border border-sand bg-cream/80 p-3 text-ink transition-colors hover:bg-cream"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
