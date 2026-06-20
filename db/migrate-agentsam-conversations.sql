-- AgentSam conversation metadata (full payloads live in R2)

CREATE TABLE IF NOT EXISTS agentsam_conversations (
  id TEXT PRIMARY KEY DEFAULT ('conv_' || lower(hex(randomblob(12)))),
  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
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

CREATE INDEX IF NOT EXISTS idx_agentsam_conversations_workspace_recent
  ON agentsam_conversations(workspace_id, status, last_active_unix DESC);

CREATE INDEX IF NOT EXISTS idx_agentsam_conversations_workflow
  ON agentsam_conversations(workspace_id, workflow_key, last_active_unix DESC);
