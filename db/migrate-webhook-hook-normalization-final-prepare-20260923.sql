-- D1 phase 1/4: build and populate verified canonical replacements.
-- Run after migrate-webhook-hook-normalization-stage-20260923.sql.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE agentsam_webhooks__canonical (
  id TEXT PRIMARY KEY DEFAULT ('awh_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id TEXT,
  provider TEXT NOT NULL,
  plugin_id TEXT,
  provider_webhook_id TEXT,
  provider_resource_type TEXT,
  provider_resource_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','disabled','pending','error','retired')),
  endpoint_url TEXT NOT NULL,
  events_json TEXT NOT NULL DEFAULT '[]',
  signature_header TEXT,
  signature_algo TEXT,
  secret_ref TEXT,
  workflow_key TEXT,
  last_event_at_unix INTEGER,
  last_verified_at_unix INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, slug),
  UNIQUE(account_id, provider, provider_webhook_id)
);

INSERT INTO agentsam_webhooks__canonical (
  id, account_id, user_id, provider, plugin_id, provider_webhook_id,
  provider_resource_type, provider_resource_id, name, slug, description,
  status, endpoint_url, events_json, signature_header, signature_algo,
  secret_ref, workflow_key, last_event_at_unix, last_verified_at_unix,
  metadata_json, created_at_unix, updated_at_unix
)
SELECT
  id,
  account_id,
  user_id,
  provider,
  plugin_id,
  provider_webhook_id,
  provider_resource_type,
  provider_resource_id,
  name,
  slug,
  description,
  status,
  endpoint_url,
  COALESCE(events_json, '[]'),
  signature_header,
  signature_algo,
  secret_ref,
  workflow_key,
  last_event_at_unix,
  last_verified_at_unix,
  COALESCE(metadata_json, '{}'),
  COALESCE(created_at_unix, unixepoch()),
  COALESCE(updated_at_unix, unixepoch())
FROM agentsam_webhooks;

-- Completeful provider registrations are configuration, not disposable event history.
INSERT INTO agentsam_webhooks__canonical (
  id, account_id, user_id, provider, provider_webhook_id,
  provider_resource_type, provider_resource_id,
  name, slug, description, status, endpoint_url, events_json,
  signature_header, signature_algo, secret_ref, metadata_json,
  created_at_unix, updated_at_unix
)
SELECT
  'awh_completeful_' || substr(replace(completeful_webhook_id, '-', ''), 1, 18),
  'ede6590ac0d2fb7daf155b35653457b2',
  'au_fnf_system',
  'completeful',
  completeful_webhook_id,
  'shop',
  completeful_shop_id,
  'Completeful ' || topic,
  'completeful-' ||
    lower(replace(replace(replace(topic, ':', '-'), '_', '-'), '.', '-')) ||
    '-' || substr(replace(completeful_shop_id, '-', ''), 1, 8),
  'Completeful webhook subscription migrated into the canonical AgentSam registry.',
  CASE WHEN lower(status) = 'active' THEN 'active' ELSE 'pending' END,
  target_url,
  json_array(topic),
  'X-Capp-Signature',
  'sha256',
  'COMPLETEFUL_WEBHOOK_SECRET_' ||
    upper(replace(replace(replace(topic, ':', '_'), '-', '_'), '.', '_')),
  json_object(
    'secret_last4', secret_last4,
    'source', 'completeful_webhook_subscriptions'
  ),
  COALESCE(CAST(strftime('%s', created_at) AS INTEGER), unixepoch()),
  COALESCE(CAST(strftime('%s', updated_at) AS INTEGER), unixepoch())
FROM completeful_webhook_subscriptions
WHERE 1
ON CONFLICT(account_id, provider, provider_webhook_id) DO UPDATE SET
  provider_resource_type = excluded.provider_resource_type,
  provider_resource_id = excluded.provider_resource_id,
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  endpoint_url = excluded.endpoint_url,
  events_json = excluded.events_json,
  signature_header = excluded.signature_header,
  signature_algo = excluded.signature_algo,
  secret_ref = excluded.secret_ref,
  metadata_json = excluded.metadata_json,
  updated_at_unix = excluded.updated_at_unix;

-- Receipt history is intentionally not copied. New receipts start clean.
CREATE TABLE agentsam_webhook_events__canonical (
  id TEXT PRIMARY KEY DEFAULT ('whe_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  webhook_id TEXT REFERENCES agentsam_webhooks__canonical(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  provider_object_id TEXT,
  dedupe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK(status IN ('received','processing','processed','failed','ignored','dead_letter')),
  signature_valid INTEGER CHECK(signature_valid IN (0,1)),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT,
  headers_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  error_code TEXT,
  error_message TEXT,
  processing_error TEXT,
  workflow_run_id TEXT,
  provider_created_at_unix INTEGER,
  received_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  processing_started_at_unix INTEGER,
  processed_at_unix INTEGER,
  payload_expires_at_unix INTEGER,
  expires_at_unix INTEGER,
  UNIQUE(account_id, provider, dedupe_key)
);

CREATE TABLE agentsam_hook__canonical (
  id TEXT PRIMARY KEY DEFAULT ('hook_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id TEXT,
  hook_key TEXT NOT NULL,
  name TEXT,
  description TEXT,
  source_kind TEXT NOT NULL DEFAULT 'event'
    CHECK(source_kind IN ('webhook','internal','lifecycle','schedule','manual','event')),
  provider TEXT,
  webhook_id TEXT REFERENCES agentsam_webhooks__canonical(id) ON DELETE CASCADE,
  event_type TEXT,
  match_json TEXT NOT NULL DEFAULT '{}',
  handler_type TEXT NOT NULL DEFAULT 'log_only',
  workflow_id TEXT,
  workflow_key TEXT,
  tool_key TEXT,
  handler_config_json TEXT NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at_unix INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, hook_key)
);

INSERT INTO agentsam_hook__canonical (
  id, account_id, user_id, hook_key, name, description,
  source_kind, provider, webhook_id, event_type, match_json,
  handler_type, workflow_id, workflow_key, tool_key,
  handler_config_json, priority, is_active, run_count, last_run_at_unix,
  metadata_json, created_at_unix, updated_at_unix
)
SELECT
  id,
  account_id,
  user_id,
  COALESCE(NULLIF(hook_key, ''), id),
  COALESCE(NULLIF(hook_key, ''), id),
  NULL,
  CASE
    WHEN target_id IN (SELECT id FROM agentsam_webhooks__canonical) THEN 'webhook'
    WHEN trigger IN ('start','stop','pre_deploy','post_deploy','pre_commit') THEN 'lifecycle'
    ELSE 'internal'
  END,
  provider,
  CASE
    WHEN target_id IN (SELECT id FROM agentsam_webhooks__canonical) THEN target_id
    ELSE NULL
  END,
  COALESCE(NULLIF(event_type, ''), trigger),
  '{}',
  COALESCE(NULLIF(handler_type, ''), 'log_only'),
  workflow_id,
  COALESCE(json_extract(handler_config, '$.workflow_key'), NULL),
  COALESCE(json_extract(handler_config, '$.tool_key'), NULL),
  COALESCE(handler_config, '{}'),
  COALESCE(priority, 100),
  COALESCE(is_active, 1),
  COALESCE(run_count, 0),
  CASE
    WHEN last_run_at IS NULL OR trim(last_run_at) = '' THEN NULL
    ELSE CAST(strftime('%s', last_run_at) AS INTEGER)
  END,
  json_patch(
    COALESCE(metadata, '{}'),
    json_object(
      'legacy_trigger', trigger,
      'legacy_command', command,
      'legacy_target_id', target_id,
      'legacy_external_id', external_id,
      'legacy_subagent_slug', subagent_slug,
      'legacy_person_uuid', person_uuid
    )
  ),
  COALESCE(CAST(strftime('%s', created_at) AS INTEGER), unixepoch()),
  unixepoch()
FROM agentsam_hook;

CREATE TABLE agentsam_hook_execution__canonical (
  id TEXT PRIMARY KEY DEFAULT ('hexec_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  hook_id TEXT NOT NULL REFERENCES agentsam_hook__canonical(id) ON DELETE CASCADE,
  webhook_event_id TEXT REFERENCES agentsam_webhook_events__canonical(id) ON DELETE SET NULL,
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

INSERT INTO agentsam_hook_execution__canonical (
  id, account_id, hook_id, webhook_event_id, user_id, agent_id, session_id,
  conversation_id, workflow_run_id, agent_run_id, plan_id, workflow_key,
  tool_key, capability_key, attempt, status, context_json, output_json,
  error_code, error_message, started_at_unix, finished_at_unix, duration_ms,
  resolved, resolved_at_unix, expires_at_unix, created_at_unix
)
SELECT
  id, account_id, hook_id, NULL, user_id, agent_id, session_id,
  conversation_id, workflow_run_id, agent_run_id, plan_id, workflow_key,
  tool_key, capability_key, attempt, status, context_json, output_json,
  error_code, error_message, started_at_unix, finished_at_unix, duration_ms,
  resolved, resolved_at_unix, expires_at_unix, created_at_unix
FROM agentsam_hook_execution;

PRAGMA defer_foreign_keys = OFF;
