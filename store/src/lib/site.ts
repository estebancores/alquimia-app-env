/**
 * Central site identity config used by SEO tags, JSON-LD, robots.txt and
 * llms.txt. Everything geo/social is env-overridable so a deployment can
 * localize without touching code.
 */

export const SITE_NAME = 'Alquimia';
export const SITE_LEGAL_NAME = 'Alquimia brand CO';
export const SITE_TAGLINE = 'Cuidado personal y belleza, seleccionados con intención.';
export const SITE_LOCALE = 'es_CO';
export const SITE_LANGUAGE = 'es';
export const SITE_CURRENCY = 'COP';
export const THEME_COLOR = '#faf9f7';

/** Geo targeting — the store sells and ships within Colombia. */
export const GEO_REGION = import.meta.env.PUBLIC_GEO_REGION || 'CO';
export const GEO_PLACENAME = import.meta.env.PUBLIC_GEO_PLACENAME || 'Colombia';
/** "lat;long" — only emitted when explicitly configured. */
export const GEO_POSITION = import.meta.env.PUBLIC_GEO_POSITION || '';

/** Social/profile URLs for Organization.sameAs (comma-separated in env). */
export const SOCIAL_URLS: string[] = (import.meta.env.PUBLIC_SOCIAL_URLS || '')
  .split(',')
  .map((u: string) => u.trim())
  .filter(Boolean);

export const WHATSAPP_NUMBER = import.meta.env.PUBLIC_WHATSAPP_NUMBER || '';
export const WHATSAPP_URL = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : '';

export const TWITTER_HANDLE = import.meta.env.PUBLIC_TWITTER_HANDLE || '';
