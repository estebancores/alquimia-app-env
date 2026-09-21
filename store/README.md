# Alquimia Store

Tienda e-commerce construida con Astro 7, optimizada para SEO y Core Web Vitals, con diseño minimalista tipo Aritzia (espacio en blanco, serif elegante, foto de producto como protagonista).

## Stack

- **Astro 7** (`output: 'server'`, adapter Node standalone) con arquitectura de islas
- **TypeScript estricto** (`astro/tsconfigs/strict` + `noUncheckedIndexedAccess`)
- **Tailwind CSS 4** (plugin Vite, tokens de diseño en `src/styles/global.css`)
- **Preact** para las islas interactivas (~11 KB vs ~45 KB de React)
- **nanostores + @nanostores/persistent** para el carrito (localStorage)
- Consume la API REST del paquete `api/` (Railway en producción)

## Arquitectura de renderizado

| Página | Estrategia | Justificación |
|---|---|---|
| Homepage | SSR + `s-maxage=300, stale-while-revalidate=600` | "New Arrivals" cambia con cada scrape; el cache header hace de ISR |
| Categoría / listado | SSR | Filtros/paginación server-side contra la API; cada combinación de query params es una URL renderizada en servidor (crawleable) |
| Producto | SSR + `s-maxage=600, swr=1800` | Catálogo scrapeado y "mergeado" con frecuencia; SSG con `getStaticPaths` resucitaría productos eliminados hasta el siguiente build |
| Carrito | SSR shell + isla `client:load`, `no-store` | Estado 100% cliente (localStorage) |
| sitemap.xml / robots.txt | Endpoints dinámicos, `s-maxage=3600/86400` | El sitemap debe reflejar el catálogo actual |

**¿Por qué `output: 'server'` y no `'static'`/híbrido con prerender?** El catálogo cambia con cada corrida del scraper y con los merges del admin; no hay webhook de rebuild. En Railway no existe ISR nativo, así que el equivalente es **SSR + `Cache-Control` (`s-maxage` + `stale-while-revalidate`) + cache in-memory de la API (TTL 1–5 min en `src/lib/api.ts`)**. Si más adelante se sirve detrás de un CDN (Cloudflare delante de Railway), esos headers ya activan el caching en el edge. Cualquier ruta puede volverse estática con `export const prerender = true` sin cambiar nada más.

**Nota sobre despliegue:** se eligió Railway (mismo proveedor que la API, menor latencia interna). Vercel daría ISR nativo y CDN de imágenes; si algún día se migra, solo hay que cambiar el adapter.

## Estructura

```
store/
├── astro.config.mjs        # node adapter, preact, prefetch, tailwind, remotePatterns
├── src/
│   ├── layouts/BaseLayout.astro   # <head> + SEO + ClientRouter (View Transitions) + Cache-Control
│   ├── components/         # 100% estáticos (cero JS)
│   │   ├── SEO.astro       # title/description/canonical/OG/Twitter/JSON-LD/prev-next
│   │   ├── Header.astro / Footer.astro
│   │   ├── Breadcrumbs.astro
│   │   ├── ProductCard.astro / ProductImage.astro (astro:assets <Image>)
│   │   ├── CategoryGrid.astro     # variantes editorial (home) y strip (categoría)
│   │   ├── Pagination.astro / Hero.astro / ApiErrorNotice.astro
│   ├── islands/            # únicas piezas hidratadas (Preact)
│   │   ├── FilterBar.tsx   # client:visible — filtros/sort → query params en URL
│   │   ├── AddToCart.tsx   # client:idle — selector de variante + agregar
│   │   ├── CartIndicator.tsx  # client:idle + transition:persist
│   │   └── CartContents.tsx   # client:load — página de carrito + pedido WhatsApp
│   ├── lib/
│   │   ├── api.ts          # capa de datos tipada + cache TTL + ApiError + timeout
│   │   ├── types.ts        # tipos de la API
│   │   ├── listing.ts      # parseo de query params + carga de listados
│   │   ├── jsonld.ts       # Product, BreadcrumbList, Organization, ItemList
│   │   └── format.ts       # COP, slugify, imageUrl, stripHtml
│   ├── stores/cart.ts      # nanostores persistente + URL de pedido WhatsApp
│   └── pages/
│       ├── index.astro             # home: hero + categorías + novedades
│       ├── shop.astro              # todo el catálogo (?search= también)
│       ├── [category]/index.astro  # /bolsos, /calzado… (product_type slugificado)
│       ├── product/[slug].astro    # /product/<handle>
│       ├── cart.astro / 404.astro
│       ├── sitemap.xml.ts / robots.txt.ts
```

## SEO

- Meta tags dinámicos + canonical por página (`SEO.astro`)
- Open Graph + Twitter Cards (imagen de producto/categoría)
- JSON-LD: `Product`, `BreadcrumbList`, `Organization`, `ItemList`
- URLs limpias: `/bolsos`, `/product/bolso-boston`
- **Paginación real** (no infinite scroll): cada página es una URL indexable con `rel=prev/next`; el infinite scroll oculta productos al crawler y rompe el back-button. Con 24 productos/página el trade-off UX es mínimo.
- Páginas con filtros activos → `noindex, follow` + canonical a la versión sin filtros (evita contenido duplicado)
- `sitemap.xml` dinámico (home, categorías + sus páginas, todos los productos con `lastmod`). Se generó a mano en vez de `@astrojs/sitemap` porque esa integración solo incluye rutas prerenderizadas y aquí todo es SSR.
- `robots.txt` dinámico con referencia al sitemap; `Disallow: /cart`
- Un solo `h1` por página; breadcrumbs visibles y marcados

## Rendimiento

- `astro:assets` `<Image />` para todo: WebP/AVIF, `srcset` responsive, lazy-load (eager solo above-the-fold)
- Prefetch nativo de Astro (`prefetchAll` + estrategia `viewport`)
- View Transitions (`<ClientRouter />`) para navegación fluida
- Hero soporta video (`autoplay muted playsinline` + poster) vía `PUBLIC_HERO_VIDEO_URL`
- Cache: TTL in-memory servidor (60s listados, 5min meta) + `Cache-Control` con `stale-while-revalidate`

### Performance budget

| Recurso | Objetivo | Actual |
|---|---|---|
| JS cliente (gzip) | < 40 KB | ~20 KB (Preact + islas + ClientRouter) |
| Imagen LCP | < 200 KB | WebP responsive vía astro:assets |
| CSS (gzip) | < 15 KB | Tailwind purgado |
| Fuentes | 2 familias, woff2, self-hosted | Inter Variable + Cormorant Garamond (500/600) |
| LCP / INP / CLS | < 2.5 s / < 200 ms / < 0.1 | Sin JS bloqueante; dimensiones de imagen fijas (sin CLS) |

## Setup

```bash
cd store
npm install
cp .env.example .env   # configurar API_BASE_URL, PUBLIC_SITE_URL, PUBLIC_WHATSAPP_NUMBER
npm run dev            # http://localhost:4321 (requiere api/ corriendo)
npm run check          # astro check (typecheck)
npm run build && npm start   # producción (Node standalone en dist/server/entry.mjs)
```

### Variables de entorno

- `API_BASE_URL` — URL de la API (Railway en producción, `http://localhost:3001` en dev). Solo servidor.
- `PUBLIC_SITE_URL` — URL pública del sitio (canonicals, sitemap, JSON-LD)
- `PUBLIC_WHATSAPP_NUMBER` — número E.164 sin `+` para pedidos
- `PUBLIC_HERO_VIDEO_URL` — (opcional) video mp4 del hero

## Decisiones y limitaciones conocidas

- **Categorías** = valores distintos de `product_type` (la API no tiene endpoint de categorías); el slug se resuelve contra `/products/meta`.
- **Producto por slug**: la API no tiene `/products/by-handle`, se usa `?search=<handle>` y match exacto. Si la API crece, agregar ese endpoint y simplificar `getProductBySlug`.
- **Sort por precio**: la API siempre ordena por `created_at desc`; el sort de precio se aplica solo a la página actual (server-side). Mejora sugerida: query param `sort` en la API.
- **Filtros de color/talla**: no existen como columnas consultables (viven en `option1..3` de variantes); la barra filtra por Categoría, Marca y Precio. Mejora sugerida: exponer opciones agregadas en `/products/meta`.
- **Imágenes**: los `r2_url` guardados apuntan al endpoint privado `*.r2.cloudflarestorage.com` (no público), así que se usa `original_src` (CDN Shopify) como fuente; cuando el scraper guarde URLs públicas de R2 (`pub-*.r2.dev` o dominio propio) se usarán automáticamente (`imageUrl()` en `src/lib/format.ts`).
- **Carrito**: local (localStorage) y el checkout genera un pedido por WhatsApp — sin pagos online.
- **Storefront solo muestra `public=true`** (los productos scrapeados quedan con `status='draft'`, por eso no se filtra por status).

## Despliegue en Railway

1. Nuevo servicio apuntando a `store/` (root del build).
2. Build command: `npm install && npm run build` — Start command: `npm start`.
3. Variables: `API_BASE_URL` (URL interna/pública del servicio api), `PUBLIC_SITE_URL` (dominio final), `PUBLIC_WHATSAPP_NUMBER`.
4. Node ≥ 22.12 (requisito de Astro 7).
5. Recomendado: poner Cloudflare (proxy) delante del dominio para que los `Cache-Control` con `s-maxage` activen cache en edge (ISR "gratis").
