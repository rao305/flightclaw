-- TSQA-025: add shop_domain to events for tenant-scoped analytics queries
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS shop_domain TEXT NOT NULL DEFAULT '';

-- Index for per-shop time-series queries
CREATE INDEX IF NOT EXISTS idx_events_shop_domain
  ON events (shop_domain, ts DESC);
