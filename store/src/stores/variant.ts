import { atom } from 'nanostores';

/** Currently selected variant on the product page — shared between islands. */
export const selectedVariantId = atom<string | null>(null);
