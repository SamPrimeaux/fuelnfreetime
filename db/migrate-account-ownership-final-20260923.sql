-- Fuel & Free Time account ownership finalization
-- Generated from live D1 DDL after the additive account_id stage.
-- Removes tenant/workspace ownership and rebuilds FK-dependent children.

-- Create replacements parent-first.
CREATE TABLE agentsam_ai__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('ai_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  provider TEXT NOT NULL DEFAULT 'workers_ai',
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK(task_type IN (
      'text_generation',
      'code_generation',
      'image_generation',
      'image_to_text',
      'embedding',
      'rerank',
      'safety',
      'classification',
      'translation',
      'speech_to_text',
      'text_to_speech',
      'turn_detection'
    )),
  lane TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN (
      'active',
      'disabled',
      'deprecated',
      'experimental'
    )),
  priority INTEGER NOT NULL DEFAULT 100,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0,1)),
  is_fallback INTEGER NOT NULL DEFAULT 1 CHECK(is_fallback IN (0,1)),
  supports_json INTEGER NOT NULL DEFAULT 0 CHECK(supports_json IN (0,1)),
  supports_tools INTEGER NOT NULL DEFAULT 0 CHECK(supports_tools IN (0,1)),
  supports_vision INTEGER NOT NULL DEFAULT 0 CHECK(supports_vision IN (0,1)),
  supports_streaming INTEGER NOT NULL DEFAULT 0 CHECK(supports_streaming IN (0,1)),
  context_window_tokens INTEGER,
  max_output_tokens INTEGER,
  quality_score REAL DEFAULT 0,
  speed_score REAL DEFAULT 0,
  cost_tier TEXT DEFAULT 'unknown' CHECK(cost_tier IN ('low','medium','high','unknown')),
  workflow_keys_json TEXT NOT NULL DEFAULT '[]',
  routing_keywords_json TEXT NOT NULL DEFAULT '[]',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  request_defaults_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, model_id, lane)
);

CREATE TABLE agentsam_attachments__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('att_' || lower(hex(randomblob(12)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  conversation_id TEXT,
  message_id TEXT,
  uploaded_by TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes INTEGER DEFAULT 0,
  r2_key TEXT NOT NULL,
  preview_url TEXT,
  image_width INTEGER,
  image_height INTEGER,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('uploading','ready','failed','deleted')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_compaction_runs__account_v2 (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  date_key TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'cron',
  status TEXT NOT NULL DEFAULT 'started'
      CHECK (status IN ('started', 'success', 'partial', 'failed')),
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  finished_at INTEGER,
  duration_ms INTEGER,
  analytics_rows INTEGER NOT NULL DEFAULT 0,
  prompt_usage_rows INTEGER NOT NULL DEFAULT 0,
  tool_call_rows INTEGER NOT NULL DEFAULT 0,
  analytics_deleted INTEGER NOT NULL DEFAULT 0,
  prompt_usage_deleted INTEGER NOT NULL DEFAULT 0,
  tool_call_deleted INTEGER NOT NULL DEFAULT 0,
  summaries_refreshed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  stats_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE agentsam_context_cache__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('ctxcache_' || lower(hex(randomblob(12)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  cache_key TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK(context_type IN (
      'project', 'workflow', 'tools', 'repo', 'store', 'conversation', 'attachment', 'mixed'
    )),
  workflow_key TEXT,
  route_lane TEXT,
  task_type TEXT,
  source_tables_json TEXT NOT NULL DEFAULT '[]',
  source_keys_json TEXT NOT NULL DEFAULT '[]',
  source_updated_hash TEXT,
  source_max_updated_at TEXT,
  context_preview TEXT,
  context_token_estimate INTEGER DEFAULT 0,
  context_char_count INTEGER DEFAULT 0,
  kv_key TEXT,
  r2_key TEXT,
  hit_count INTEGER NOT NULL DEFAULT 0,
  miss_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TEXT,
  last_hit_unix INTEGER,
  expires_at TEXT,
  expires_unix INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'invalidated', 'disabled')),
  invalidation_reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, cache_key)
);

CREATE TABLE agentsam_conversations__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('conv_' || lower(hex(randomblob(12)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  title TEXT NOT NULL DEFAULT 'Untitled',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived','deleted')),
  source TEXT NOT NULL DEFAULT 'admin_agentsam',
  workflow_key TEXT,
  last_message_preview TEXT,
  last_model_id TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  r2_thread_key TEXT,
  r2_summary_key TEXT,
  kv_recent_key TEXT,
  created_by TEXT,
  last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_dev_sessions__account_v2 (
  id                TEXT PRIMARY KEY DEFAULT ('ds_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  project_key       TEXT NOT NULL,
  session_date      TEXT NOT NULL,
  author            TEXT NOT NULL,
  session_type      TEXT DEFAULT 'feature',
  shipped           TEXT,
  decisions         TEXT,
  blockers          TEXT,
  open_items        TEXT,
  tables_touched    TEXT,
  files_touched     TEXT,
  commits           TEXT,
  notes             TEXT,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_mcp_servers__account_v2 (
  id               TEXT PRIMARY KEY DEFAULT ('mcps_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  server_key       TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  description      TEXT,
  url              TEXT NOT NULL,
  auth_type        TEXT NOT NULL DEFAULT 'bridge',
  token_secret     TEXT,
  transport        TEXT NOT NULL DEFAULT 'remote_jsonrpc',
  tool_lanes_json  TEXT NOT NULL DEFAULT '[]',
  repos_json       TEXT NOT NULL DEFAULT '[]',
  is_active        INTEGER NOT NULL DEFAULT 1,
  timeout_ms       INTEGER NOT NULL DEFAULT 30000,
  health_check_url TEXT,
  last_health_at   INTEGER,
  health_status    TEXT DEFAULT 'unknown',
  avg_latency_ms   REAL,
  error_rate       REAL DEFAULT 0,
  metadata_json    TEXT NOT NULL DEFAULT '{}',
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_mcp_workflows__account_v2 (
  id           TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  workflow_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'ready',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_project_context__account_v2 (
  id                    TEXT PRIMARY KEY DEFAULT ('ctx_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  project_key           TEXT NOT NULL,
  project_name          TEXT NOT NULL,
  project_type          TEXT,
  status                TEXT DEFAULT 'active',
  priority              INTEGER DEFAULT 50,
  description           TEXT NOT NULL,
  goals                 TEXT,
  constraints           TEXT,
  current_blockers      TEXT,
  primary_tables        TEXT,
  secondary_tables      TEXT,
  workers_involved      TEXT,
  r2_buckets_involved   TEXT,
  domains_involved      TEXT,
  mcp_services_involved TEXT,
  key_files             TEXT,
  related_routes        TEXT,
  tokens_budgeted       INTEGER,
  tokens_used           INTEGER DEFAULT 0,
  cost_usd              REAL NOT NULL DEFAULT 0,
  linked_plan_id        TEXT,
  linked_todo_ids       TEXT DEFAULT '[]',
  agent_id              TEXT,
  client_id             TEXT,
  session_id            TEXT,
  created_by            TEXT,
  notes                 TEXT,
  started_at            INTEGER,
  target_completion     INTEGER,
  completed_at          INTEGER,
  created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at            INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_prompt_cache__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('pcache_' || lower(hex(randomblob(12)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  cache_key TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  context_hash TEXT,
  tool_hash TEXT,
  model_hash TEXT,
  workflow_key TEXT,
  route_lane TEXT,
  task_type TEXT,
  model_id TEXT,
  prompt_keys_json TEXT NOT NULL DEFAULT '[]',
  fragment_keys_json TEXT NOT NULL DEFAULT '[]',
  tool_keys_json TEXT NOT NULL DEFAULT '[]',
  compiled_preview TEXT,
  compiled_token_estimate INTEGER DEFAULT 0,
  compiled_char_count INTEGER DEFAULT 0,
  kv_key TEXT,
  r2_key TEXT,
  hit_count INTEGER NOT NULL DEFAULT 0,
  miss_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TEXT,
  last_hit_unix INTEGER,
  expires_at TEXT,
  expires_unix INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'invalidated', 'disabled')),
  invalidation_reason TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, cache_key)
);

CREATE TABLE agentsam_prompt_fragments__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('pfrag_' || lower(hex(randomblob(10)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  fragment_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  fragment_type TEXT NOT NULL CHECK(fragment_type IN (
      'identity', 'scope', 'brand', 'workflow', 'tool_policy', 'safety', 'model_hint',
      'storage_policy', 'response_style', 'quality_gate', 'memory', 'context'
    )),
  applies_to_json TEXT NOT NULL DEFAULT '{}',
  content_text TEXT NOT NULL,
  content_hash TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  token_budget INTEGER,
  estimated_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'draft', 'disabled', 'deprecated')),
  version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, fragment_key, version)
);

CREATE TABLE agentsam_prompt_usage__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('puse_' || lower(hex(randomblob(12)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  conversation_id TEXT,
  message_id TEXT,
  run_id TEXT,
  workflow_key TEXT,
  route_lane TEXT,
  task_type TEXT,
  model_id TEXT,
  prompt_cache_key TEXT,
  context_cache_key TEXT,
  prompt_cache_hit INTEGER NOT NULL DEFAULT 0 CHECK(prompt_cache_hit IN (0, 1)),
  context_cache_hit INTEGER NOT NULL DEFAULT 0 CHECK(context_cache_hit IN (0, 1)),
  prompt_tokens_estimated INTEGER DEFAULT 0,
  context_tokens_estimated INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  build_duration_ms INTEGER DEFAULT 0,
  cache_lookup_ms INTEGER DEFAULT 0,
  saved_tokens_estimated INTEGER DEFAULT 0,
  saved_cost_estimated_usd REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'miss', 'fallback', 'failed')),
  error_message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  date_key TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
  hour_key TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H', 'now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_prompt_usage_daily__account_v2 (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  date_key TEXT NOT NULL,
  workflow_key TEXT NOT NULL DEFAULT '_all',
  route_lane TEXT NOT NULL DEFAULT '_all',
  task_type TEXT NOT NULL DEFAULT '_all',
  model_id TEXT NOT NULL DEFAULT '_all',
  request_count INTEGER NOT NULL DEFAULT 0,
  prompt_cache_hits INTEGER NOT NULL DEFAULT 0,
  context_cache_hits INTEGER NOT NULL DEFAULT 0,
  both_cache_hits INTEGER NOT NULL DEFAULT 0,
  total_saved_tokens INTEGER NOT NULL DEFAULT 0,
  total_saved_cost_usd REAL NOT NULL DEFAULT 0,
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  avg_build_duration_ms REAL NOT NULL DEFAULT 0,
  avg_cache_lookup_ms REAL NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  compacted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, date_key, workflow_key, route_lane, task_type, model_id)
);

CREATE TABLE agentsam_prompts__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('prompt_' || lower(hex(randomblob(10)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  prompt_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  prompt_type TEXT NOT NULL CHECK(prompt_type IN (
      'system', 'developer', 'workflow', 'tool', 'model', 'safety', 'response_format', 'user_scaffold'
    )),
  scope TEXT NOT NULL DEFAULT 'account' CHECK(scope IN (
      'global', 'account', 'workflow', 'tool', 'model'
    )),
  workflow_key TEXT,
  tool_key TEXT,
  model_id TEXT,
  route_lane TEXT,
  task_type TEXT,
  template_text TEXT NOT NULL,
  template_format TEXT NOT NULL DEFAULT 'mustache' CHECK(template_format IN ('plain', 'mustache', 'json')),
  variables_schema_json TEXT NOT NULL DEFAULT '{}',
  default_variables_json TEXT NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'draft', 'disabled', 'deprecated')),
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  max_tokens_budget INTEGER,
  estimated_tokens INTEGER DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, prompt_key, version)
);

CREATE TABLE agentsam_skill__account_v2 (
  id                     TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id                TEXT NOT NULL,
  person_uuid            TEXT,
  slug                   TEXT UNIQUE,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  content_markdown       TEXT NOT NULL DEFAULT '',
  file_path              TEXT NOT NULL DEFAULT '',
  scope                  TEXT NOT NULL DEFAULT 'account'
                           CHECK (scope IN ('user','account','global')),
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

CREATE TABLE agentsam_tool_call_daily__account_v2 (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  date_key TEXT NOT NULL,
  tool_key TEXT NOT NULL,
  tool_name TEXT,
  tool_category TEXT,
  mcp_server_key TEXT,
  total_calls INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms REAL NOT NULL DEFAULT 0,
  max_duration_ms INTEGER NOT NULL DEFAULT 0,
  compacted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, date_key, tool_key)
);

CREATE TABLE agentsam_tool_call_log__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('atcl_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  session_id TEXT,
  conversation_id TEXT,
  message_id TEXT,
  run_id TEXT,
  user_id TEXT,
  tool_name TEXT NOT NULL,
  tool_key TEXT,
  agentsam_tools_id TEXT,
  tool_category TEXT DEFAULT 'mcp',
  mcp_server_key TEXT,
  handler_type TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  duration_ms INTEGER,
  error_message TEXT,
  cost_usd REAL DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  input_summary TEXT,
  output_summary TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE agentsam_tool_chain__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('atc_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  user_id TEXT,
  session_id TEXT,
  conversation_id TEXT,
  message_id TEXT,
  run_id TEXT,
  workflow_key TEXT,
  workflow_run_id TEXT,
  plan_id TEXT,
  todo_id TEXT,
  parent_chain_id TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  tool_name TEXT NOT NULL,
  tool_key TEXT,
  tool_id TEXT,
  mcp_server_key TEXT,
  mcp_tool_call_id TEXT,
  tool_status TEXT NOT NULL DEFAULT 'pending',
  input_json TEXT DEFAULT '{}',
  output_summary TEXT,
  result_json TEXT,
  error_message TEXT,
  error_type TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  duration_ms INTEGER,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at INTEGER,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE TABLE agentsam_tool_policy_keys__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('atpk_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  policy_kind TEXT NOT NULL,
  tool_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (account_id, policy_kind, tool_key)
);

CREATE TABLE agentsam_tool_stats_compacted__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('atsc_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  tool_key TEXT NOT NULL,
  tool_name TEXT,
  total_calls INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  avg_duration_ms REAL DEFAULT 0,
  p95_duration_ms REAL DEFAULT 0,
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  compacted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(account_id, tool_key)
);

CREATE TABLE agentsam_tools__account_v2 (
  id TEXT PRIMARY KEY DEFAULT ('ast_' || lower(hex(randomblob(8)))),
  tool_name TEXT NOT NULL UNIQUE,
  tool_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tool_category TEXT NOT NULL,
  handler_type TEXT NOT NULL DEFAULT 'mcp',
  description TEXT,
  input_schema TEXT NOT NULL DEFAULT '{}',
  output_schema TEXT NOT NULL DEFAULT '{}',
  handler_config TEXT NOT NULL DEFAULT '{}',
  intent_tags TEXT NOT NULL DEFAULT '[]',
  intent_category_tags TEXT,
  modes_json TEXT NOT NULL DEFAULT '["agent","plan","debug","ask"]',
  mcp_server_key TEXT,
  mcp_service_url TEXT,
  linked_mcp_tool_id TEXT,
  dispatch_target TEXT NOT NULL DEFAULT 'internal',
  risk_level TEXT NOT NULL DEFAULT 'low',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  requires_confirmation INTEGER NOT NULL DEFAULT 0,
  token_budget_per_call INTEGER,
  max_calls_per_session INTEGER,
  cost_per_call_usd REAL DEFAULT 0.0,
  route_key TEXT,
  workflow_key TEXT,
  task_type TEXT DEFAULT 'tool_use',
  domain TEXT DEFAULT 'general',
  capability_key TEXT,
  capability_tier TEXT DEFAULT 'common',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_degraded INTEGER NOT NULL DEFAULT 0,
  oauth_visible INTEGER NOT NULL DEFAULT 0,
  is_global INTEGER DEFAULT 1,
  failure_rate REAL DEFAULT 0.0,
  avg_latency_ms REAL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  last_health_check INTEGER,
  sort_priority INTEGER DEFAULT 50,
  schema_hint TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  plugin_key TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  plugin_id TEXT REFERENCES agentsam_plugins(id) ON DELETE SET NULL,
  handler_key TEXT,
  connector_access_class TEXT NOT NULL DEFAULT "read" CHECK (connector_access_class IN ("read","write"))
);

CREATE TABLE agentsam_vector_chunks__account_v2 (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  chunk_id         TEXT PRIMARY KEY,
  content_hash     TEXT NOT NULL,
  source_type      TEXT NOT NULL CHECK (source_type IN ('product','cms','skill','repo','brand')),
  source_key       TEXT NOT NULL,
  vectorize_index  TEXT NOT NULL DEFAULT 'fnf-agentsam-bge-m3-1024',
  embedded_at      TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_webhook_events__account_v2 (
  id                  TEXT PRIMARY KEY DEFAULT ('whe_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
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

CREATE TABLE agentsam_webhooks__account_v2 (
  id                  TEXT PRIMARY KEY DEFAULT ('awh_' || lower(hex(randomblob(6)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
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

CREATE TABLE agentsam_workflows__account_v2 (
  id                   TEXT PRIMARY KEY DEFAULT ('wf_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  workflow_key         TEXT NOT NULL UNIQUE,
  display_name         TEXT NOT NULL,
  description          TEXT,
  workflow_type        TEXT NOT NULL DEFAULT 'agentic'
                         CHECK (workflow_type IN (
                           'agentic','integrations','commerce','maintenance',
                           'cms','media','deploy','webhook','manual'
                         )),
  trigger_type         TEXT NOT NULL DEFAULT 'manual'
                         CHECK (trigger_type IN (
                           'manual','webhook','hook','schedule','event','mcp'
                         )),
  default_mode         TEXT DEFAULT 'agent',
  default_task_type    TEXT,
  risk_level           TEXT DEFAULT 'low'
                         CHECK (risk_level IN ('low','medium','high','critical')),
  requires_approval    INTEGER NOT NULL DEFAULT 0,
  max_concurrent_nodes INTEGER NOT NULL DEFAULT 3,
  timeout_ms           INTEGER NOT NULL DEFAULT 300000,
  quality_gate_json    TEXT NOT NULL DEFAULT '{}',
  metadata_json        TEXT NOT NULL DEFAULT '{}',
  is_active            INTEGER NOT NULL DEFAULT 1,
  is_platform_global   INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix INTEGER
);

CREATE TABLE attribution_visits__account_v2 (
  id              TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
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

CREATE TABLE discounts__account_v2 (
  id                      TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  title                   TEXT NOT NULL,
  code                    TEXT,
  method                  TEXT NOT NULL DEFAULT 'code'
                            CHECK (method IN ('code','automatic')),
  discount_type           TEXT NOT NULL
                            CHECK (discount_type IN ('product','order','shipping','buy_x_get_y')),
  value_type              TEXT NOT NULL DEFAULT 'percent'
                            CHECK (value_type IN ('percent','fixed')),
  value                   INTEGER NOT NULL DEFAULT 0,
  applies_to              TEXT NOT NULL DEFAULT 'all'
                            CHECK (applies_to IN ('all','collections','products')),
  applies_to_json         TEXT DEFAULT '[]',
  eligibility             TEXT NOT NULL DEFAULT 'all',
  min_requirement_type    TEXT NOT NULL DEFAULT 'none'
                            CHECK (min_requirement_type IN ('none','amount','quantity')),
  min_requirement_value   INTEGER DEFAULT 0,
  max_uses_total          INTEGER,
  max_uses_per_customer   INTEGER DEFAULT 0,
  combine_product         INTEGER NOT NULL DEFAULT 0,
  combine_order           INTEGER NOT NULL DEFAULT 0,
  combine_shipping        INTEGER NOT NULL DEFAULT 0,
  starts_at               TEXT,
  ends_at                 TEXT,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','scheduled','expired','disabled')),
  uses_count              INTEGER NOT NULL DEFAULT 0,
  metadata_json           TEXT DEFAULT '{}',
  created_by              TEXT NOT NULL,
  updated_by              TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE growth_campaigns__account_v2 (
  id                  TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_by          TEXT NOT NULL,
  updated_by          TEXT,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  goal                TEXT,
  audience            TEXT,
  priority            TEXT DEFAULT 'normal',
  brief               TEXT,
  channels_json       TEXT DEFAULT '[]',
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','generating','review','active','paused','completed','archived')),
  approval_mode       TEXT DEFAULT 'draft_only',
  primary_source      TEXT,
  start_date          TEXT,
  end_date            TEXT,
  pack_json           TEXT DEFAULT '{}',
  metadata_json       TEXT DEFAULT '{}',
  readiness_score     INTEGER,
  attributed_revenue_cents INTEGER DEFAULT 0,
  session_count       INTEGER DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, slug)
);

CREATE TABLE user_oauth_tokens__account_v2 (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_identifier TEXT NOT NULL DEFAULT '',
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  scope TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  scopes TEXT,
  account_email TEXT,
  account_display TEXT,
  person_uuid TEXT,
  metadata_json TEXT,
  vault_access_token_id TEXT DEFAULT NULL,
  vault_refresh_token_id TEXT DEFAULT NULL,
  account_label TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  revoked_at INTEGER,
  revoked_by TEXT,
  last_refresh_at INTEGER,
  last_refresh_error_code TEXT,
  refresh_failure_count INTEGER NOT NULL DEFAULT 0,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  plugin_key TEXT,
  PRIMARY KEY (user_id, provider, account_identifier)
);

CREATE TABLE user_secrets__account_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  secret_value_encrypted TEXT NOT NULL,
  secret_type TEXT DEFAULT 'api_key' CHECK (secret_type IN ('api_key', 'password', 'token', 'credential', 'certificate', 'custom')),
  description TEXT,
  service_name TEXT,
  is_active INTEGER DEFAULT 1,
  expires_at INTEGER,
  last_used_at INTEGER,
  usage_count INTEGER DEFAULT 0,
  scopes_json TEXT DEFAULT '[]',
  metadata_json TEXT DEFAULT '{}',
  tags TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  project_id TEXT,
  project_label TEXT,
  person_uuid TEXT,
  vault_secret_id TEXT DEFAULT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  UNIQUE(user_id, secret_name, service_name)
);

CREATE TABLE agentsam_hook__account_v2 (
  id              TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
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
  workflow_id     TEXT REFERENCES agentsam_mcp_workflows__account_v2(id) ON DELETE SET NULL,
  subagent_slug   TEXT,
  person_uuid     TEXT,
  event_type      TEXT,
  hook_key        TEXT,
  handler_type    TEXT DEFAULT 'log_only',
  handler_config  TEXT DEFAULT '{}',
  priority        INTEGER DEFAULT 100,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agentsam_skill_file__account_v2 (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  skill_id    TEXT NOT NULL REFERENCES agentsam_skill__account_v2(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'reference',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_id, file_path)
);

CREATE TABLE agentsam_skill_revision__account_v2 (
  id              TEXT PRIMARY KEY DEFAULT ('asrev_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  skill_id        TEXT NOT NULL REFERENCES agentsam_skill__account_v2(id) ON DELETE CASCADE,
  content_hash    TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  version         INTEGER NOT NULL,
  source          TEXT NOT NULL DEFAULT 'sync',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE discount_redemptions__account_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  discount_id     TEXT NOT NULL REFERENCES discounts__account_v2(id),
  order_id        INTEGER REFERENCES orders(id),
  customer_email  TEXT,
  amount_cents    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy data parent-first.
INSERT INTO agentsam_ai__account_v2 (
  id, account_id, provider, model_id, display_name, description, task_type, lane, status, priority, is_default, is_fallback, supports_json, supports_tools, supports_vision, supports_streaming, context_window_tokens, max_output_tokens, quality_score, speed_score, cost_tier, workflow_keys_json, routing_keywords_json, capabilities_json, request_defaults_json, notes, created_at, updated_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', provider, model_id, display_name, description, task_type, lane, status, priority, is_default, is_fallback, supports_json, supports_tools, supports_vision, supports_streaming, context_window_tokens, max_output_tokens, quality_score, speed_score, cost_tier, workflow_keys_json, routing_keywords_json, capabilities_json, request_defaults_json, notes, created_at, updated_at, created_at_unix
FROM agentsam_ai;

INSERT INTO agentsam_attachments__account_v2 (
  id, account_id, conversation_id, message_id, uploaded_by, file_name, mime_type, file_size_bytes, r2_key, preview_url, image_width, image_height, status, metadata_json, created_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', conversation_id, message_id, uploaded_by, file_name, mime_type, file_size_bytes, r2_key, preview_url, image_width, image_height, status, metadata_json, created_at, created_at_unix
FROM agentsam_attachments;

INSERT INTO agentsam_compaction_runs__account_v2 (
  id, account_id, date_key, trigger_source, status, started_at, finished_at, duration_ms, analytics_rows, prompt_usage_rows, tool_call_rows, analytics_deleted, prompt_usage_deleted, tool_call_deleted, summaries_refreshed, error_message, stats_json
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', date_key, trigger_source, status, started_at, finished_at, duration_ms, analytics_rows, prompt_usage_rows, tool_call_rows, analytics_deleted, prompt_usage_deleted, tool_call_deleted, summaries_refreshed, error_message, stats_json
FROM agentsam_compaction_runs;

INSERT INTO agentsam_context_cache__account_v2 (
  id, account_id, cache_key, context_hash, context_type, workflow_key, route_lane, task_type, source_tables_json, source_keys_json, source_updated_hash, source_max_updated_at, context_preview, context_token_estimate, context_char_count, kv_key, r2_key, hit_count, miss_count, last_hit_at, last_hit_unix, expires_at, expires_unix, status, invalidation_reason, metadata_json, created_at, updated_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', cache_key, context_hash, context_type, workflow_key, route_lane, task_type, source_tables_json, source_keys_json, source_updated_hash, source_max_updated_at, context_preview, context_token_estimate, context_char_count, kv_key, r2_key, hit_count, miss_count, last_hit_at, last_hit_unix, expires_at, expires_unix, status, invalidation_reason, metadata_json, created_at, updated_at, created_at_unix
FROM agentsam_context_cache;

INSERT INTO agentsam_conversations__account_v2 (
  id, account_id, title, summary, status, source, workflow_key, last_message_preview, last_model_id, message_count, tool_call_count, attachment_count, r2_thread_key, r2_summary_key, kv_recent_key, created_by, last_active_at, last_active_unix, created_at, created_at_unix, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', title, summary, status, source, workflow_key, last_message_preview, last_model_id, message_count, tool_call_count, attachment_count, r2_thread_key, r2_summary_key, kv_recent_key, created_by, last_active_at, last_active_unix, created_at, created_at_unix, updated_at
FROM agentsam_conversations;

INSERT INTO agentsam_dev_sessions__account_v2 (
  id, account_id, project_key, session_date, author, session_type, shipped, decisions, blockers, open_items, tables_touched, files_touched, commits, notes, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', project_key, session_date, author, session_type, shipped, decisions, blockers, open_items, tables_touched, files_touched, commits, notes, created_at, updated_at
FROM agentsam_dev_sessions;

INSERT INTO agentsam_mcp_servers__account_v2 (
  id, account_id, server_key, display_name, description, url, auth_type, token_secret, transport, tool_lanes_json, repos_json, is_active, timeout_ms, health_check_url, last_health_at, health_status, avg_latency_ms, error_rate, metadata_json, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', server_key, display_name, description, url, auth_type, token_secret, transport, tool_lanes_json, repos_json, is_active, timeout_ms, health_check_url, last_health_at, health_status, avg_latency_ms, error_rate, metadata_json, created_at, updated_at
FROM agentsam_mcp_servers;

INSERT INTO agentsam_mcp_workflows__account_v2 (
  id, account_id, workflow_key, display_name, description, status, is_active, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', workflow_key, display_name, description, status, is_active, created_at, updated_at
FROM agentsam_mcp_workflows;

INSERT INTO agentsam_project_context__account_v2 (
  id, account_id, project_key, project_name, project_type, status, priority, description, goals, constraints, current_blockers, primary_tables, secondary_tables, workers_involved, r2_buckets_involved, domains_involved, mcp_services_involved, key_files, related_routes, tokens_budgeted, tokens_used, cost_usd, linked_plan_id, linked_todo_ids, agent_id, client_id, session_id, created_by, notes, started_at, target_completion, completed_at, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', project_key, project_name, project_type, status, priority, description, goals, constraints, current_blockers, primary_tables, secondary_tables, workers_involved, r2_buckets_involved, domains_involved, mcp_services_involved, key_files, related_routes, tokens_budgeted, tokens_used, cost_usd, linked_plan_id, linked_todo_ids, agent_id, client_id, session_id, created_by, notes, started_at, target_completion, completed_at, created_at, updated_at
FROM agentsam_project_context;

INSERT INTO agentsam_prompt_cache__account_v2 (
  id, account_id, cache_key, prompt_hash, context_hash, tool_hash, model_hash, workflow_key, route_lane, task_type, model_id, prompt_keys_json, fragment_keys_json, tool_keys_json, compiled_preview, compiled_token_estimate, compiled_char_count, kv_key, r2_key, hit_count, miss_count, last_hit_at, last_hit_unix, expires_at, expires_unix, status, invalidation_reason, metadata_json, created_at, updated_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', cache_key, prompt_hash, context_hash, tool_hash, model_hash, workflow_key, route_lane, task_type, model_id, prompt_keys_json, fragment_keys_json, tool_keys_json, compiled_preview, compiled_token_estimate, compiled_char_count, kv_key, r2_key, hit_count, miss_count, last_hit_at, last_hit_unix, expires_at, expires_unix, status, invalidation_reason, metadata_json, created_at, updated_at, created_at_unix
FROM agentsam_prompt_cache;

INSERT INTO agentsam_prompt_fragments__account_v2 (
  id, account_id, fragment_key, display_name, description, fragment_type, applies_to_json, content_text, content_hash, priority, token_budget, estimated_tokens, status, version, metadata_json, created_at, updated_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', fragment_key, display_name, description, fragment_type, applies_to_json, content_text, content_hash, priority, token_budget, estimated_tokens, status, version, metadata_json, created_at, updated_at, created_at_unix
FROM agentsam_prompt_fragments;

INSERT INTO agentsam_prompt_usage__account_v2 (
  id, account_id, conversation_id, message_id, run_id, workflow_key, route_lane, task_type, model_id, prompt_cache_key, context_cache_key, prompt_cache_hit, context_cache_hit, prompt_tokens_estimated, context_tokens_estimated, input_tokens, output_tokens, total_tokens, build_duration_ms, cache_lookup_ms, saved_tokens_estimated, saved_cost_estimated_usd, status, error_message, metadata_json, date_key, hour_key, created_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', conversation_id, message_id, run_id, workflow_key, route_lane, task_type, model_id, prompt_cache_key, context_cache_key, prompt_cache_hit, context_cache_hit, prompt_tokens_estimated, context_tokens_estimated, input_tokens, output_tokens, total_tokens, build_duration_ms, cache_lookup_ms, saved_tokens_estimated, saved_cost_estimated_usd, status, error_message, metadata_json, date_key, hour_key, created_at, created_at_unix
FROM agentsam_prompt_usage;

INSERT INTO agentsam_prompt_usage_daily__account_v2 (
  id, account_id, date_key, workflow_key, route_lane, task_type, model_id, request_count, prompt_cache_hits, context_cache_hits, both_cache_hits, total_saved_tokens, total_saved_cost_usd, total_input_tokens, total_output_tokens, avg_build_duration_ms, avg_cache_lookup_ms, failed_count, compacted_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', date_key, workflow_key, route_lane, task_type, model_id, request_count, prompt_cache_hits, context_cache_hits, both_cache_hits, total_saved_tokens, total_saved_cost_usd, total_input_tokens, total_output_tokens, avg_build_duration_ms, avg_cache_lookup_ms, failed_count, compacted_at
FROM agentsam_prompt_usage_daily;

INSERT INTO agentsam_prompts__account_v2 (
  id, account_id, prompt_key, display_name, description, prompt_type, scope, workflow_key, tool_key, model_id, route_lane, task_type, template_text, template_format, variables_schema_json, default_variables_json, priority, status, version, content_hash, max_tokens_budget, estimated_tokens, metadata_json, created_at, updated_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', prompt_key, display_name, description, prompt_type, CASE WHEN scope = 'workspace' THEN 'account' ELSE scope END, workflow_key, tool_key, model_id, route_lane, task_type, template_text, template_format, variables_schema_json, default_variables_json, priority, status, version, content_hash, max_tokens_budget, estimated_tokens, metadata_json, created_at, updated_at, created_at_unix
FROM agentsam_prompts;

INSERT INTO agentsam_skill__account_v2 (
  id, account_id, user_id, person_uuid, slug, name, description, content_markdown, file_path, scope, slash_trigger, globs, always_apply, task_types_json, route_keys_json, default_model_key, model_constraints_json, access_mode, icon, tags_json, metadata_json, token_estimate, invocation_count, last_invoked_at, version, is_active, sort_order, retrieval_strategy, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', user_id, person_uuid, slug, name, description, content_markdown, file_path, CASE WHEN scope IN ('tenant','workspace') THEN 'account' ELSE scope END, slash_trigger, globs, always_apply, task_types_json, route_keys_json, default_model_key, model_constraints_json, access_mode, icon, tags_json, metadata_json, token_estimate, invocation_count, last_invoked_at, version, is_active, sort_order, retrieval_strategy, created_at, updated_at
FROM agentsam_skill;

INSERT INTO agentsam_tool_call_daily__account_v2 (
  id, account_id, date_key, tool_key, tool_name, tool_category, mcp_server_key, total_calls, success_count, failure_count, success_rate, total_cost_usd, total_tokens, avg_duration_ms, max_duration_ms, compacted_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', date_key, tool_key, tool_name, tool_category, mcp_server_key, total_calls, success_count, failure_count, success_rate, total_cost_usd, total_tokens, avg_duration_ms, max_duration_ms, compacted_at
FROM agentsam_tool_call_daily;

INSERT INTO agentsam_tool_call_log__account_v2 (
  id, account_id, session_id, conversation_id, message_id, run_id, user_id, tool_name, tool_key, agentsam_tools_id, tool_category, mcp_server_key, handler_type, status, duration_ms, error_message, cost_usd, input_tokens, output_tokens, input_summary, output_summary, retry_count, created_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', session_id, conversation_id, message_id, run_id, user_id, tool_name, tool_key, agentsam_tools_id, tool_category, mcp_server_key, handler_type, status, duration_ms, error_message, cost_usd, input_tokens, output_tokens, input_summary, output_summary, retry_count, created_at
FROM agentsam_tool_call_log;

INSERT INTO agentsam_tool_chain__account_v2 (
  id, account_id, user_id, session_id, conversation_id, message_id, run_id, workflow_key, workflow_run_id, plan_id, todo_id, parent_chain_id, depth, tool_name, tool_key, tool_id, mcp_server_key, mcp_tool_call_id, tool_status, input_json, output_summary, result_json, error_message, error_type, retry_count, max_retries, duration_ms, input_tokens, output_tokens, cost_usd, requires_approval, approved_by, approved_at, started_at, completed_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', user_id, session_id, conversation_id, message_id, run_id, workflow_key, workflow_run_id, plan_id, todo_id, parent_chain_id, depth, tool_name, tool_key, tool_id, mcp_server_key, mcp_tool_call_id, tool_status, input_json, output_summary, result_json, error_message, error_type, retry_count, max_retries, duration_ms, input_tokens, output_tokens, cost_usd, requires_approval, approved_by, approved_at, started_at, completed_at
FROM agentsam_tool_chain;

INSERT INTO agentsam_tool_policy_keys__account_v2 (
  id, account_id, policy_kind, tool_key, sort_order, notes, is_active, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', policy_kind, tool_key, sort_order, notes, is_active, created_at, updated_at
FROM agentsam_tool_policy_keys;

INSERT INTO agentsam_tool_stats_compacted__account_v2 (
  id, account_id, tool_key, tool_name, total_calls, success_count, failure_count, success_rate, total_cost_usd, total_tokens, avg_duration_ms, p95_duration_ms, first_seen_at, last_seen_at, compacted_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', tool_key, tool_name, total_calls, success_count, failure_count, success_rate, total_cost_usd, total_tokens, avg_duration_ms, p95_duration_ms, first_seen_at, last_seen_at, compacted_at
FROM agentsam_tool_stats_compacted;

INSERT INTO agentsam_tools__account_v2 (
  id, tool_name, tool_key, display_name, tool_category, handler_type, description, input_schema, output_schema, handler_config, intent_tags, intent_category_tags, modes_json, mcp_server_key, mcp_service_url, linked_mcp_tool_id, dispatch_target, risk_level, requires_approval, requires_confirmation, token_budget_per_call, max_calls_per_session, cost_per_call_usd, route_key, workflow_key, task_type, domain, capability_key, capability_tier, is_active, is_degraded, oauth_visible, is_global, failure_rate, avg_latency_ms, use_count, last_used_at, last_health_check, sort_priority, schema_hint, notes, created_at, updated_at, plugin_key, account_id, plugin_id, handler_key, connector_access_class
)
SELECT
  id, tool_name, tool_key, display_name, tool_category, handler_type, description, input_schema, output_schema, handler_config, intent_tags, intent_category_tags, modes_json, mcp_server_key, mcp_service_url, linked_mcp_tool_id, dispatch_target, risk_level, requires_approval, requires_confirmation, token_budget_per_call, max_calls_per_session, cost_per_call_usd, route_key, workflow_key, task_type, domain, capability_key, capability_tier, is_active, is_degraded, oauth_visible, is_global, failure_rate, avg_latency_ms, use_count, last_used_at, last_health_check, sort_priority, schema_hint, notes, created_at, updated_at, plugin_key, COALESCE(account_id, 'ede6590ac0d2fb7daf155b35653457b2'), plugin_id, handler_key, connector_access_class
FROM agentsam_tools;

INSERT INTO agentsam_vector_chunks__account_v2 (
  account_id, chunk_id, content_hash, source_type, source_key, vectorize_index, embedded_at, updated_at
)
SELECT
  'ede6590ac0d2fb7daf155b35653457b2', chunk_id, content_hash, source_type, source_key, vectorize_index, embedded_at, updated_at
FROM agentsam_vector_chunks;

INSERT INTO agentsam_webhook_events__account_v2 (
  id, account_id, endpoint_id, provider, event_type, event_id, payload_json, headers_json, metadata_json, status, retry_count, input_tokens, output_tokens, cost_usd, error_message, processing_error, received_at_unix, processed_at_unix, signature_valid, ip_address, workflow_run_id
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', endpoint_id, provider, event_type, event_id, payload_json, headers_json, metadata_json, status, retry_count, input_tokens, output_tokens, cost_usd, error_message, processing_error, received_at_unix, processed_at_unix, signature_valid, ip_address, workflow_run_id
FROM agentsam_webhook_events;

INSERT INTO agentsam_webhooks__account_v2 (
  id, account_id, user_id, provider, provider_webhook_id, name, slug, description, endpoint_url, signature_header, signature_algo, is_active, allowed_events, workflow_key, metadata_json, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', user_id, provider, provider_webhook_id, name, slug, description, endpoint_url, signature_header, signature_algo, is_active, allowed_events, workflow_key, metadata_json, created_at, updated_at
FROM agentsam_webhooks;

INSERT INTO agentsam_workflows__account_v2 (
  id, account_id, workflow_key, display_name, description, workflow_type, trigger_type, default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes, timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global, created_at, updated_at, created_at_unix
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', workflow_key, display_name, description, workflow_type, trigger_type, default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes, timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global, created_at, updated_at, created_at_unix
FROM agentsam_workflows;

INSERT INTO attribution_visits__account_v2 (
  id, account_id, campaign_id, session_id, landing_path, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, channel, user_agent, created_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', campaign_id, session_id, landing_path, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, channel, user_agent, created_at
FROM attribution_visits;

INSERT INTO discounts__account_v2 (
  id, account_id, title, code, method, discount_type, value_type, value, applies_to, applies_to_json, eligibility, min_requirement_type, min_requirement_value, max_uses_total, max_uses_per_customer, combine_product, combine_order, combine_shipping, starts_at, ends_at, status, uses_count, metadata_json, created_by, updated_by, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', title, code, method, discount_type, value_type, value, applies_to, applies_to_json, eligibility, min_requirement_type, min_requirement_value, max_uses_total, max_uses_per_customer, combine_product, combine_order, combine_shipping, starts_at, ends_at, status, uses_count, metadata_json, created_by, updated_by, created_at, updated_at
FROM discounts;

INSERT INTO growth_campaigns__account_v2 (
  id, account_id, created_by, updated_by, name, slug, goal, audience, priority, brief, channels_json, status, approval_mode, primary_source, start_date, end_date, pack_json, metadata_json, readiness_score, attributed_revenue_cents, session_count, created_at, updated_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', created_by, updated_by, name, slug, goal, audience, priority, brief, channels_json, status, approval_mode, primary_source, start_date, end_date, pack_json, metadata_json, readiness_score, attributed_revenue_cents, session_count, created_at, updated_at
FROM growth_campaigns;

INSERT INTO user_oauth_tokens__account_v2 (
  user_id, provider, account_identifier, access_token, refresh_token, expires_at, scope, created_at, updated_at, access_token_encrypted, refresh_token_encrypted, scopes, account_email, account_display, person_uuid, metadata_json, vault_access_token_id, vault_refresh_token_id, account_label, is_active, revoked_at, revoked_by, last_refresh_at, last_refresh_error_code, refresh_failure_count, account_id, plugin_key
)
SELECT
  user_id, provider, account_identifier, access_token, refresh_token, expires_at, scope, created_at, updated_at, access_token_encrypted, refresh_token_encrypted, scopes, account_email, account_display, person_uuid, metadata_json, vault_access_token_id, vault_refresh_token_id, account_label, is_active, revoked_at, revoked_by, last_refresh_at, last_refresh_error_code, refresh_failure_count, COALESCE(account_id, 'ede6590ac0d2fb7daf155b35653457b2'), plugin_key
FROM user_oauth_tokens;

INSERT INTO user_secrets__account_v2 (
  id, user_id, secret_name, secret_value_encrypted, secret_type, description, service_name, is_active, expires_at, last_used_at, usage_count, scopes_json, metadata_json, tags, created_at, updated_at, project_id, project_label, person_uuid, vault_secret_id, account_id
)
SELECT
  id, user_id, secret_name, secret_value_encrypted, secret_type, description, service_name, is_active, expires_at, last_used_at, usage_count, scopes_json, metadata_json, tags, created_at, updated_at, project_id, project_label, person_uuid, vault_secret_id, COALESCE(account_id, 'ede6590ac0d2fb7daf155b35653457b2')
FROM user_secrets;

INSERT INTO agentsam_hook__account_v2 (
  id, account_id, user_id, provider, external_id, trigger, command, target_id, metadata, is_active, run_count, last_run_at, workflow_id, subagent_slug, person_uuid, event_type, hook_key, handler_type, handler_config, priority, created_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', user_id, provider, external_id, trigger, command, target_id, metadata, is_active, run_count, last_run_at, workflow_id, subagent_slug, person_uuid, event_type, hook_key, handler_type, handler_config, priority, created_at
FROM agentsam_hook;

INSERT INTO agentsam_skill_file__account_v2 (
  id, account_id, skill_id, file_path, role, sort_order, created_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', skill_id, file_path, role, sort_order, created_at
FROM agentsam_skill_file;

INSERT INTO agentsam_skill_revision__account_v2 (
  id, account_id, skill_id, content_hash, content_markdown, version, source, created_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', skill_id, content_hash, content_markdown, version, source, created_at
FROM agentsam_skill_revision;

INSERT INTO discount_redemptions__account_v2 (
  id, account_id, discount_id, order_id, customer_email, amount_cents, created_at
)
SELECT
  id, 'ede6590ac0d2fb7daf155b35653457b2', discount_id, order_id, customer_email, amount_cents, created_at
FROM discount_redemptions;

-- Drop originals child-first.
DROP TABLE discount_redemptions;
DROP TABLE agentsam_skill_revision;
DROP TABLE agentsam_skill_file;
DROP TABLE agentsam_hook;
DROP TABLE user_secrets;
DROP TABLE user_oauth_tokens;
DROP TABLE growth_campaigns;
DROP TABLE discounts;
DROP TABLE attribution_visits;
DROP TABLE agentsam_workflows;
DROP TABLE agentsam_webhooks;
DROP TABLE agentsam_webhook_events;
DROP TABLE agentsam_vector_chunks;
DROP TABLE agentsam_tools;
DROP TABLE agentsam_tool_stats_compacted;
DROP TABLE agentsam_tool_policy_keys;
DROP TABLE agentsam_tool_chain;
DROP TABLE agentsam_tool_call_log;
DROP TABLE agentsam_tool_call_daily;
DROP TABLE agentsam_skill;
DROP TABLE agentsam_prompts;
DROP TABLE agentsam_prompt_usage_daily;
DROP TABLE agentsam_prompt_usage;
DROP TABLE agentsam_prompt_fragments;
DROP TABLE agentsam_prompt_cache;
DROP TABLE agentsam_project_context;
DROP TABLE agentsam_mcp_workflows;
DROP TABLE agentsam_mcp_servers;
DROP TABLE agentsam_dev_sessions;
DROP TABLE agentsam_conversations;
DROP TABLE agentsam_context_cache;
DROP TABLE agentsam_compaction_runs;
DROP TABLE agentsam_attachments;
DROP TABLE agentsam_ai;

-- Rename replacements parent-first.
ALTER TABLE agentsam_ai__account_v2 RENAME TO agentsam_ai;
ALTER TABLE agentsam_attachments__account_v2 RENAME TO agentsam_attachments;
ALTER TABLE agentsam_compaction_runs__account_v2 RENAME TO agentsam_compaction_runs;
ALTER TABLE agentsam_context_cache__account_v2 RENAME TO agentsam_context_cache;
ALTER TABLE agentsam_conversations__account_v2 RENAME TO agentsam_conversations;
ALTER TABLE agentsam_dev_sessions__account_v2 RENAME TO agentsam_dev_sessions;
ALTER TABLE agentsam_mcp_servers__account_v2 RENAME TO agentsam_mcp_servers;
ALTER TABLE agentsam_mcp_workflows__account_v2 RENAME TO agentsam_mcp_workflows;
ALTER TABLE agentsam_project_context__account_v2 RENAME TO agentsam_project_context;
ALTER TABLE agentsam_prompt_cache__account_v2 RENAME TO agentsam_prompt_cache;
ALTER TABLE agentsam_prompt_fragments__account_v2 RENAME TO agentsam_prompt_fragments;
ALTER TABLE agentsam_prompt_usage__account_v2 RENAME TO agentsam_prompt_usage;
ALTER TABLE agentsam_prompt_usage_daily__account_v2 RENAME TO agentsam_prompt_usage_daily;
ALTER TABLE agentsam_prompts__account_v2 RENAME TO agentsam_prompts;
ALTER TABLE agentsam_skill__account_v2 RENAME TO agentsam_skill;
ALTER TABLE agentsam_tool_call_daily__account_v2 RENAME TO agentsam_tool_call_daily;
ALTER TABLE agentsam_tool_call_log__account_v2 RENAME TO agentsam_tool_call_log;
ALTER TABLE agentsam_tool_chain__account_v2 RENAME TO agentsam_tool_chain;
ALTER TABLE agentsam_tool_policy_keys__account_v2 RENAME TO agentsam_tool_policy_keys;
ALTER TABLE agentsam_tool_stats_compacted__account_v2 RENAME TO agentsam_tool_stats_compacted;
ALTER TABLE agentsam_tools__account_v2 RENAME TO agentsam_tools;
ALTER TABLE agentsam_vector_chunks__account_v2 RENAME TO agentsam_vector_chunks;
ALTER TABLE agentsam_webhook_events__account_v2 RENAME TO agentsam_webhook_events;
ALTER TABLE agentsam_webhooks__account_v2 RENAME TO agentsam_webhooks;
ALTER TABLE agentsam_workflows__account_v2 RENAME TO agentsam_workflows;
ALTER TABLE attribution_visits__account_v2 RENAME TO attribution_visits;
ALTER TABLE discounts__account_v2 RENAME TO discounts;
ALTER TABLE growth_campaigns__account_v2 RENAME TO growth_campaigns;
ALTER TABLE user_oauth_tokens__account_v2 RENAME TO user_oauth_tokens;
ALTER TABLE user_secrets__account_v2 RENAME TO user_secrets;
ALTER TABLE agentsam_hook__account_v2 RENAME TO agentsam_hook;
ALTER TABLE agentsam_skill_file__account_v2 RENAME TO agentsam_skill_file;
ALTER TABLE agentsam_skill_revision__account_v2 RENAME TO agentsam_skill_revision;
ALTER TABLE discount_redemptions__account_v2 RENAME TO discount_redemptions;

-- Recreate indexes with account-scoped definitions.
CREATE INDEX idx_agentsam_ai_model_id
ON agentsam_ai(model_id);
CREATE INDEX idx_agentsam_ai_account_lane
ON agentsam_ai(account_id, lane, status, priority);
CREATE INDEX idx_agentsam_ai_account_task
ON agentsam_ai(account_id, task_type, status, priority);
CREATE INDEX idx_agentsam_attachments_status
  ON agentsam_attachments(account_id, status, created_at_unix DESC);
CREATE INDEX idx_agentsam_attachments_account_conversation
  ON agentsam_attachments(account_id, conversation_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_compaction_runs_date
  ON agentsam_compaction_runs(account_id, date_key DESC, started_at DESC);
CREATE INDEX idx_agentsam_context_cache_lookup
  ON agentsam_context_cache(account_id, cache_key, status);
CREATE INDEX idx_agentsam_context_cache_type
  ON agentsam_context_cache(account_id, context_type, status, expires_unix);
CREATE INDEX idx_agentsam_context_cache_workflow
  ON agentsam_context_cache(account_id, workflow_key, route_lane, status);
CREATE INDEX idx_agentsam_conversations_workflow
  ON agentsam_conversations(account_id, workflow_key, last_active_unix DESC);
CREATE INDEX idx_agentsam_conversations_account_recent
  ON agentsam_conversations(account_id, status, last_active_unix DESC);
CREATE INDEX idx_agentsam_hook_event_type_active
  ON agentsam_hook(account_id, event_type, is_active)
  WHERE is_active = 1;
CREATE UNIQUE INDEX idx_agentsam_hook_key_unique
  ON agentsam_hook(account_id, hook_key)
  WHERE hook_key IS NOT NULL;
CREATE INDEX idx_agentsam_hook_account
  ON agentsam_hook(account_id);
CREATE INDEX idx_agentsam_hook_trigger
  ON agentsam_hook(trigger, is_active);
CREATE INDEX idx_agentsam_hook_user_account
  ON agentsam_hook(user_id, account_id);
CREATE INDEX idx_agentsam_mcp_servers_account
  ON agentsam_mcp_servers(account_id, is_active, server_key);
CREATE INDEX idx_agentsam_mcp_servers_account_2
  ON agentsam_mcp_servers(account_id, is_active);
CREATE INDEX idx_pctx_project_key ON agentsam_project_context(project_key);
CREATE INDEX idx_pctx_account_status ON agentsam_project_context(account_id, status);
CREATE INDEX idx_pctx_account ON agentsam_project_context(account_id);
CREATE INDEX idx_agentsam_prompt_cache_expiry
  ON agentsam_prompt_cache(account_id, status, expires_unix);
CREATE INDEX idx_agentsam_prompt_cache_lookup
  ON agentsam_prompt_cache(account_id, cache_key, status);
CREATE INDEX idx_agentsam_prompt_cache_model
  ON agentsam_prompt_cache(account_id, model_id, status);
CREATE INDEX idx_agentsam_prompt_cache_workflow
  ON agentsam_prompt_cache(account_id, workflow_key, route_lane, status);
CREATE INDEX idx_agentsam_prompt_fragments_key
  ON agentsam_prompt_fragments(account_id, fragment_key, status);
CREATE INDEX idx_agentsam_prompt_fragments_account
  ON agentsam_prompt_fragments(account_id, status, fragment_type, priority);
CREATE INDEX idx_agentsam_prompt_usage_cache
  ON agentsam_prompt_usage(account_id, prompt_cache_key, context_cache_key);
CREATE INDEX idx_agentsam_prompt_usage_date
  ON agentsam_prompt_usage(account_id, date_key, created_at_unix DESC);
CREATE INDEX idx_agentsam_prompt_usage_model
  ON agentsam_prompt_usage(account_id, model_id, created_at_unix DESC);
CREATE INDEX idx_agentsam_prompt_usage_workflow
  ON agentsam_prompt_usage(account_id, workflow_key, created_at_unix DESC);
CREATE INDEX idx_agentsam_prompt_usage_daily_date
  ON agentsam_prompt_usage_daily(account_id, date_key DESC);
CREATE INDEX idx_agentsam_prompts_key
  ON agentsam_prompts(account_id, prompt_key, status);
CREATE INDEX idx_agentsam_prompts_model
  ON agentsam_prompts(account_id, model_id, status, priority);
CREATE INDEX idx_agentsam_prompts_workflow
  ON agentsam_prompts(account_id, workflow_key, status, priority);
CREATE INDEX idx_agentsam_prompts_account_status
  ON agentsam_prompts(account_id, status, prompt_type, priority);
CREATE INDEX idx_agentsam_skill_slug
  ON agentsam_skill(slug);
CREATE INDEX idx_agentsam_skill_account_active
  ON agentsam_skill(account_id, is_active, sort_order);
CREATE INDEX idx_agentsam_skill_account
  ON agentsam_skill(account_id);
CREATE INDEX idx_agentsam_skill_file_skill
  ON agentsam_skill_file(skill_id, sort_order);
CREATE INDEX idx_agentsam_skill_revision_skill
  ON agentsam_skill_revision(skill_id, version DESC);
CREATE INDEX idx_agentsam_tool_call_daily_date
  ON agentsam_tool_call_daily(account_id, date_key DESC);
CREATE INDEX idx_agentsam_tool_call_daily_tool
  ON agentsam_tool_call_daily(account_id, tool_key, date_key DESC);
CREATE INDEX idx_agentsam_tool_call_log_session
  ON agentsam_tool_call_log(session_id, created_at DESC);
CREATE INDEX idx_agentsam_tool_call_log_tool
  ON agentsam_tool_call_log(tool_key, created_at DESC);
CREATE INDEX idx_agentsam_tool_call_log_account
  ON agentsam_tool_call_log(account_id, created_at DESC);
CREATE INDEX idx_agentsam_tool_chain_session
  ON agentsam_tool_chain(account_id, session_id, started_at DESC);
CREATE INDEX idx_agentsam_tool_chain_status
  ON agentsam_tool_chain(account_id, tool_status, started_at DESC);
CREATE INDEX idx_agentsam_tool_chain_tool
  ON agentsam_tool_chain(tool_key, started_at DESC);
CREATE INDEX idx_agentsam_tool_policy_keys_kind
  ON agentsam_tool_policy_keys(account_id, policy_kind, is_active, sort_order);
CREATE INDEX idx_agentsam_tool_stats_account
  ON agentsam_tool_stats_compacted(account_id, total_calls DESC);
CREATE INDEX idx_agentsam_tools_account_plugin
     ON agentsam_tools(account_id, plugin_key, is_active);
CREATE INDEX idx_agentsam_tools_active
  ON agentsam_tools(account_id, is_active, sort_priority);
CREATE INDEX idx_agentsam_tools_category
  ON agentsam_tools(tool_category, is_active, sort_priority);
CREATE INDEX idx_agentsam_tools_domain
  ON agentsam_tools(domain, is_active, sort_priority);
CREATE INDEX idx_agentsam_tools_handler
  ON agentsam_tools(handler_type, is_active);
CREATE INDEX idx_agentsam_tools_workflow
  ON agentsam_tools(workflow_key, is_active);
CREATE INDEX idx_agentsam_vector_chunks_hash
  ON agentsam_vector_chunks(content_hash, source_key);
CREATE INDEX idx_agentsam_vector_chunks_source
  ON agentsam_vector_chunks(source_type, account_id);
CREATE INDEX idx_agentsam_webhook_events_endpoint
  ON agentsam_webhook_events(endpoint_id, status);
CREATE INDEX idx_agentsam_webhook_events_provider_event
  ON agentsam_webhook_events(provider, event_type, event_id);
CREATE INDEX idx_agentsam_webhook_events_account
  ON agentsam_webhook_events(account_id, received_at_unix DESC);
CREATE INDEX idx_agentsam_webhooks_provider
  ON agentsam_webhooks(provider, is_active);
CREATE INDEX idx_agentsam_webhooks_account
  ON agentsam_webhooks(account_id);
CREATE INDEX idx_agentsam_workflows_account_active
  ON agentsam_workflows(account_id, is_active, workflow_key);
CREATE INDEX idx_agentsam_workflows_trigger
  ON agentsam_workflows(trigger_type, is_active);
CREATE INDEX idx_agentsam_workflows_account
  ON agentsam_workflows(account_id);
CREATE UNIQUE INDEX idx_agentsam_workflows_account_key ON agentsam_workflows(account_id, workflow_key);
CREATE INDEX idx_attribution_visits_campaign
  ON attribution_visits(account_id, campaign_id, created_at DESC);
CREATE INDEX idx_attribution_visits_session
  ON attribution_visits(session_id, created_at DESC);
CREATE INDEX idx_attribution_visits_utm
  ON attribution_visits(account_id, utm_campaign, utm_source, created_at DESC);
CREATE INDEX idx_discount_redemptions_discount
  ON discount_redemptions(discount_id, created_at DESC);
CREATE INDEX idx_discount_redemptions_email
  ON discount_redemptions(discount_id, customer_email);
CREATE INDEX idx_discounts_status
  ON discounts(account_id, status, updated_at DESC);
CREATE UNIQUE INDEX idx_discounts_account_code
  ON discounts(account_id, code)
  WHERE code IS NOT NULL AND code != '';
CREATE INDEX idx_growth_campaigns_creator
  ON growth_campaigns(created_by, updated_at DESC);
CREATE INDEX idx_growth_campaigns_status
  ON growth_campaigns(account_id, status, updated_at DESC);
CREATE INDEX idx_user_oauth_tokens_account_provider
     ON user_oauth_tokens(account_id, provider, is_active);

PRAGMA foreign_key_check;
