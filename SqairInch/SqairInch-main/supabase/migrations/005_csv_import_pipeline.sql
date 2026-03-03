-- Migration 005: CSV Import Pipeline
-- Part A: Add source column to variant_assets

ALTER TABLE variant_assets
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_variant_assets_source
  ON variant_assets(variant_id, source);

-- Part B: csv_import_jobs staging/audit table

DO $$ BEGIN
  CREATE TYPE csv_import_status AS ENUM ('pending', 'applied', 'expired', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS csv_import_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain   TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  status        csv_import_status NOT NULL DEFAULT 'pending',
  total_rows    INTEGER NOT NULL DEFAULT 0,
  valid_count   INTEGER NOT NULL DEFAULT 0,
  error_count   INTEGER NOT NULL DEFAULT 0,
  valid_rows    JSONB NOT NULL DEFAULT '[]',   -- CsvRowValidated[] (includes image_url)
  error_rows    JSONB NOT NULL DEFAULT '[]',   -- CsvRowError[]
  applied_at    TIMESTAMPTZ,
  failed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_shop
  ON csv_import_jobs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_expires
  ON csv_import_jobs(expires_at) WHERE status = 'pending';

-- Part C: bulk_upsert_csv_import PL/pgSQL RPC

CREATE OR REPLACE FUNCTION bulk_upsert_csv_import(
  p_job_id      UUID,
  p_shop_domain TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job        RECORD;
  v_brand_id   UUID;
  v_product_id UUID;
  v_variant_id UUID;
  v_row        JSONB;
  v_applied    INTEGER := 0;
BEGIN
  -- Lock job row to prevent double-confirm race
  SELECT * INTO v_job FROM csv_import_jobs
  WHERE id = p_job_id AND shop_domain = p_shop_domain FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found or shop mismatch: %', p_job_id;
  END IF;
  IF v_job.status != 'pending' THEN
    RAISE EXCEPTION 'Job % is not pending (status=%)', p_job_id, v_job.status;
  END IF;
  IF v_job.expires_at < now() THEN
    UPDATE csv_import_jobs SET status = 'expired' WHERE id = p_job_id;
    RAISE EXCEPTION 'Job % has expired', p_job_id;
  END IF;

  -- Brand lookup (multi-tenant isolation)
  SELECT id INTO v_brand_id FROM brands WHERE shop_domain = p_shop_domain;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand not found for shop: %', p_shop_domain;
  END IF;

  -- Process each valid row atomically
  FOR v_row IN SELECT * FROM jsonb_array_elements(v_job.valid_rows) LOOP

    -- Upsert product
    INSERT INTO products (brand_id, shopify_product_id)
    VALUES (v_brand_id, v_row->>'shopify_product_id')
    ON CONFLICT (brand_id, shopify_product_id) DO NOTHING
    RETURNING id INTO v_product_id;

    IF v_product_id IS NULL THEN
      SELECT id INTO v_product_id FROM products
      WHERE brand_id = v_brand_id
        AND shopify_product_id = v_row->>'shopify_product_id';
    END IF;

    -- Upsert variant
    INSERT INTO variants (product_id, brand_id, shopify_variant_id, size_label)
    VALUES (v_product_id, v_brand_id, v_row->>'shopify_variant_id', v_row->>'size_label')
    ON CONFLICT (brand_id, shopify_variant_id) DO UPDATE SET
      size_label = EXCLUDED.size_label,
      product_id = EXCLUDED.product_id
    RETURNING id INTO v_variant_id;

    IF v_variant_id IS NULL THEN
      SELECT id INTO v_variant_id FROM variants
      WHERE brand_id = v_brand_id
        AND shopify_variant_id = v_row->>'shopify_variant_id';
    END IF;

    -- Upsert variant_measurements (convert _cm columns → zone keys)
    INSERT INTO variant_measurements
      (variant_id, measurements_cm, fabric_type, category, updated_at)
    VALUES (
      v_variant_id,
      jsonb_strip_nulls(jsonb_build_object(
        'waist',         (v_row->>'waist_cm')::numeric,
        'hips',          (v_row->>'hips_cm')::numeric,
        'bust_chest',    (v_row->>'bust_chest_cm')::numeric,
        'torso_length',  (v_row->>'torso_length_cm')::numeric,
        'inseam',        (v_row->>'inseam_cm')::numeric,
        'sleeve_length', (v_row->>'sleeve_length_cm')::numeric
      )),
      (v_row->>'fabric_type')::fabric_type,
      (v_row->>'category')::garment_category,
      now()
    )
    ON CONFLICT (variant_id) DO UPDATE SET
      measurements_cm = EXCLUDED.measurements_cm,
      fabric_type     = EXCLUDED.fabric_type,
      category        = EXCLUDED.category,
      updated_at      = EXCLUDED.updated_at;

    -- Upsert variant_assets (optional image_url, csv_import source only)
    IF (v_row->>'image_url') IS NOT NULL AND (v_row->>'image_url') != '' THEN
      DELETE FROM variant_assets
      WHERE variant_id = v_variant_id AND source = 'csv_import';
      INSERT INTO variant_assets (variant_id, image_url, source)
      VALUES (v_variant_id, v_row->>'image_url', 'csv_import');
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  -- Mark job applied
  UPDATE csv_import_jobs SET status = 'applied', applied_at = now() WHERE id = p_job_id;

  RETURN jsonb_build_object('applied', v_applied, 'job_id', p_job_id);

EXCEPTION WHEN OTHERS THEN
  UPDATE csv_import_jobs SET status = 'failed', failed_reason = SQLERRM WHERE id = p_job_id;
  RAISE;
END;
$$;
