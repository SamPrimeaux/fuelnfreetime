-- Fuel & Free Time webhook/hook normalization — additive compatibility stage
-- 2026-09-23
-- This stage is deliberately non-destructive so the currently deployed Worker
-- and the canonical webhook runtime can both operate during the cutover.

PRAGMA foreign_keys = ON;

-- Canonical webhook registry fields.
ALTER TABLE agentsam_webhooks ADD COLUMN plugin_id TEXT;
ALTER TABLE agentsam_webhooks ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK(status IN ('active','disabled','pending','error','retired'));
ALTER TABLE agentsam_webhooks ADD COLUMN provider_resource_type TEXT;
ALTER TABLE agentsam_webhooks ADD COLUMN provider_resource_id TEXT;
ALTER TABLE agentsam_webhooks ADD COLUMN events_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE agentsam_webhooks ADD COLUMN secret_ref TEXT;
ALTER TABLE agentsam_webhooks ADD COLUMN last_event_at_unix INTEGER;
ALTER TABLE agentsam_webhooks ADD COLUMN last_verified_at_unix INTEGER;
ALTER TABLE agentsam_webhooks ADD COLUMN created_at_unix INTEGER;
ALTER TABLE agentsam_webhooks ADD COLUMN updated_at_unix INTEGER;

UPDATE agentsam_webhooks
SET
  status = CASE WHEN COALESCE(is_active, 0) = 1 THEN 'active' ELSE 'disabled' END,
  events_json = CASE
    WHEN allowed_events IS NULL OR trim(allowed_events) = '' THEN '[]'
    ELSE '["' || replace(allowed_events, ',', '","') || '"]'
  END,
  secret_ref = COALESCE(secret_ref, json_extract(metadata_json, '$.secret_name')),
  created_at_unix = COALESCE(created_at_unix, CAST(strftime('%s', created_at) AS INTEGER), unixepoch()),
  updated_at_unix = COALESCE(updated_at_unix, CAST(strftime('%s', updated_at) AS INTEGER), unixepoch());

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_webhooks_account_slug_v3
  ON agentsam_webhooks(account_id, slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_webhooks_account_provider_external_v3
  ON agentsam_webhooks(account_id, provider, provider_webhook_id);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhooks_account_provider_status_v3
  ON agentsam_webhooks(account_id, provider, status);

-- Canonical ingress/event fields. Old endpoint_id/event_id columns remain during
-- stage so the pre-cutover Worker can still write safely.
ALTER TABLE agentsam_webhook_events ADD COLUMN webhook_id TEXT;
ALTER TABLE agentsam_webhook_events ADD COLUMN provider_event_id TEXT;
ALTER TABLE agentsam_webhook_events ADD COLUMN provider_object_id TEXT;
ALTER TABLE agentsam_webhook_events ADD COLUMN dedupe_key TEXT;
ALTER TABLE agentsam_webhook_events ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agentsam_webhook_events ADD COLUMN error_code TEXT;
ALTER TABLE agentsam_webhook_events ADD COLUMN provider_created_at_unix INTEGER;
ALTER TABLE agentsam_webhook_events ADD COLUMN processing_started_at_unix INTEGER;
ALTER TABLE agentsam_webhook_events ADD COLUMN payload_expires_at_unix INTEGER;
ALTER TABLE agentsam_webhook_events ADD COLUMN expires_at_unix INTEGER;

UPDATE agentsam_webhook_events
SET
  webhook_id = COALESCE(webhook_id, endpoint_id),
  provider_object_id = COALESCE(provider_object_id, event_id),
  attempt_count = CASE
    WHEN attempt_count = 0 THEN COALESCE(retry_count, 0) + 1
    ELSE attempt_count
  END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_webhook_events_dedupe_v3
  ON agentsam_webhook_events(account_id, provider, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_webhook_received_v3
  ON agentsam_webhook_events(webhook_id, received_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_provider_type_received_v3
  ON agentsam_webhook_events(account_id, provider, event_type, received_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_status_received_v3
  ON agentsam_webhook_events(account_id, status, received_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_webhook_events_expiry_v3
  ON agentsam_webhook_events(expires_at_unix);

-- Execution receipts did not previously exist in FNF. Add the canonical ledger
-- now so hook execution can be wired without another schema family.
CREATE TABLE IF NOT EXISTS agentsam_hook_execution (
  id TEXT PRIMARY KEY DEFAULT ('hexec_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  hook_id TEXT NOT NULL REFERENCES agentsam_hook(id) ON DELETE CASCADE,
  webhook_event_id TEXT REFERENCES agentsam_webhook_events(id) ON DELETE SET NULL,
  user_id TEXT,
  agent_id TEXT,
  session_id TEXT,
  conversation_id TEXT,
  workflow_run_id TEXT,
  agent_run_id TEXT,
  plan_id TEXT,
  workflow_key TEXT,
  tool_key TEXT,
  capability_key TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','running','success','failed','timeout','skipped','cancelled')),
  context_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at_unix INTEGER,
  finished_at_unix INTEGER,
  duration_ms INTEGER,
  resolved INTEGER NOT NULL DEFAULT 0 CHECK(resolved IN (0,1)),
  resolved_at_unix INTEGER,
  expires_at_unix INTEGER,
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_agentsam_hook_execution_account_created
  ON agentsam_hook_execution(account_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_hook_execution_hook_created
  ON agentsam_hook_execution(hook_id, created_at_unix DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_hook_execution_webhook_event
  ON agentsam_hook_execution(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_agentsam_hook_execution_expiry
  ON agentsam_hook_execution(expires_at_unix);
