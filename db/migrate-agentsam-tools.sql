-- AgentSam tools platform — IAM-parity catalog for Fuel n Freetime
-- Run: npm run db:migrate:agentsam-tools
--
-- SSOT: agentsam_tools (not hardcoded MCP_SERVERS)
-- Companion: agentsam_mcp_servers, agentsam_tool_policy_keys,
--            agentsam_tool_chain, agentsam_tool_call_log, agentsam_tool_stats_compacted

PRAGMA foreign_keys = OFF;

-- ── MCP server registry ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_mcp_servers (
  id               TEXT PRIMARY KEY DEFAULT ('mcps_' || lower(hex(randomblob(8)))),
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id     TEXT DEFAULT 'ws_fuelnfreetime',
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

CREATE INDEX IF NOT EXISTS idx_agentsam_mcp_servers_tenant
  ON agentsam_mcp_servers(tenant_id, is_active, server_key);

CREATE INDEX IF NOT EXISTS idx_agentsam_mcp_servers_workspace
  ON agentsam_mcp_servers(workspace_id, is_active);

-- ── Tool catalog (SSOT) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_tools (
  id TEXT PRIMARY KEY DEFAULT ('ast_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT DEFAULT 'ws_fuelnfreetime',

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
  workspace_scope TEXT NOT NULL DEFAULT '["ws_fuelnfreetime"]',

  failure_rate REAL DEFAULT 0.0,
  avg_latency_ms REAL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  last_health_check INTEGER,
  sort_priority INTEGER DEFAULT 50,
  schema_hint TEXT,
  notes TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_agentsam_tools_active
  ON agentsam_tools(tenant_id, is_active, sort_priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_tools_category
  ON agentsam_tools(tool_category, is_active, sort_priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_tools_handler
  ON agentsam_tools(handler_type, is_active);

CREATE INDEX IF NOT EXISTS idx_agentsam_tools_workflow
  ON agentsam_tools(workflow_key, is_active);

CREATE INDEX IF NOT EXISTS idx_agentsam_tools_domain
  ON agentsam_tools(domain, is_active, sort_priority);

-- ── Tool policy keys (allowlists / denylists) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_tool_policy_keys (
  id TEXT PRIMARY KEY DEFAULT ('atpk_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT DEFAULT 'ws_fuelnfreetime',
  policy_kind TEXT NOT NULL,
  tool_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (tenant_id, policy_kind, tool_key)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_policy_keys_kind
  ON agentsam_tool_policy_keys(tenant_id, policy_kind, is_active, sort_order);

-- ── Tool execution chain (per run / plan step) ────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_tool_chain (
  id TEXT PRIMARY KEY DEFAULT ('atc_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_chain_session
  ON agentsam_tool_chain(workspace_id, session_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_chain_status
  ON agentsam_tool_chain(workspace_id, tool_status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_chain_tool
  ON agentsam_tool_chain(tool_key, started_at DESC);

-- ── Tool call log (hot ledger) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_tool_call_log (
  id TEXT PRIMARY KEY DEFAULT ('atcl_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT DEFAULT 'ws_fuelnfreetime',
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

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_log_workspace
  ON agentsam_tool_call_log(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_log_tool
  ON agentsam_tool_call_log(tool_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_log_session
  ON agentsam_tool_call_log(session_id, created_at DESC);

-- ── Compacted tool stats (rollup-friendly) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS agentsam_tool_stats_compacted (
  id TEXT PRIMARY KEY DEFAULT ('atsc_' || lower(hex(randomblob(8)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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
  UNIQUE(tenant_id, workspace_id, tool_key)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_stats_workspace
  ON agentsam_tool_stats_compacted(workspace_id, total_calls DESC);

PRAGMA foreign_keys = ON;
