import type { ImageMetadata } from 'astro';

export type LocalMedia =
  | { kind: 'video'; src: string }
  | { kind: 'gif'; src: string }
  | { kind: 'image'; src: ImageMetadata };

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov']);
// Priority order: video > gif > static image.
const EXT_PRIORITY = ['mp4', 'webm', 'mov', 'gif', 'jpg', 'jpeg', 'png', 'webp', 'avif'];

const mediaFiles = import.meta.glob<{ default: unknown }>(
  '../assets/*.{jpg,webp,avif,gif,mp4}',
  { eager: true },
);
/**
 * Local artwork overrides the API image when a file named after the slug
 * exists in src/assets/ (e.g. bolsos.jpg, bolsos.mp4). 'all.*' feeds the
 * "Todo en la tienda" tile.
 */
export function localMediaFor(slug: string): LocalMedia | null {
  for (const ext of EXT_PRIORITY) {
    const mod = mediaFiles[`../assets/${slug}.${ext}`];
    if (!mod) continue;
    if (VIDEO_EXTS.has(ext)) return { kind: 'video', src: mod.default as string };
    if (ext === 'gif') return { kind: 'gif', src: mod.default as string };
    return { kind: 'image', src: mod.default as ImageMetadata };
  }
  return null;
}
