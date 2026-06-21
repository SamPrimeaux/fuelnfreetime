-- Attribution visits + order attribution columns
-- Apply: npm run db:migrate:attribution

CREATE TABLE IF NOT EXISTS attribution_visits (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  campaign_id     TEXT,
  session_id      TEXT NOT NULL,
  landing_path    TEXT,
  referrer        TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  channel         TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attribution_visits_campaign
  ON attribution_visits(tenant_id, campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attribution_visits_session
  ON attribution_visits(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attribution_visits_utm
  ON attribution_visits(tenant_id, utm_campaign, utm_source, created_at DESC);

ALTER TABLE orders ADD COLUMN campaign_id TEXT;
ALTER TABLE orders ADD COLUMN utm_source TEXT;
ALTER TABLE orders ADD COLUMN utm_medium TEXT;
ALTER TABLE orders ADD COLUMN utm_campaign TEXT;
ALTER TABLE orders ADD COLUMN attribution_visit_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_campaign
  ON orders(campaign_id, created_at DESC);
