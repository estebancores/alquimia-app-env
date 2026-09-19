const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-e0bb73898d1b457a87343a9c71e7bffa.r2.dev';

export function imageUrl(image) {
  if (!image) return null;
  if (image.r2_key) return `${R2_PUBLIC_URL}/${image.r2_key}`;
  return image.r2_url || image.original_src || null;
}
