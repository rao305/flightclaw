# Sqairinch VTON (V0.1)
Measurement-based virtual try-on for Shopify: 2D avatar + zone-based fit heatmap (tight/loose/perfect).  
**V0.1 is deterministic** — no camera, no 3D drape, no generative AI.

---

## What we’re building (V0.1)
**Shopper (PDP)**
- Click “Try On / Fit Check”
- Enter 5 inputs (height, weight, age, gender, body shape)
- Get predicted measurements + 2D avatar
- Optionally override measurements
- Auto-detect Shopify variant
- Fetch garment measurement set via App Proxy
- Show overlay + heatmap + “tight by X cm”
- Always show “Powered by Sqairinch”

**Merchant (Admin)**
- Install Shopify app
- Upload CSV of garment measurements keyed by Shopify variant ID
- Upload garment images + fabric type
- Enable App Embed

---

## Source of truth (READ THESE FIRST)
All contracts and scope live here:

- `docs/SQAIRINCH_V0_1_MVP.md` — product scope + flows + rules
- `docs/ARCHITECTURE.md` — system architecture
- `docs/API_CONTRACTS.md` — strict API schemas for proxy endpoints
- `docs/DEPLOYMENT_SUPABASE_VERCEL.md` — staging/prod topology + env vars
- `docs/AI_RULES.md` — instructions for AI tools (Cursor)

**Rule:** If it’s not in the docs, it’s out of scope for V0.1.

---

## Repo structure
Recommended layout:

```
/
apps/
shopify/        # Shopify embedded app (Next.js + API routes) + theme app extension
widget/         # Storefront widget bundle (React/TS) used by the theme extension loader
packages/
shared/         # shared types + schemas + constants (zones, enums)
supabase/
migrations/     # SQL migrations applied to Supabase staging/prod
docs/             # the source-of-truth documentation
```

> Note: We run as a monolith inside the Shopify app (Next API routes). The widget is built as a separate bundle but loaded by the theme extension.

---

## Quick start (local dev)

### Prerequisites
- Node.js 18+ (or 20+ recommended)
- pnpm (recommended) or npm
- Shopify Partner account + Dev Store
- Shopify CLI installed
- Supabase project (staging) created (or local supabase if you prefer)

### 1) Install dependencies
From repo root:
```bash
pnpm install
```

### 2) Set up environment variables

Create these files (copy from `.env.example` if present):

* `apps/shopify/.env.local`
* `apps/widget/.env.local` (optional)

Minimum required for `apps/shopify/.env.local`:

```bash
# Shopify
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_SCOPES=read_products,write_products
APP_URL=https://<your-tunnel-or-dev-url>
SESSION_SECRET=...

# Supabase (server-only)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

**Important:** `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser. Only use it in server-side API routes.

### 3) Apply DB migrations (Supabase)

**Option A – Supabase CLI (recommended)**

```bash
# From repo root; replace with your DB password
SUPABASE_DB_PASSWORD='your-password' ./scripts/supabase-push.sh
```

See `docs/SUPABASE_CLI_SETUP.md` for link-based setup and project details.

**Option B – SQL editor**

In Supabase SQL editor (staging project), apply in this order:

* `supabase/migrations/001_init.sql`
* `supabase/migrations/002_indexes.sql`
* `supabase/migrations/003_variant_mapping.sql`
* `supabase/migrations/004_seed_demo.sql` (optional)
* `supabase/migrations/005_csv_import_pipeline.sql`
* `supabase/migrations/006_events_shop_domain.sql`

Also create Supabase Storage bucket:

* `garments` (public for V0.1 recommended)

### 4) Run the Shopify app locally

From `apps/shopify`:

```bash
pnpm dev
```

If using Shopify CLI, you’ll typically run something like:

```bash
shopify app dev
```

This usually starts a tunnel and prints an install URL for your dev store.

### 5) Install the app on a dev store

* Open the install URL from the CLI output
* Approve permissions
* Confirm the embedded app loads in Shopify Admin

### 6) Configure App Proxy (storefront API)

In Shopify admin (dev store):

* App Proxy prefix: `/apps`
* Subpath: `/sqairinch`
* Proxy URL: `https://<APP_URL>/apps/sqairinch`

### 7) Enable the App Embed (Theme Extension)

Theme editor → App embeds:

* Enable “Sqairinch Fit Check” embed
* Confirm “Try On / Fit Check” button appears on product pages

---

## Local testing checklist

Once installed + embed enabled:

1. Visit a product page (Dawn theme recommended)
2. Click “Try On / Fit Check”
3. Widget opens and shows “Powered by Sqairinch”
4. Widget can call proxy endpoints:

   * `GET /apps/sqairinch/config`
   * `GET /apps/sqairinch/sku?variant=...`
5. CSV import in admin → creates measurement rows
6. Widget shows heatmap list even if image missing

---

## Vertical spine demo (end-to-end smoke check)

Use this checklist to verify the full stack is wired up correctly after a fresh install.

### 0. Verify repo health first
```bash
pnpm install
pnpm smoke   # runs typecheck + lint + build across all packages
```
Expected output ends with `--- Smoke OK ---`.

### 1. Install the app on a dev store
1. Copy `.env.example` → `apps/shopify/.env.local` and fill in all values.
2. From `apps/shopify/`:
   ```bash
   shopify app dev
   ```
3. Open the install URL printed by the CLI, approve permissions.
4. Confirm the embedded admin page loads: **"Sqairinch is installed on `<shop>`"**.

### 2. Enable the App Embed (Theme Extension)
1. In Shopify Admin → **Online Store → Themes → Customize**.
2. Open the **App embeds** panel (bottom-left).
3. Toggle **Sqairinch Try On** to **ON**.
4. Set **Widget bundle URL** to your `NEXT_PUBLIC_WIDGET_URL` value.
5. Save the theme.

### 3. Click the button on a product page
1. Navigate to any product page in your dev store (Dawn theme recommended).
2. Confirm the **"Try On / Fit Check"** button is visible.
3. Click it — the widget overlay should mount.

### 4. Widget loads config from the proxy
1. Open browser DevTools → Network.
2. Look for a request to `/apps/sqairinch/config`.
3. Expect HTTP 200 with a JSON body matching `WidgetConfigSchema` from `packages/shared`.
4. The widget should display **"Powered by Sqairinch"**.

> If any step fails, check the [Common issues](#common-issues) section below.

---

## Development workflow (2 engineers, no chaos)

* `main` → production
* `develop` → staging
* feature branches off `develop`
* small PRs, merged daily
* file ownership:

  * `packages/shared/**` owned by one person (avoid type wars)
  * `apps/widget/**` mostly owned by widget engineer
  * `apps/shopify/**` mostly owned by backend/shopify engineer

---

## V0.1 App Proxy endpoints (canonical)

* `GET /apps/sqairinch/config`
* `GET /apps/sqairinch/sku?variant={shopify_variant_id}`
* `POST /apps/sqairinch/event`

See exact schemas:

* `docs/API_CONTRACTS.md`

---

## Variant Mapping Strategy

The canonical lookup key for a variant is `(shop_domain, shopify_variant_id)`.

### DB implementation

The `variants` table carries a denormalized `brand_id` FK (in addition to `product_id`) so the composite unique constraint can be enforced directly at the DB level:

```sql
UNIQUE (brand_id, shopify_variant_id)
```

`brand_id` is used instead of `shop_domain` to avoid string duplication — `brands.shop_domain` is already `UNIQUE`, so `brand_id ↔ shop_domain` is a 1:1 mapping.

### CSV import endpoint

Merchants upload garment measurements via a two-step **preview → confirm** flow:

**Step 1 — Preview**
```
POST /api/admin/csv-import/preview?shop={shop_domain}
Content-Type: multipart/form-data  (field: "file")  OR  text/csv
```
Returns a `job_id`, row counts, and any per-row validation errors. No data is written to the measurements tables yet.

**Step 2 — Confirm**
```
POST /api/admin/csv-import/confirm?shop={shop_domain}
Content-Type: application/json
Body: { "job_id": "<uuid from preview>" }
```
Applies all valid rows atomically via a single PostgreSQL RPC (`bulk_upsert_csv_import`). Either all rows succeed or none are committed.

**Required header row:**

```
shopify_variant_id,shopify_product_id,size_label,category,fabric_type,waist_cm,hips_cm,bust_chest_cm,torso_length_cm,inseam_cm,sleeve_length_cm
```

Optional column: `image_url` (valid URL, used to associate a product image with the variant).

- `shopify_variant_id` may be numeric (e.g. `9000000001`) or a full GID (e.g. `gid://shopify/ProductVariant/9000000001`) — both are accepted and normalized to GID format before storage.
- Measurement columns are optional; include only the zones relevant to the garment category.
- Re-importing the same CSV is **idempotent**: rows are always upserted, never duplicated, and `updated_at` refreshes on each import.
- Preview jobs expire after **15 minutes**; upload again to get a fresh `job_id` if confirmation is delayed.

### Response

```json
{
  "ok": true,
  "summary": {
    "processed": 2,
    "updated": 2,
    "errors": 0,
    "errorDetails": []
  }
}
```

Partial success is possible: rows that fail validation are reported in `errorDetails` while valid rows are still imported.

---

## Common issues

### App embed button doesn’t show

* Confirm the App Embed is enabled in Theme Editor
* Confirm you’re viewing a PDP (not collection page)
* Confirm the embed block is published, not just preview

### /apps/sqairinch/* returns 404

* App Proxy not configured correctly
* Proxy URL points to wrong environment (staging vs prod)
* App isn’t installed on this store

### Widget styling is broken

* Ensure Shadow DOM mount is enabled
* Verify CSS isolation settings in widget bundle

---

## Deploy (staging/prod)

We deploy:

* Next monolith (Shopify app) on Vercel
* Supabase for Postgres + Storage

Full runbook:

* `docs/DEPLOYMENT_SUPABASE_VERCEL.md`

---

## License / Notes

Internal MVP. Do not store PII in events. Keep V0.1 deterministic and measurement-based.

