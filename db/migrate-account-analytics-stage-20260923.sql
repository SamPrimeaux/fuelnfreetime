-- Fuel & Free Time account/analytics compatibility stage
-- 2026-09-23
--
-- Safe to apply before the Worker cutover. It preserves the legacy columns used
-- by the currently deployed Worker while introducing canonical account_id and
-- the commerce analytics dimensions required by the replacement runtime.

-- 1) Canonical account identity = real Cloudflare account id.
INSERT INTO accounts (id, account_key, display_name, status, created_at, updated_at)
SELECT
  'ede6590ac0d2fb7daf155b35653457b2',
  account_key,
  display_name,
  status,
  created_at,
  unixepoch()
FROM accounts
WHERE account_key = 'fuelnfreetime'
ON CONFLICT(id) DO NOTHING;

UPDATE account_memberships
SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE account_id = 'acct_fuelnfreetime';

UPDATE auth_users
SET default_account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE default_account_id IS NULL
   OR default_account_id = 'acct_fuelnfreetime';

UPDATE auth_sessions
SET active_account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE active_account_id IS NULL
   OR active_account_id = 'acct_fuelnfreetime';

UPDATE agentsam_tools
SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE account_id = 'acct_fuelnfreetime';

UPDATE user_oauth_tokens
SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE account_id = 'acct_fuelnfreetime';

UPDATE account_cloudflare_resources
SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE account_id = 'acct_fuelnfreetime';

DELETE FROM accounts
WHERE id = 'acct_fuelnfreetime';

-- 2) Register the Cloudflare resources that make up the FNF deployment.
INSERT OR IGNORE INTO account_cloudflare_resources (
  id, account_id, resource_type, resource_id, resource_name, zone_id, metadata_json
) VALUES
  (
    'cfr_zone_fuelnfreetime',
    'ede6590ac0d2fb7daf155b35653457b2',
    'zone',
    '816a5d2284103e4481987ceeb16c2ca9',
    'fuelnfreetime.com',
    '816a5d2284103e4481987ceeb16c2ca9',
    '{"source":"migration","canonical":true}'
  ),
  (
    'cfr_d1_fuelnfreetime',
    'ede6590ac0d2fb7daf155b35653457b2',
    'd1_database',
    '9fd6ff92-e407-4b51-8b01-3c93f3845bb2',
    'fuelnfreetime',
    NULL,
    '{"binding":"DB","source":"migration"}'
  ),
  (
    'cfr_worker_fuelnfreetime',
    'ede6590ac0d2fb7daf155b35653457b2',
    'worker',
    'fuelnfreetime',
    'fuelnfreetime',
    '816a5d2284103e4481987ceeb16c2ca9',
    '{"source":"wrangler.toml"}'
  ),
  (
    'cfr_r2_fuelnfreetime',
    'ede6590ac0d2fb7daf155b35653457b2',
    'r2_bucket',
    'fuelnfreetime',
    'fuelnfreetime',
    NULL,
    '{"binding":"WEBSITE_ASSETS","source":"wrangler.toml"}'
  ),
  (
    'cfr_kv_cms_cache',
    'ede6590ac0d2fb7daf155b35653457b2',
    'kv_namespace',
    'bc3b4e3f272e4b46b3c92df6dff85bff',
    'CMS_CACHE',
    NULL,
    '{"binding":"CMS_CACHE","source":"wrangler.toml"}'
  ),
  (
    'cfr_vectorize_fnf',
    'ede6590ac0d2fb7daf155b35653457b2',
    'vectorize_index',
    'fnf-agentsam-bge-m3-1024',
    'fnf-agentsam-bge-m3-1024',
    NULL,
    '{"binding":"FNF_VECTORIZE","source":"wrangler.toml"}'
  );

-- 3) Add account ownership + commerce dimensions to the hot event ledger.
-- Legacy tenant/workspace columns intentionally remain during this stage.
ALTER TABLE agentsam_analytics
  ADD COLUMN account_id TEXT REFERENCES accounts(id);
ALTER TABLE agentsam_analytics
  ADD COLUMN channel TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN campaign_id TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN product_id TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN variant_id TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN order_id TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN customer_id TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN integration_key TEXT;
ALTER TABLE agentsam_analytics
  ADD COLUMN operation TEXT;

UPDATE agentsam_analytics
SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_account_date_stage
  ON agentsam_analytics(account_id, date_key, created_at_unix DESC);

CREATE TRIGGER IF NOT EXISTS trg_agentsam_analytics_account_fill
AFTER INSERT ON agentsam_analytics
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_analytics
  SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
  WHERE id = NEW.id;
END;

-- 4) Add the replacement daily rollup dimensions while preserving the current
-- workspace unique constraint until the Worker cutover is complete.
ALTER TABLE agentsam_analytics_daily
  ADD COLUMN account_id TEXT REFERENCES accounts(id);
ALTER TABLE agentsam_analytics_daily
  ADD COLUMN provider TEXT NOT NULL DEFAULT '_all';
ALTER TABLE agentsam_analytics_daily
  ADD COLUMN channel TEXT NOT NULL DEFAULT '_all';
ALTER TABLE agentsam_analytics_daily
  ADD COLUMN campaign_id TEXT NOT NULL DEFAULT '_all';
ALTER TABLE agentsam_analytics_daily
  ADD COLUMN product_id TEXT NOT NULL DEFAULT '_all';

UPDATE agentsam_analytics_daily
SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
WHERE account_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_agentsam_analytics_daily_account_dims_stage
  ON agentsam_analytics_daily(
    account_id,
    date_key,
    event_type,
    event_name,
    workflow_key,
    task_type,
    model_id,
    provider,
    channel,
    campaign_id,
    product_id
  );

CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_daily_account_date_stage
  ON agentsam_analytics_daily(account_id, date_key DESC);

CREATE TRIGGER IF NOT EXISTS trg_agentsam_analytics_daily_account_fill
AFTER INSERT ON agentsam_analytics_daily
WHEN NEW.account_id IS NULL
BEGIN
  UPDATE agentsam_analytics_daily
  SET account_id = 'ede6590ac0d2fb7daf155b35653457b2'
  WHERE id = NEW.id;
END;

PRAGMA foreign_key_check;
