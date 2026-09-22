// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// Rendering architecture
// ----------------------
// output: 'server' — the catalog lives in PostgreSQL and changes with every
// scraper run / admin merge, so pages are rendered on demand. Individual
// routes can still opt into prerendering with `export const prerender = true`
// (Astro's hybrid model since v5). We keep everything SSR + short-lived
// in-memory API cache (see src/lib/api.ts) + Cache-Control headers, because
// Railway has no ISR primitive: SSR + cache headers is the equivalent.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://alquimia.up.railway.app',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact({ compat: false })],
  // Built-in prefetch (replaces the deprecated @astrojs/prefetch integration).
  // 'hover': pages prefetch on hover/tap intent only. 'viewport' prefetched
  // every visible link, and since each SSR render costs several API calls, a
  // single pageview triggered ~30 server renders and tripped the API's 429s.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  image: {
    // Product images live on Cloudflare R2 (and occasionally Shopify CDN).
    remotePatterns: [{ protocol: 'https' }],
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
