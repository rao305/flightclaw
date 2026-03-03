# Sqairinch VTON — V0.1 Architecture (Engineering Source of Truth)
**Status:** V0.1 contract  
**Scope:** Shopify app + theme extension + storefront widget + proxy APIs + DB + storage  
**Rule:** Architecture must prioritize: (1) Shopify compatibility, (2) deterministic behavior, (3) CSP-safe storefront calls.

---

## 1) System Overview
Sqairinch V0.1 is a Shopify-installable plugin that provides **measurement-based virtual try-on**:
- The widget runs on the storefront (PDP) in a modal/drawer.
- The widget fetches garment measurement data via **Shopify App Proxy** endpoints.
- Merchants upload garment measurement sets + fabric type + images via admin dashboard.
- Fit results are computed client-side (deterministic) and logged server-side (events DB).

---

## 2) High-Level Components

### 2.1 Shopify App (Admin + backend)
Responsibilities:
- OAuth installation
- merchant dashboard UI
- CSV import + validation
- persistent DB storage of measurements & assets
- serves App Proxy endpoints used by storefront
- validates App Proxy signatures

### 2.2 Theme App Extension (App Embed)
Responsibilities:
- toggleable embed in Theme Editor
- injects:
  - “Try On / Fit Check” button
  - mount div (e.g., `#sqairinch-root`)
  - loader script that lazy loads widget bundle

### 2.3 Storefront Widget (React/TS bundle)
Responsibilities:
- shopper avatar flow (5 inputs)
- deterministic prediction engine
- manual measurement overrides
- SVG avatar rendering
- garment overlay (2D)
- fit heatmap engine + UI
- event emission to App Proxy endpoint

### 2.4 Backend API + Postgres
Responsibilities:
- store merchants, products, variants, measurements, assets
- store avatars/tryons/events (lightweight)
- provide App Proxy endpoints:
  - config
  - sku
  - event

### 2.5 Object Storage (images)
Responsibilities:
- store garment images and return stable URLs
- (optional V0.1) signed upload flow or backend upload proxy

---

## 3) Repo Structure (Recommended)
Monorepo layout:

```
/
apps/
shopify/           # Shopify CLI app (admin UI + proxy server)
backend/           # (optional) separate API service if not bundled in shopify app
widget/            # React widget bundle (storefront)
packages/
shared/            # canonical types + schemas + constants (zones, etc.)
docs/
SQAIINCH_V0_1_MVP.md
ARCHITECTURE.md
API_CONTRACTS.md
```

**Note:** You can implement backend inside `apps/shopify` to reduce deployment complexity.  
If you split it out, keep endpoint paths the same via proxy routing.

---

## 4) Data Flow Diagrams (Text)

### 4.1 Merchant setup flow
1) Merchant installs app → OAuth completes
2) Merchant opens dashboard
3) Merchant uploads CSV via `POST /api/admin/csv-import/preview?shop={shop_domain}` → receives `job_id` + row-level validation report
4) Merchant confirms via `POST /api/admin/csv-import/confirm?shop={shop_domain}` with `{ job_id }` → server applies all valid rows atomically via `bulk_upsert_csv_import` RPC
5) Merchant uploads garment images (stored in object storage)
6) Merchant enables App Embed in theme editor

### 4.2 Shopper try-on flow
1) Shopper loads PDP → App Embed injects button + mount div + loader  
2) Shopper clicks button → loader lazy-loads widget bundle  
3) Widget fetches config via App Proxy:
   - `GET /apps/sqairinch/config?product=...&variant=...`
4) Shopper enters 5 inputs → widget predicts measurements → renders avatar  
5) Widget detects current variant id  
6) Widget fetches SKU data via App Proxy:
   - `GET /apps/sqairinch/sku?variant=...`
7) Widget computes fit result client-side:
   - diff/tolerance logic per zone
8) Widget renders overlay + heatmap UI  
9) Widget logs events server-side:
   - `POST /apps/sqairinch/event`

---

## 5) Storefront Integration Details

### 5.1 Loader responsibilities
The loader script must:
- be tiny and safe
- listen for the PDP button click
- lazy-load widget bundle only after click
- pass in:
  - shop domain (if available)
  - product id (optional)
  - current variant id (required)
- mount inside `#sqairinch-root` (prefer Shadow DOM)

### 5.2 Variant detection
Widget must handle variant changes:
- default: read variant from product form input `name="id"`
- attach change listeners to variant selectors
- debounce refetch calls

---

## 6) App Proxy Notes (Important)
All storefront network calls must go through App Proxy routes:
- reduces CSP conflicts
- makes requests appear first-party

Backend must:
- verify proxy signature (HMAC)
- return strict schema (use shared validation)
- handle missing data gracefully

---

## 7) Determinism & Debugging
V0.1 must remain deterministic:
- coefficients are versioned JSON
- fit calculation logic stable
- output snapshots can be logged for reproducibility

Recommended debug mode:
- add `?sqairinch_debug=1` to enable:
  - show variant id
  - show fetched sku JSON
  - show computed diffs/tolerances per zone

---

## 9) Variant Mapping Strategy

### Canonical key
`(shop_domain, shopify_variant_id)` is the semantic composite key for all variant lookups.

### DB implementation
The `variants` table carries a denormalized `brand_id` FK (alongside `product_id`). This is the only way to enforce the composite constraint at the DB level without joining through `products`:

```sql
UNIQUE (brand_id, shopify_variant_id)   -- constraint: uq_variants_brand_variant
UNIQUE INDEX idx_variants_brand_shopify_variant ON variants(brand_id, shopify_variant_id)
```

`brand_id` is used instead of `shop_domain` to avoid text duplication. `brands.shop_domain` is `UNIQUE`, so `brand_id ↔ shop_domain` is a 1:1 mapping.

### All upserts use the composite key
```sql
ON CONFLICT (brand_id, shopify_variant_id) DO UPDATE ...
```

### CSV import endpoints (preview → confirm)

**Preview**
```
POST /api/admin/csv-import/preview?shop={shop_domain}
```
- Auth: session check via `sessionStorage.findSessionsByShop(shop)`
- Accepts `multipart/form-data` (field: `file`) or raw `text/csv` body (max 5 MB)
- Validates all rows, normalizes variant IDs to GID format
- Persists a `csv_import_jobs` row (status `pending`, 15-min TTL) — no measurements written yet
- Returns `job_id`, row counts, and per-row error details

**Confirm**
```
POST /api/admin/csv-import/confirm?shop={shop_domain}
Body: { "job_id": "<uuid>" }
```
- Auth: same session check
- Pre-flight: validates job exists, is `pending`, and not expired
- Calls `bulk_upsert_csv_import` PL/pgSQL RPC — all 4 table writes happen in one atomic transaction
- All-or-nothing: any row-level failure rolls back everything; job status set to `failed`
- On success: job status set to `applied`; concurrent confirm calls serialized via `FOR UPDATE`
- Re-import is idempotent: always updates, never creates duplicates

### Multi-tenant isolation
The SKU endpoint filters by `brand_id` directly (using the composite index), ensuring a variant belonging to shop A cannot be fetched via shop B's proxy request.

---

## 8) Deployment Notes (V0.1)
Minimum deployment footprint:
- Shopify app hosted (contains proxy endpoints + dashboard)
- Widget bundle hosted (CDN or served by app)
- Postgres hosted
- Object storage bucket for images

Keep a single “Deploy Checklist” with:
- env vars
- migration steps
- rollback steps

---
