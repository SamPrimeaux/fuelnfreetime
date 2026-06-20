-- AgentSam daily compaction tables — roll hot logs into daily stats
-- Run: npm run db:migrate:agentsam-compaction

CREATE TABLE IF NOT EXISTS agentsam_analytics_daily (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
  date_key TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '_all',
  event_name TEXT NOT NULL DEFAULT '_all',
  workflow_key TEXT NOT NULL DEFAULT '_all',
  task_type TEXT NOT NULL DEFAULT '_all',
  model_id TEXT NOT NULL DEFAULT '_all',
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
    workspace_id,
    date_key,
    event_type,
    event_name,
    workflow_key,
    task_type,
    model_id
  )
);

CREATE INDEX IF NOT EXISTS idx_agentsam_analytics_daily_date
  ON agentsam_analytics_daily(workspace_id, date_key DESC);

CREATE TABLE IF NOT EXISTS agentsam_prompt_usage_daily (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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
  UNIQUE(workspace_id, date_key, workflow_key, route_lane, task_type, model_id)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_prompt_usage_daily_date
  ON agentsam_prompt_usage_daily(workspace_id, date_key DESC);

CREATE TABLE IF NOT EXISTS agentsam_tool_call_daily (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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
  UNIQUE(workspace_id, date_key, tool_key)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_daily_date
  ON agentsam_tool_call_daily(workspace_id, date_key DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_tool_call_daily_tool
  ON agentsam_tool_call_daily(workspace_id, tool_key, date_key DESC);

CREATE TABLE IF NOT EXISTS agentsam_compaction_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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

CREATE INDEX IF NOT EXISTS idx_agentsam_compaction_runs_date
  ON agentsam_compaction_runs(workspace_id, date_key DESC, started_at DESC);

PRAGMA foreign_keys = ON;
