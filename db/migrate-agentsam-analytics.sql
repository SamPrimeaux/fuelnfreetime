-- AgentSam + commerce event ledger (not a transcript store)
-- Canonical ownership: account_id. Fuel & Free Time does not use tenant/workspace
-- parameters for this ledger.
-- Run: npm run db:migrate:agentsam-analytics

CREATE TABLE IF NOT EXISTS agentsam_analytics (
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

CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_account_date
  ON agentsam_analytics(account_id, date_key, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_event
  ON agentsam_analytics(account_id, event_type, event_name, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_workflow
  ON agentsam_analytics(account_id, workflow_key, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_model
  ON agentsam_analytics(account_id, model_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_session
  ON agentsam_analytics(account_id, session_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_status
  ON agentsam_analytics(account_id, status, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_entity
  ON agentsam_analytics(account_id, entity_type, entity_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_product
  ON agentsam_analytics(account_id, product_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_campaign
  ON agentsam_analytics(account_id, campaign_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_order
  ON agentsam_analytics(account_id, order_id, created_at_unix DESC);
