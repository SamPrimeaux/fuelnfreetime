-- Agent Sam platform tables — aligned with inneranimalmedia IAM schema
-- Run: npm run db:migrate:agentsam-platform
--
-- Includes: agentsam_mcp_workflows (minimal FK target), agentsam_skill (IAM parity + slug),
-- agentsam_skill_file, agentsam_hook, agentsam_webhooks, agentsam_webhook_events

PRAGMA foreign_keys = OFF;

-- ── Minimal workflow registry (hooks FK target) ───────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_mcp_workflows (
  id           TEXT PRIMARY KEY,
  workflow_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'ready',
  tenant_id    TEXT NOT NULL,
  workspace_id TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── agentsam_skill (IAM parity + slug for FNF API) ───────────────────────────

DROP TABLE IF EXISTS agentsam_skill_file;
DROP TABLE IF EXISTS agentsam_skill;

CREATE TABLE agentsam_skill (
  id                     TEXT PRIMARY KEY,
  tenant_id              TEXT NOT NULL,
  user_id                TEXT NOT NULL,
  person_uuid            TEXT,
  workspace_id           TEXT,
  slug                   TEXT UNIQUE,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  content_markdown       TEXT NOT NULL DEFAULT '',
  file_path              TEXT NOT NULL DEFAULT '',
  scope                  TEXT NOT NULL DEFAULT 'tenant'
                         CHECK (scope IN ('user','workspace','tenant','global')),
  slash_trigger          TEXT,
  globs                  TEXT NOT NULL DEFAULT '[]',
  always_apply           INTEGER NOT NULL DEFAULT 0,
  task_types_json        TEXT NOT NULL DEFAULT '[]',
  route_keys_json        TEXT NOT NULL DEFAULT '[]',
  default_model_key      TEXT,
  model_constraints_json TEXT NOT NULL DEFAULT '{}',
  access_mode            TEXT NOT NULL DEFAULT 'read_write'
                         CHECK (access_mode IN ('read_only','read_write')),
  icon                   TEXT NOT NULL DEFAULT '',
  tags_json              TEXT NOT NULL DEFAULT '[]',
  metadata_json          TEXT NOT NULL DEFAULT '{}',
  token_estimate         INTEGER NOT NULL DEFAULT 0,
  invocation_count       INTEGER NOT NULL DEFAULT 0,
  last_invoked_at        TEXT,
  version                INTEGER NOT NULL DEFAULT 1,
  is_active              INTEGER NOT NULL DEFAULT 1,
  sort_order             INTEGER NOT NULL DEFAULT 0,
  retrieval_strategy     TEXT NOT NULL DEFAULT 'r2'
                         CHECK (retrieval_strategy IN ('db','r2','vectorize','none')),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_tenant_active
  ON agentsam_skill(tenant_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_slug
  ON agentsam_skill(slug);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_workspace
  ON agentsam_skill(workspace_id);

-- Companion markdown files (references/*.md)
CREATE TABLE agentsam_skill_file (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id    TEXT NOT NULL REFERENCES agentsam_skill(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'reference',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_file_skill
  ON agentsam_skill_file(skill_id, sort_order);

-- ── agentsam_hook ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_hook (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT,
  workspace_id    TEXT,
  user_id         TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'system',
  external_id     TEXT,
  trigger         TEXT NOT NULL
                  CHECK (trigger IN (
                    'start','stop','pre_deploy','post_deploy',
                    'pre_commit','error','imessage_reply','email_reply'
                  )),
  command         TEXT NOT NULL DEFAULT '',
  target_id       TEXT NOT NULL DEFAULT '',
  metadata        TEXT DEFAULT '{}',
  is_active       INTEGER NOT NULL DEFAULT 1,
  run_count       INTEGER DEFAULT 0,
  last_run_at     TEXT,
  workflow_id     TEXT REFERENCES agentsam_mcp_workflows(id) ON DELETE SET NULL,
  subagent_slug   TEXT,
  person_uuid     TEXT,
  event_type      TEXT,
  hook_key        TEXT,
  handler_type    TEXT DEFAULT 'log_only',
  handler_config  TEXT DEFAULT '{}',
  priority        INTEGER DEFAULT 100,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_hook_user_ws
  ON agentsam_hook(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_agentsam_hook_trigger
  ON agentsam_hook(trigger, is_active);

CREATE INDEX IF NOT EXISTS idx_agentsam_hook_tenant
  ON agentsam_hook(tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_hook_key_unique
  ON agentsam_hook(tenant_id, hook_key)
  WHERE hook_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentsam_hook_event_type_active
  ON agentsam_hook(tenant_id, event_type, is_active)
  WHERE is_active = 1;

-- ── agentsam_webhooks ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_webhooks (
  id                  TEXT PRIMARY KEY DEFAULT ('awh_' || lower(hex(randomblob(6)))),
  tenant_id           TEXT,
  workspace_id        TEXT,
  user_id             TEXT,
  provider            TEXT NOT NULL CHECK (provider IN (
    'github','stripe','cursor','cloudflare','resend',
    'supabase','vercel','openai','anthropic','google',
    'notion','figma','custom','internal'
  )),
  provider_webhook_id TEXT,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  endpoint_url        TEXT NOT NULL,
  signature_header    TEXT DEFAULT 'X-Hub-Signature-256',
  signature_algo      TEXT DEFAULT 'sha256',
  is_active           INTEGER DEFAULT 1,
  allowed_events      TEXT,
  workflow_key        TEXT,
  metadata_json       TEXT DEFAULT '{}',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhooks_provider
  ON agentsam_webhooks(provider, is_active);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhooks_tenant
  ON agentsam_webhooks(tenant_id);

-- ── agentsam_webhook_events ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_webhook_events (
  id                  TEXT PRIMARY KEY DEFAULT ('whe_' || lower(hex(randomblob(8)))),
  tenant_id           TEXT NOT NULL,
  workspace_id        TEXT,
  endpoint_id         TEXT,
  provider            TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  event_id            TEXT,
  payload_json        TEXT,
  headers_json        TEXT,
  metadata_json       TEXT DEFAULT '{}',
  status              TEXT CHECK (status IN ('received','processing','processed','failed','ignored'))
                      DEFAULT 'received',
  retry_count         INTEGER DEFAULT 0,
  input_tokens        INTEGER DEFAULT 0,
  output_tokens       INTEGER DEFAULT 0,
  cost_usd            REAL DEFAULT 0,
  total_tokens        INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) VIRTUAL,
  error_message       TEXT,
  processing_error    TEXT,
  received_at_unix    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  processed_at_unix   INTEGER,
  signature_valid     INTEGER DEFAULT 1,
  ip_address          TEXT,
  workflow_run_id     TEXT
);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_tenant
  ON agentsam_webhook_events(tenant_id, received_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_endpoint
  ON agentsam_webhook_events(endpoint_id, status);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_provider_event
  ON agentsam_webhook_events(provider, event_type, event_id);

PRAGMA foreign_keys = ON;
