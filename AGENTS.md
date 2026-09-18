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
- `src/services/productService.js` — upserts products/variants/images into PostgreSQL
- `src/services/r2Uploader.js` — downloads images and uploads them to Cloudflare R2
- `src/config/db.js` — Knex database client
- `migrations/` — Knex migration files
