# Supabase CLI setup (Sqairinch)

This project is configured to use the Supabase CLI for migrations. Your linked project uses **direct connection**:

- **Project ref:** `cpenurfjytetzlisjmgl`
- **API URL:** `https://cpenurfjytetzlisjmgl.supabase.co`
- **Direct DB:** `postgresql://postgres:[YOUR-PASSWORD]@db.cpenurfjytetzlisjmgl.supabase.co:5432/postgres`

## One-time setup

### 1. Install CLI (if needed)

```bash
brew install supabase/tap/supabase
```

### 2. Push migrations (choose one)

**Option A – Using DB URL (no login)**

Set your database password and push:

```bash
export SUPABASE_DB_PASSWORD='your-database-password'
supabase db push --db-url "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.cpenurfjytetzlisjmgl.supabase.co:5432/postgres"
```

Or use the script from repo root:

```bash
export SUPABASE_DB_PASSWORD='your-database-password'
./scripts/supabase-push.sh
```

**Option B – Using link (uses Supabase login)**

```bash
supabase login
supabase link --project-ref cpenurfjytetzlisjmgl --skip-pooler
# Enter your database password when prompted
supabase db push --linked
```

## App env vars

In `apps/shopify/.env.local` set:

- `SUPABASE_URL=https://cpenurfjytetzlisjmgl.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<from Dashboard → Settings → API → service_role>`

Get the **service_role** key from: [Supabase Dashboard](https://supabase.com/dashboard/project/cpenurfjytetzlisjmgl/settings/api) → API → Project API keys → `service_role` (Reveal).

## Migration order

Migrations run in filename order. Current order:

1. `001_init.sql`
2. `002_indexes.sql`
3. `003_variant_mapping.sql`
4. `004_seed_demo.sql` (optional demo data)
5. `005_csv_import_pipeline.sql`
6. `006_events_shop_domain.sql`

## If you get "no route to host" or connection refused (port 5432)

The direct DB host often uses **IPv6**. If your network has no IPv6, use one of these:

**Option 1 – Connection pooler (IPv4)**  
1. In [Supabase Dashboard](https://supabase.com/dashboard/project/cpenurfjytetzlisjmgl/settings/database) go to **Settings → Database**.  
2. Under **Connection string**, open **Connection pooling** and copy the **URI** (Transaction mode, port 6543).  
3. In `apps/shopify/.env.local` set:
   ```bash
   SUPABASE_DB_URL=postgres://postgres.cpenurfjytetzlisjmgl:[YOUR-PASSWORD]@aws-0-XX-XXXX-X.pooler.supabase.com:6543/postgres
   ```
   (Use the exact URI from the dashboard; replace the password if needed.)  
4. From repo root run: `./scripts/supabase-push.sh`

**Option 2 – Apply migrations in the SQL Editor**  
1. Open [SQL Editor](https://supabase.com/dashboard/project/cpenurfjytetzlisjmgl/sql/new).  
2. Run each file in this order (copy/paste full contents, run, then next):
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_indexes.sql`
   - `supabase/migrations/003_variant_mapping.sql`
   - `supabase/migrations/004_seed_demo.sql` (optional)
   - `supabase/migrations/005_csv_import_pipeline.sql`
   - `supabase/migrations/006_events_shop_domain.sql`

## Storage

Create the `garments` bucket in the Dashboard: **Storage → New bucket → name: `garments`** (public for V0.1 if you want).
