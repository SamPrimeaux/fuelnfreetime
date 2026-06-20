-- agentsam_workflows v2 — created_at_unix + workflow step graph table
-- Run: npm run db:migrate:agentsam-workflows-v2
-- Note: omit inline CHECK(...) lists — D1 batch apply chokes on commas inside CHECK.

PRAGMA foreign_keys = OFF;

-- Safe re-run: ignore if column already exists (apply via separate statement in shell if needed)
ALTER TABLE agentsam_workflows ADD COLUMN created_at_unix INTEGER;

UPDATE agentsam_workflows
SET created_at_unix = CAST(strftime('%s', COALESCE(created_at, datetime('now'))) AS INTEGER)
WHERE created_at_unix IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_workflows_ws_key
  ON agentsam_workflows(workspace_id, workflow_key);

CREATE TABLE IF NOT EXISTS agentsam_workflow_nodes (
  id                   TEXT PRIMARY KEY DEFAULT ('wnode_' || lower(hex(randomblob(8))),
  workflow_id          TEXT NOT NULL REFERENCES agentsam_workflows(id) ON DELETE CASCADE,
  node_key             TEXT NOT NULL,
  node_type            TEXT NOT NULL DEFAULT 'agent',
  title                TEXT NOT NULL,
  description          TEXT,
  handler_key          TEXT,
  input_schema_json    TEXT NOT NULL DEFAULT '{}',
  output_schema_json   TEXT NOT NULL DEFAULT '{}',
  timeout_ms           INTEGER NOT NULL DEFAULT 30000,
  retry_policy_json    TEXT NOT NULL DEFAULT '{}',
  quality_gate_json    TEXT NOT NULL DEFAULT '{}',
  risk_level           TEXT DEFAULT 'low',
  requires_approval    INTEGER NOT NULL DEFAULT 0,
  is_active            INTEGER NOT NULL DEFAULT 1,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  ui_icon              TEXT,
  ui_lane              TEXT,
  metadata_json        TEXT NOT NULL DEFAULT '{}',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_unix      INTEGER DEFAULT (unixepoch()),
  UNIQUE(workflow_id, node_key)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_workflow_nodes_workflow
  ON agentsam_workflow_nodes(workflow_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_agentsam_workflow_nodes_type
  ON agentsam_workflow_nodes(node_type);

PRAGMA foreign_keys = ON;
