-- AgentSam prompt registry, fragments, and cache layers
-- Run: npm run db:migrate:agentsam-prompts

CREATE TABLE IF NOT EXISTS agentsam_prompts (
  id TEXT PRIMARY KEY DEFAULT ('prompt_' || lower(hex(randomblob(10)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
  prompt_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  prompt_type TEXT NOT NULL CHECK(prompt_type IN (
    'system', 'developer', 'workflow', 'tool', 'model', 'safety', 'response_format', 'user_scaffold'
  )),
  scope TEXT NOT NULL DEFAULT 'workspace' CHECK(scope IN (
    'global', 'workspace', 'workflow', 'tool', 'model'
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
  UNIQUE(workspace_id, prompt_key, version)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompts_workspace_status
  ON agentsam_prompts(workspace_id, status, prompt_type, priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompts_workflow
  ON agentsam_prompts(workspace_id, workflow_key, status, priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompts_model
  ON agentsam_prompts(workspace_id, model_id, status, priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompts_key
  ON agentsam_prompts(workspace_id, prompt_key, status);

CREATE TABLE IF NOT EXISTS agentsam_prompt_fragments (
  id TEXT PRIMARY KEY DEFAULT ('pfrag_' || lower(hex(randomblob(10)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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
  UNIQUE(workspace_id, fragment_key, version)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_fragments_workspace
  ON agentsam_prompt_fragments(workspace_id, status, fragment_type, priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_fragments_key
  ON agentsam_prompt_fragments(workspace_id, fragment_key, status);

CREATE TABLE IF NOT EXISTS agentsam_prompt_cache (
  id TEXT PRIMARY KEY DEFAULT ('pcache_' || lower(hex(randomblob(12)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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
  UNIQUE(workspace_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_cache_lookup
  ON agentsam_prompt_cache(workspace_id, cache_key, status);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_cache_workflow
  ON agentsam_prompt_cache(workspace_id, workflow_key, route_lane, status);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_cache_model
  ON agentsam_prompt_cache(workspace_id, model_id, status);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_cache_expiry
  ON agentsam_prompt_cache(workspace_id, status, expires_unix);

CREATE TABLE IF NOT EXISTS agentsam_context_cache (
  id TEXT PRIMARY KEY DEFAULT ('ctxcache_' || lower(hex(randomblob(12)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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
  UNIQUE(workspace_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_context_cache_lookup
  ON agentsam_context_cache(workspace_id, cache_key, status);

CREATE INDEX IF NOT EXISTS idx_agentsam_context_cache_type
  ON agentsam_context_cache(workspace_id, context_type, status, expires_unix);

CREATE INDEX IF NOT EXISTS idx_agentsam_context_cache_workflow
  ON agentsam_context_cache(workspace_id, workflow_key, route_lane, status);

CREATE TABLE IF NOT EXISTS agentsam_prompt_usage (
  id TEXT PRIMARY KEY DEFAULT ('puse_' || lower(hex(randomblob(12)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_date
  ON agentsam_prompt_usage(workspace_id, date_key, created_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_workflow
  ON agentsam_prompt_usage(workspace_id, workflow_key, created_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_model
  ON agentsam_prompt_usage(workspace_id, model_id, created_at_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_cache
  ON agentsam_prompt_usage(workspace_id, prompt_cache_key, context_cache_key);
