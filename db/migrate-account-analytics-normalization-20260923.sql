-- Fuel & Free Time account/auth/analytics normalization
-- 2026-09-23
-- Canonical application account_id is the real Cloudflare account id.
-- Removes tenant/workspace columns from auth_users + AgentSam analytics tables.

-- ---------------------------------------------------------------------------
-- 1) Rekey the canonical account without dropping the FK parent out from
--    underneath live children.
-- ---------------------------------------------------------------------------

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

-- Seed the Cloudflare resources that are authoritative for this deployment.
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

-- ---------------------------------------------------------------------------
-- 2) Rebuild auth_users/auth_sessions/account_memberships without tenant or
--    workspace identity columns.
-- ---------------------------------------------------------------------------

CREATE TABLE auth_users_v2 (
  id                      TEXT PRIMARY KEY,
  email                   TEXT UNIQUE NOT NULL,
  name                    TEXT,
  password_hash           TEXT NOT NULL,
  salt                    TEXT NOT NULL,
  created_at              TEXT DEFAULT (datetime('now')),
  updated_at              TEXT DEFAULT (datetime('now')),
  is_verified             INTEGER NOT NULL DEFAULT 0,
  verified_at             INTEGER,
  status                  TEXT DEFAULT 'active',
  display_name            TEXT,
  avatar_url              TEXT,
  last_login_at           INTEGER,
  login_count             INTEGER DEFAULT 0,
  phone                    TEXT,
  mfa_enabled             INTEGER DEFAULT 0,
  timezone                TEXT DEFAULT 'America/Chicago',
  role                    TEXT NOT NULL DEFAULT 'member',
  account_type            TEXT NOT NULL DEFAULT 'human',
  iam_owned               INTEGER NOT NULL DEFAULT 0,
  downgrade_protected     INTEGER NOT NULL DEFAULT 0,
  notification_email      TEXT,
  plan                    TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id      TEXT,
  meta_json               TEXT NOT NULL DEFAULT '{}',
  default_account_id      TEXT REFERENCES accounts(id)
);

INSERT INTO auth_users_v2 (
  id, email, name, password_hash, salt, created_at, updated_at,
  is_verified, verified_at, status, display_name, avatar_url,
  last_login_at, login_count, phone, mfa_enabled, timezone,
  role, account_type, iam_owned, downgrade_protected,
  notification_email, plan, stripe_customer_id, meta_json,
  default_account_id
)
SELECT
  id, email, name, password_hash, salt, created_at, updated_at,
  is_verified, verified_at, status, display_name, avatar_url,
  last_login_at, login_count, phone, mfa_enabled, timezone,
  role, account_type, iam_owned, downgrade_protected,
  notification_email, plan, stripe_customer_id, meta_json,
  default_account_id
FROM auth_users;

CREATE TABLE auth_sessions_v2 (
  token_hash        TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES auth_users_v2(id) ON DELETE CASCADE,
  active_account_id TEXT REFERENCES accounts(id),
  expires_at        TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO auth_sessions_v2 (
  token_hash, user_id, active_account_id, expires_at, created_at
)
SELECT token_hash, user_id, active_account_id, expires_at, created_at
FROM auth_sessions;

CREATE TABLE account_memberships_v2 (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES auth_users_v2(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','admin','member','viewer')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (account_id, user_id)
);

INSERT INTO account_memberships_v2 (account_id, user_id, role, created_at)
SELECT account_id, user_id, role, created_at
FROM account_memberships;

DROP TABLE account_memberships;
DROP TABLE auth_sessions;
DROP TABLE auth_users;

ALTER TABLE auth_users_v2 RENAME TO auth_users;
ALTER TABLE auth_sessions_v2 RENAME TO auth_sessions;
ALTER TABLE account_memberships_v2 RENAME TO account_memberships;

CREATE INDEX idx_auth_users_account_status
  ON auth_users(default_account_id, status);
CREATE INDEX idx_auth_users_email
  ON auth_users(email);
CREATE INDEX idx_auth_sessions_user
  ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_account
  ON auth_sessions(active_account_id);

-- ---------------------------------------------------------------------------
-- 3) Rebuild the raw AgentSam/application analytics ledger around account_id.
-- ---------------------------------------------------------------------------

CREATE TABLE agentsam_analytics_v2 (
  id TEXT PRIMARY KEY DEFAULT ('evt_' || lower(hex(randomblob(12)))),

  account_id TEXT NOT NULL REFERENCES accounts(id),

  event_type TEXT NOT NULL CHECK(event_type IN (
    'chat',
    'routing',
    'ai_model',
    'workflow',
    'mcp',
    'github',
    'image',
    'email',
    'content',
    'approval',
    'ui',
    'error',
    'system',
    'product',
    'variant',
    'inventory',
    'catalog',
    'order',
    'fulfillment',
    'customer',
    'subscriber',
    'campaign',
    'promotion',
    'discount',
    'conversion',
    'checkout',
    'cart',
    'search',
    'media',
    'cms',
    'webhook',
    'integration',
    'deployment',
    'security',
    'cloudflare',
    'performance',
    'traffic',
    'payment',
    'refund',
    'shipping'
  )),

  event_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK(status IN (
    'success',
    'started',
    'failed',
    'blocked',
    'fallback',
    'cancelled',
    'approval_required'
  )),

  source TEXT NOT NULL DEFAULT 'admin_agentsam',
  environment TEXT NOT NULL DEFAULT 'production',

  session_id TEXT,
  conversation_id TEXT,
  message_id TEXT,
  run_id TEXT,

  workflow_id TEXT,
  workflow_key TEXT,
  workflow_run_id TEXT,

  user_id TEXT,
  admin_user_id TEXT,
  user_email TEXT,

  intent TEXT,
  route_lane TEXT,
  task_type TEXT,
  selected_mode TEXT,

  provider TEXT,
  model_id TEXT,
  model_lane TEXT,
  fallback_used INTEGER NOT NULL DEFAULT 0 CHECK(fallback_used IN (0,1)),
  fallback_attempt_index INTEGER DEFAULT 0,
  attempted_models_json TEXT NOT NULL DEFAULT '[]',

  mcp_server TEXT,
  mcp_tool TEXT,
  mcp_success INTEGER CHECK(mcp_success IN (0,1)),
  mcp_latency_ms INTEGER,

  github_repo TEXT,
  github_branch TEXT,
  github_operation TEXT,

  channel TEXT,
  campaign_id TEXT,
  product_id TEXT,
  variant_id TEXT,
  order_id TEXT,
  customer_id TEXT,
  integration_key TEXT,
  operation TEXT,

  entity_type TEXT,
  entity_id TEXT,
  entity_label TEXT,

  input_chars INTEGER DEFAULT 0,
  output_chars INTEGER DEFAULT 0,
  prompt_preview TEXT,
  prompt_hash TEXT,
  response_preview TEXT,
  response_hash TEXT,

  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,

  duration_ms INTEGER,
  ai_latency_ms INTEGER,
  routing_latency_ms INTEGER,
  total_latency_ms INTEGER,

  quality_score REAL,
  user_feedback TEXT CHECK(user_feedback IN (
    'positive',
    'negative',
    'neutral'
  )),

  error_code TEXT,
  error_message TEXT,
  error_stage TEXT,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  date_key TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d','now')),
  hour_key TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H','now')),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO agentsam_analytics_v2 (
  id, account_id,
  event_type, event_name, status, source, environment,
  session_id, conversation_id, message_id, run_id,
  workflow_id, workflow_key, workflow_run_id,
  user_id, admin_user_id, user_email,
  intent, route_lane, task_type, selected_mode,
  provider, model_id, model_lane, fallback_used, fallback_attempt_index, attempted_models_json,
  mcp_server, mcp_tool, mcp_success, mcp_latency_ms,
  github_repo, github_branch, github_operation,
  channel, campaign_id, product_id, variant_id, order_id, customer_id, integration_key, operation,
  entity_type, entity_id, entity_label,
  input_chars, output_chars, prompt_preview, prompt_hash, response_preview, response_hash,
  input_tokens, output_tokens, total_tokens, estimated_cost_usd,
  duration_ms, ai_latency_ms, routing_latency_ms, total_latency_ms,
  quality_score, user_feedback,
  error_code, error_message, error_stage,
  metadata_json, date_key, hour_key, created_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2',
  event_type, event_name, status, source, environment,
  session_id, conversation_id, message_id, run_id,
  workflow_id, workflow_key, workflow_run_id,
  user_id, admin_user_id, user_email,
  intent, route_lane, task_type, selected_mode,
  provider, model_id, model_lane, fallback_used, fallback_attempt_index, attempted_models_json,
  mcp_server, mcp_tool, mcp_success, mcp_latency_ms,
  github_repo, github_branch, github_operation,
  channel, campaign_id, product_id, variant_id, order_id, customer_id, integration_key, operation,
  entity_type, entity_id, entity_label,
  input_chars, output_chars, prompt_preview, prompt_hash, response_preview, response_hash,
  input_tokens, output_tokens, total_tokens, estimated_cost_usd,
  duration_ms, ai_latency_ms, routing_latency_ms, total_latency_ms,
  quality_score, user_feedback,
  error_code, error_message, error_stage,
  metadata_json, date_key, hour_key, created_at, created_at_unix
FROM agentsam_analytics;

DROP TABLE agentsam_analytics;
ALTER TABLE agentsam_analytics_v2 RENAME TO agentsam_analytics;

CREATE INDEX idx_agentsam_analytics_account_date
  ON agentsam_analytics(account_id, date_key, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_event
  ON agentsam_analytics(account_id, event_type, event_name, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_workflow
  ON agentsam_analytics(account_id, workflow_key, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_model
  ON agentsam_analytics(account_id, model_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_session
  ON agentsam_analytics(account_id, session_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_status
  ON agentsam_analytics(account_id, status, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_entity
  ON agentsam_analytics(account_id, entity_type, entity_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_product
  ON agentsam_analytics(account_id, product_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_campaign
  ON agentsam_analytics(account_id, campaign_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_analytics_order
  ON agentsam_analytics(account_id, order_id, created_at_unix DESC);

-- ---------------------------------------------------------------------------
-- 4) Rebuild the daily analytics rollup around account_id.
-- ---------------------------------------------------------------------------

CREATE TABLE agentsam_analytics_daily_v2 (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  date_key TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '_all',
  event_name TEXT NOT NULL DEFAULT '_all',
  workflow_key TEXT NOT NULL DEFAULT '_all',
  task_type TEXT NOT NULL DEFAULT '_all',
  model_id TEXT NOT NULL DEFAULT '_all',
  provider TEXT NOT NULL DEFAULT '_all',
  channel TEXT NOT NULL DEFAULT '_all',
  campaign_id TEXT NOT NULL DEFAULT '_all',
  product_id TEXT NOT NULL DEFAULT '_all',
  event_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  started_count INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_estimated_cost_usd REAL NOT NULL DEFAULT 0,
  avg_duration_ms REAL NOT NULL DEFAULT 0,
  avg_ai_latency_ms REAL NOT NULL DEFAULT 0,
  compacted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(
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
  )
);

INSERT INTO agentsam_analytics_daily_v2 (
  id, account_id, date_key,
  event_type, event_name, workflow_key, task_type, model_id,
  provider, channel, campaign_id, product_id,
  event_count, success_count, failed_count, started_count, fallback_count,
  total_input_tokens, total_output_tokens, total_estimated_cost_usd,
  avg_duration_ms, avg_ai_latency_ms, compacted_at
)
SELECT
  id,
  'ede6590ac0d2fb7daf155b35653457b2',
  date_key,
  event_type,
  event_name,
  workflow_key,
  task_type,
  model_id,
  provider,
  channel,
  campaign_id,
  product_id,
  event_count,
  success_count,
  failed_count,
  started_count,
  fallback_count,
  total_input_tokens,
  total_output_tokens,
  total_estimated_cost_usd,
  avg_duration_ms,
  avg_ai_latency_ms,
  compacted_at
FROM agentsam_analytics_daily;

DROP TABLE agentsam_analytics_daily;
ALTER TABLE agentsam_analytics_daily_v2 RENAME TO agentsam_analytics_daily;

CREATE INDEX idx_agentsam_analytics_daily_date
  ON agentsam_analytics_daily(account_id, date_key DESC);
CREATE INDEX idx_agentsam_analytics_daily_event
  ON agentsam_analytics_daily(account_id, event_type, date_key DESC);
CREATE INDEX idx_agentsam_analytics_daily_product
  ON agentsam_analytics_daily(account_id, product_id, date_key DESC);
CREATE INDEX idx_agentsam_analytics_daily_campaign
  ON agentsam_analytics_daily(account_id, campaign_id, date_key DESC);

PRAGMA foreign_key_check;
