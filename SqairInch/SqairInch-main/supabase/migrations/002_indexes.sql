-- TSQA-016: Performance indexes for Sqairinch schema

-- Auth / tenant isolation
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_shop_domain ON brands(shop_domain);

-- Product lookup by shop
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_brand_shopify_product ON products(brand_id, shopify_product_id);

-- Variant hot path (SKU endpoint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_shopify_variant_id ON variants(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);

-- Measurements/assets for variant
CREATE INDEX IF NOT EXISTS idx_variant_measurements_variant_id ON variant_measurements(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_assets_variant_id ON variant_assets(variant_id);

-- Avatar by session
CREATE INDEX IF NOT EXISTS idx_avatars_session_id ON avatars(session_id);

-- Tryon lookups
CREATE INDEX IF NOT EXISTS idx_tryons_avatar_id ON tryons(avatar_id);
CREATE INDEX IF NOT EXISTS idx_tryons_variant_id ON tryons(variant_id);

-- Event queries (analytics)
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_ts_desc ON events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_events_shopify_variant_id ON events(shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;
