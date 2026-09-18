# API Build Plan — Alquimia E-commerce Environment

## Objective
Build a secure, independent Node.js REST API in `/api` that exposes CRUD operations for products and images stored in the shared PostgreSQL database. The API will serve both the store (public read) and the admin panel (authenticated write). The API must be a completely independent service from the scrapper.

## Context
- Existing monorepo layout: `scrapper/`, `api/`, `store/`, `admin/`.
- Scrapper already defines the core product schema (`products`, `product_variants`, `product_images`, `scraping_jobs`) using Knex + PostgreSQL.
- The API must reuse the same database but have its own Knex configuration, migrations, dependencies, and runtime lifecycle.

## Functional Requirements

### 1. Project Setup (`/api`)
- Initialize an Express-based Node.js project.
- Use Knex with PostgreSQL (`pg`) for database access.
- Load environment variables with `dotenv`.
- Scripts: `start`, `dev`, `migrate`, `migrate:make`, `rollback`, `test`.

### 2. Authentication & Admin Users
- Create a `users` table (Knex migration in the API) with at minimum:
  - `id` (UUID primary key)
  - `email` (unique, not null)
  - `password_hash` (hashed with bcrypt)
  - `role` (e.g. `admin`)
  - `is_active` boolean
  - timestamps
- Implement JWT-based authentication:
  - `POST /auth/login` — email + password, returns access token.
  - `POST /auth/register` — seed first admin (or admin-only endpoint; protect as needed).
  - `GET /auth/me` — returns current user.
  - Passwords must be hashed with bcrypt.
- Require a valid JWT on all mutating endpoints and on any sensitive read endpoints.

### 3. Database Migrations
Keep migrations logically split between services while sharing one database:

#### In `scrapper/` (existing schema owner)
- Migration: add `provider_price` column to `products` table so the scraper can store the supplier/provider cost alongside public/variant pricing.
- This column is nullable decimal, e.g. `provider_price decimal(12, 2)`.

#### In `api/`
- Migration: create `users` table.
- Migration: create `product_logs` table to track all product/image transactions:
  - `id` UUID PK
  - `user_id` UUID FK to users (nullable for system/scrapper actions)
  - `product_id` UUID FK to products
  - `image_id` UUID FK to product_images (nullable)
  - `action` enum/text (CREATE, UPDATE, DELETE, IMAGE_UPLOAD, IMAGE_DELETE, etc.)
  - `table_name` text (`products`, `product_images`, etc.)
  - `record_id` UUID (denormalized for quick lookups)
  - `payload` JSONB (snapshot or diff)
  - `ip_address`, `user_agent`
  - `created_at` timestamp
- Run API migrations against the same `DB_URL` using its own `knex_migrations` table or namespace.

### 4. CRUD for Products
Endpoints (all JSON, RESTful):
- `GET /products` — list products with pagination, search, filters (`source_domain`, `vendor`, `product_type`, `status`).
- `GET /products/:id` — get a single product with variants and images.
- `POST /products` — create product (admin only).
- `PUT /products/:id` — update product (admin only).
- `DELETE /products/:id` — soft or hard delete (admin only).
- Validation on title, handle, source_domain, shopify_product_id.
- Record every create/update/delete in `product_logs`.

### 5. CRUD for Images
- `GET /products/:id/images` — list images for a product.
- `GET /images/:id` — get image detail.
- `POST /products/:id/images` — add a new image (admin only). Accepts `original_src`/`r2_url` or file upload.
- `PUT /images/:id` — update image metadata (admin only).
- `DELETE /images/:id` — delete image record (admin only).
- Record every image operation in `product_logs`.

### 6. Logging / Audit Trail
- All write operations on `products` and `product_images` must write an audit row to `product_logs`.
- The middleware/service layer should capture the authenticated user, IP, user agent, and payload snapshot.

### 7. Security & DDoS Protection
- All authenticated routes require a valid JWT in `Authorization: Bearer <token>`.
- Use `helmet` for security headers.
- Use `cors` configured with explicit origins.
- Use `express-rate-limit` for general API rate limiting.
- Use `express-slow-down` or stricter limits for auth routes to prevent brute force.
- Validate and sanitize inputs.
- Do not return stack traces in production.
- Use strong JWT secret from environment.

### 8. Service Independence
- The API and scrapper must not import each other's source code.
- They may share only the database connection string and table names.
- Each service has its own `package.json`, `node_modules`, `knexfile.js`, and migrations folder.

## Suggested API Directory Structure
```
api/
├── src/
│   ├── index.js                 # Express app entry
│   ├── config/
│   │   └── db.js                # Knex instance
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validator.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   └── images.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   └── imageController.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── imageService.js
│   │   └── auditService.js
│   └── utils/
│       └── password.js
├── migrations/                  # API-only migrations
├── .env.example
├── knexfile.js
├── package.json
└── README.md
```

## Environment Variables (`/api/.env`)
```bash
NODE_ENV=development
PORT=3001
DB_URL=postgresql://...
JWT_SECRET=super_secret_random_string
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
```

## Acceptance Criteria
1. `npm install` in `/api` installs all dependencies.
2. `npm run migrate` creates `users` and `product_logs` tables without touching scrapper-managed tables.
3. Scrapper migration adds `provider_price` to `products` cleanly.
4. Admin can register/login and receive JWT.
5. Unauthenticated `POST /products` returns `401`.
6. Authenticated admin can create, update, delete products and images.
7. Every write operation creates an audit log row.
8. Rate limiting blocks rapid repeated requests.
9. The API does not import files from `../scrapper/src`.

## Notes
- Use `gen_random_uuid()` for UUID primary keys (consistent with scrapper).
- Keep currency columns as `decimal(12, 2)`.
- Prefer JSONB for flexible arrays/objects (`tags`, `payload`).
- Keep error responses consistent: `{ success: false, error: "message" }` or similar.
- Document all new endpoints in `/api/README.md` as they are built.
