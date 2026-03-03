-- TSQA-016: Demo seed data (idempotent via ON CONFLICT)
-- Based on skuResponseTopFixture and skuResponseBottomFixture from packages/shared/src/fixtures.ts

WITH
-- 1. Demo brand
ins_brand AS (
  INSERT INTO brands (shop_domain)
  VALUES ('demo-shop.myshopify.com')
  ON CONFLICT (shop_domain) DO UPDATE SET shop_domain = EXCLUDED.shop_domain
  RETURNING id
),
-- 2. Demo product
ins_product AS (
  INSERT INTO products (brand_id, shopify_product_id, title)
  SELECT id, 'gid://shopify/Product/9000000001', 'Demo Tee'
  FROM ins_brand
  ON CONFLICT (brand_id, shopify_product_id) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
),
-- 3. Variant top M
ins_variant_top AS (
  INSERT INTO variants (product_id, brand_id, shopify_variant_id, size_label)
  SELECT ins_product.id, ins_brand.id, 'gid://shopify/ProductVariant/9000000001', 'M'
  FROM ins_product, ins_brand
  ON CONFLICT (brand_id, shopify_variant_id) DO UPDATE
    SET size_label = EXCLUDED.size_label, product_id = EXCLUDED.product_id
  RETURNING id
),
-- 4. Variant bottom M
ins_variant_bottom AS (
  INSERT INTO variants (product_id, brand_id, shopify_variant_id, size_label)
  SELECT ins_product.id, ins_brand.id, 'gid://shopify/ProductVariant/9000000002', 'M'
  FROM ins_product, ins_brand
  ON CONFLICT (brand_id, shopify_variant_id) DO UPDATE
    SET size_label = EXCLUDED.size_label, product_id = EXCLUDED.product_id
  RETURNING id
),
-- 5. Variant measurements for top (STRETCHY, top — from skuResponseTopFixture)
ins_meas_top AS (
  INSERT INTO variant_measurements (variant_id, measurements_cm, fabric_type, category)
  SELECT
    id,
    '{"shoulders": 42.0, "bust_chest": 92.0, "waist": 74.0, "sleeve_length": 62.0, "torso_length": 66.0}'::jsonb,
    'STRETCHY'::fabric_type,
    'top'::garment_category
  FROM ins_variant_top
  ON CONFLICT (variant_id) DO UPDATE SET
    measurements_cm = EXCLUDED.measurements_cm,
    fabric_type = EXCLUDED.fabric_type,
    category = EXCLUDED.category,
    updated_at = now()
),
-- 6. Variant measurements for bottom (MODERATE, bottom — from skuResponseBottomFixture)
ins_meas_bottom AS (
  INSERT INTO variant_measurements (variant_id, measurements_cm, fabric_type, category)
  SELECT
    id,
    '{"waist": 76.0, "hips": 96.0, "thigh": 56.0, "inseam": 76.0}'::jsonb,
    'MODERATE'::fabric_type,
    'bottom'::garment_category
  FROM ins_variant_bottom
  ON CONFLICT (variant_id) DO UPDATE SET
    measurements_cm = EXCLUDED.measurements_cm,
    fabric_type = EXCLUDED.fabric_type,
    category = EXCLUDED.category,
    updated_at = now()
),
-- 7. Variant asset for top (demo image URL)
ins_asset_top AS (
  INSERT INTO variant_assets (variant_id, image_url)
  SELECT id, 'https://example.com/images/sku-top-001.jpg'
  FROM ins_variant_top
)
SELECT 1;

-- 8. Verification: should return 2 rows with measurement data
SELECT v.shopify_variant_id, v.size_label, vm.fabric_type, vm.category, vm.measurements_cm
FROM variants v
JOIN variant_measurements vm ON vm.variant_id = v.id
WHERE v.shopify_variant_id IN ('gid://shopify/ProductVariant/9000000001', 'gid://shopify/ProductVariant/9000000002')
ORDER BY v.shopify_variant_id;
