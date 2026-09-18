# Alquimia API

REST API for products, images, and admin authentication. Independent service from `scrapper/`.

## Setup

```bash
cd api
npm install
cp .env.example .env
# Fill in .env values
npx knex migrate:latest
npm start
```

## Environment variables

- `NODE_ENV` — development / production
- `PORT` — defaults to 3001
- `DB_URL` — PostgreSQL connection string (shared with scrapper)
- `JWT_SECRET` — strong random string
- `JWT_EXPIRES_IN` — e.g. `24h`
- `CORS_ORIGIN` — allowed CORS origin(s)

## Endpoints

### Health
- `GET /health`

### Auth
- `POST /auth/register` — register the first admin account only. Disabled once any user exists (rate limited)
- `POST /auth/login` — login (rate limited)
- `GET /auth/me` — current user (requires JWT)
- `POST /auth/users` — create additional admin users (requires JWT)

### Products
- `GET /products` — list products (public, supports pagination, search, filters)
- `GET /products/:id` — get product with variants and images
- `POST /products` — create product (admin + JWT)
- `PUT /products/:id` — update product (admin + JWT)
- `DELETE /products/:id` — delete product (admin + JWT)

### Images
- `GET /products/:productId/images` — list images for a product
- `GET /images/:id` — get image details
- `POST /products/:productId/images` — add image to product (admin + JWT)
- `PUT /images/:id` — update image metadata (admin + JWT)
- `DELETE /images/:id` — delete image (admin + JWT)

## Security

- JWT required for all write operations
- Helmet security headers
- CORS configured via env
- Rate limiting on all routes; stricter limits on auth and write endpoints
- Input validation with express-validator
- Passwords hashed with bcrypt

## Migrations

Run with:

```bash
npx knex migrate:latest
npx knex migrate:rollback
```

Migrations are stored in `api/migrations/` and use table `knex_migrations_api`.
