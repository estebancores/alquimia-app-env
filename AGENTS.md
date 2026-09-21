# Alquimia E-commerce Environment

## Scrapper

The `scrapper/` package is a Node.js tool that scrapes Shopify storefronts via their public `products.json` API and persists products, variants, and images.

### Setup

```bash
cd scrapper
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values.

- `DB_URL`: PostgreSQL connection string
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`: Cloudflare R2 credentials for image uploads

### Database migrations

Migrations use Knex. Run them with:

```bash
npx knex migrate:latest
```

### Running the scraper

```bash
node src/index.js <domain>
# e.g.
node src/index.js almamia.com
```

### Key files

- `src/index.js` — entry point and orchestration
- `src/services/shopifyScraper.js` — fetches products from Shopify JSON API
- `src/services/productService.js` — upserts products/variants/images into PostgreSQL; skips or redirects products recorded in `merged_products` (tombstones written when duplicates are merged via the API)
- `src/services/r2Uploader.js` — downloads images and uploads them to Cloudflare R2
- `src/config/db.js` — Knex database client
- `migrations/` — Knex migration files

## API

The `api/` package is the REST API for products, images, and admin authentication.

### Setup

```bash
cd api
npm install
cp .env.example .env
# Fill in .env values
npx knex migrate:latest
```

### Seeding an admin user

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (they default to local-development-only values), then run:

```bash
npx knex seed:run
```

This creates the first admin account so you can sign in from the `admin/` app.

### Running the API

```bash
npm start
```

The API runs on the port defined by `PORT` (default `3001`).

### Product merge

`POST /products/:id/merge` (auth required) accepts `{ "product_ids": [...] }` and merges those
products into the target: their variants and images are re-parented, a `merged_products`
tombstone row is written per source, and the source product rows are deleted. The scraper
checks these tombstones so re-scraping a domain does not resurrect merged duplicates.

`GET /products` also accepts a `title` query param (case-insensitive LIKE) for finding
merge candidates; it is used by the admin "Merge duplicate products" section.

## Admin

The `admin/` package is a Vue 3 SPA for managing the Alquimia store. It uses Vite, Vue Router, Pinia, and PrimeVue.

### Setup

```bash
cd admin
npm install
cp .env.example .env
```

### Environment variables

- `VITE_API_BASE_URL` — base URL of the `api` service (defaults to `/api`, proxied to `http://localhost:3001` in dev)

### Running the admin app

Make sure the `api` service is running and the admin seed has been applied, then:

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API calls to the backend running on port `3001`.

### Default login

After running `npx knex seed:run` in `api/`, the default admin credentials are:

- Email: `admin@alquimia.com`
- Password: `AdminPassword123!`

Override these via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `api/.env` before running the seed.

### Build

```bash
npm run build
```

### Key files

- `src/main.js` — Vue app entry point with Pinia, Vue Router, PrimeVue, Toast and Confirmation services
- `src/router/index.js` — route definitions and auth guard
- `src/services/api.js` — axios instance with JWT interceptor
- `src/stores/auth.js` — login, logout, and current user state
- `src/stores/product.js` — product CRUD operations via the API
- `src/stores/order.js` — orders and delivery state (placeholder, wire to backend when ready)
- `src/stores/settings.js` — application settings state
- `src/components/layout/AppLayout.vue` — sidebar + topbar layout
- `src/views/LoginView.vue` — simple login screen
- `src/views/DashboardView.vue` — dashboard summary
- `src/views/ProductsView.vue` — product list and CRUD dialog
- `src/views/ProductEditView.vue` — product editor (gallery, variants, merge-duplicates section)
- `src/views/OrdersView.vue` — pending deliveries and scheduling dialog
- `src/views/SettingsView.vue` — settings form
