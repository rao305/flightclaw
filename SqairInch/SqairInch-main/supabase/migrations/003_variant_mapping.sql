-- TSQA-017: Variant mapping strategy — composite unique key (brand_id, shopify_variant_id)

-- Step 1: Add brand_id FK column (idempotent)
ALTER TABLE variants ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

-- Step 2: Backfill brand_id from products
UPDATE variants v
SET brand_id = p.brand_id
FROM products p
WHERE p.id = v.product_id
  AND v.brand_id IS NULL;

-- Step 3: Enforce NOT NULL now that all rows are populated
ALTER TABLE variants ALTER COLUMN brand_id SET NOT NULL;

-- Step 4: Drop old global unique index
DROP INDEX IF EXISTS idx_variants_shopify_variant_id;

-- Step 5: Drop old global unique constraint from 001_init.sql
ALTER TABLE variants DROP CONSTRAINT IF EXISTS variants_shopify_variant_id_key;

-- Step 6: Add named composite unique constraint
ALTER TABLE variants ADD CONSTRAINT uq_variants_brand_variant UNIQUE (brand_id, shopify_variant_id);

-- Step 7: Explicit composite unique index (covers SKU endpoint hot path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_brand_shopify_variant ON variants(brand_id, shopify_variant_id);
