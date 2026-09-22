/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly API_BASE_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_WHATSAPP_NUMBER: string;
  readonly PUBLIC_HERO_VIDEO_URL?: string;
  /** Geo targeting (defaults: CO / Colombia). */
  readonly PUBLIC_GEO_REGION?: string;
  readonly PUBLIC_GEO_PLACENAME?: string;
  /** "lat;long" — emitted as geo.position/ICBM meta tags when set. */
  readonly PUBLIC_GEO_POSITION?: string;
  /** Comma-separated profile URLs for Organization.sameAs. */
  readonly PUBLIC_SOCIAL_URLS?: string;
  /** e.g. "@alquimia" for twitter:site. */
  readonly PUBLIC_TWITTER_HANDLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
