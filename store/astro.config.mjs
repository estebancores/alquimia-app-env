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
  integrations: [
    preact({ compat: false }),
    {
      // Swap in the cached, serialized /_image endpoint for production builds
      // (dev keeps Astro's own endpoint, which resolves /@fs source paths).
      name: 'cached-image-endpoint',
      hooks: {
        'astro:config:setup': ({ command, updateConfig }) => {
          if (command === 'build') {
            updateConfig({ image: { endpoint: { entrypoint: './src/lib/imageEndpoint.ts' } } });
          }
        },
      },
    },
  ],
  // Built-in prefetch (replaces the deprecated @astrojs/prefetch integration).
  // 'hover': pages prefetch on hover/tap intent only. 'viewport' prefetched
  // every visible link, and since each SSR render costs several API calls, a
  // single pageview triggered ~30 server renders and tripped the API's 429s.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  // No image.remotePatterns: remote product images are resized by their CDN
  // (see responsiveImage in src/lib/format.ts), and allowing any https host
  // let anyone make this server download + transform arbitrary images.
  vite: {
    plugins: [tailwindcss()],
  },
});
