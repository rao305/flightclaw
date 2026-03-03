# Sqairinch VTON — Deployment Topology (Vercel + Supabase) — V0.1 → V1
**Status:** Contract for deployment and infrastructure  
**Audience:** Engineers + AI coding assistants  
**Rule:** Don't improvise infra. Follow this file.

---

## 1) Topology Summary
We deploy as a **monolith Shopify app** using **Next.js + API routes**, hosted on Vercel.

- **Next.js Shopify app (Admin UI + API routes)** → Vercel
- **Database (Postgres)** → Supabase
- **Image storage (garments)** → Supabase Storage
- **Storefront widget bundle** → Vercel static now (can move to Storage/CDN later)
- **Storefront calls** must be via **Shopify App Proxy** (first-party)

---

## 2) Environments (Required)
We maintain two completely separate environments:

### 2.1 Staging
- Vercel URL: `https://staging.sqairinch.com`
- Supabase project: `sqairinch-staging`
- Shopify app: `Sqairinch (Staging)`
- Shopify dev store: staging store

### 2.2 Production
- Vercel URL: `https://app.sqairinch.com`
- Supabase project: `sqairinch-prod`
- Shopify app: `Sqairinch (Prod)`
- Shopify store: pilot/merchant store

**Rule:** staging and production must never share DB or secrets.

---

## 3) Shopify App Proxy (Canonical Storefront API)
All storefront network calls go through App Proxy routes:

### 3.1 Proxy configuration (per store)
- Proxy prefix: `/apps`
- Subpath: `/sqairinch`
- Proxy URL: `https://{APP_URL}/apps/sqairinch`

### 3.2 Required proxy routes (V0.1)
- `GET /apps/sqairinch/config?product={shopify_product_id}&variant={shopify_variant_id}`
- `GET /apps/sqairinch/sku?variant={shopify_variant_id}`
- `POST /apps/sqairinch/event`

### 3.3 Security requirement
Proxy requests should be verified (HMAC). Even if temporarily permissive in early dev, code must be structured to enforce verification cleanly.

---

## 4) Domain / DNS Plan
- `staging.sqairinch.com` → Vercel staging project
- `app.sqairinch.com` → Vercel production project

Optional later:
- `cdn.sqairinch.com` → Storage/CDN for widget bundles + images

---

## 5) Supabase Setup

### 5.1 Projects
Create two Supabase projects:
- `sqairinch-staging`
- `sqairinch-prod`

### 5.2 Database schema
Schema is stored in repo under:
- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_indexes.sql`
- `supabase/migrations/003_variant_mapping.sql`
- `supabase/migrations/004_seed_demo.sql` (optional)
- `supabase/migrations/005_csv_import_pipeline.sql`
- `supabase/migrations/006_events_shop_domain.sql`

Apply migrations:
- staging first
- then production after QA

### 5.3 Storage bucket
Create bucket: `garments`

V0.1 recommendation:
- bucket is **public** (simplifies storefront image loading)

### 5.4 Access model
V0.1 rule: **storefront and widget never talk to Supabase directly**.
Only Next API routes access Supabase using the **Service Role key**.

This avoids RLS complexity in V0.1.

---

## 6) Vercel Deployment

### 6.1 Branch mapping
- `develop` → staging deploy
- `main` → production deploy
- PRs → preview deploys (do not run migrations automatically)

### 6.2 Migrations policy
- Do NOT run migrations on every preview deploy.
- Migrations are applied intentionally:
  - manually in Supabase SQL editor (acceptable for V0.1), or
  - via CI step for staging/prod.

---

## 7) Environment Variables

### 7.1 Shopify / Auth
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_SCOPES`
- `APP_URL` (staging/prod base URL)
- `SESSION_SECRET`

### 7.2 Supabase (server-only)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `SUPABASE_ANON_KEY` (only if we ever allow client reads; not used in V0.1)

### 7.3 Widget
- `WIDGET_VERSION` (optional, e.g. `0.1.0`, if config returns versioned URLs)

---

## 8) Widget Hosting Strategy

### 8.1 V0.1 (simple)
Serve widget JS from Next static:
- `https://app.sqairinch.com/widget/widget.js`
Loader script lazy-loads widget bundle on button click.

### 8.2 V1+ (versioned bundles)
Store widget bundles in storage:
- `/widget/v0.1.0/widget.js`
Config endpoint returns the correct bundle URL for safe rollout/pinning.

---

## 9) First Deploy Checklist
### Staging
1) Supabase staging project created + schema applied
2) `garments` bucket created and public
3) Vercel staging deployed with env vars
4) Shopify staging app configured (App URL + OAuth redirect URLs)
5) Install app on staging store
6) Configure App Proxy on staging store
7) Enable App Embed (Dawn theme)
8) Verify:
   - `/apps/sqairinch/config` returns JSON
   - `/apps/sqairinch/sku?variant=...` returns JSON
   - widget opens + shows "Powered by Sqairinch"
   - `POST /apps/sqairinch/event` writes an `events` row

### Production
Repeat after staging passes QA.

---

## 10) Observability (Minimum)
- Log request id on all proxy endpoints
- Store `events` rows for:
  - avatar creation
  - override deltas
  - try-on result snapshots
- Add Sentry later (optional)

---
