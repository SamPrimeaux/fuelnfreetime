-- AgentSam Workers AI model registry
-- Run: npm run db:migrate:agentsam-ai

CREATE TABLE IF NOT EXISTS agentsam_ai (
  id TEXT PRIMARY KEY DEFAULT ('ai_' || lower(hex(randomblob(8)))),

  tenant_id TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',

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

  UNIQUE(workspace_id, model_id, lane)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_ai_workspace_task
ON agentsam_ai(workspace_id, task_type, status, priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_ai_workspace_lane
ON agentsam_ai(workspace_id, lane, status, priority);

CREATE INDEX IF NOT EXISTS idx_agentsam_ai_model_id
ON agentsam_ai(model_id);
