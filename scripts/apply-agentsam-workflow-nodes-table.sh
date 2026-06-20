#!/usr/bin/env bash
# Apply agentsam_workflow_nodes without commas in wrangler --command payloads.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RUN=("./scripts/with-cf-admin-env.sh" npx wrangler d1 execute fuelnfreetime --remote --command)

run() {
  echo "→ $1"
  "${RUN[@]}" "$1"
}

run "CREATE TABLE IF NOT EXISTS agentsam_workflow_nodes (id TEXT PRIMARY KEY);"

cols=(
  "workflow_id TEXT NOT NULL DEFAULT ''"
  "node_key TEXT NOT NULL DEFAULT ''"
  "node_type TEXT NOT NULL DEFAULT 'agent'"
  "title TEXT NOT NULL DEFAULT ''"
  "description TEXT"
  "handler_key TEXT"
  "input_schema_json TEXT NOT NULL DEFAULT '{}'"
  "output_schema_json TEXT NOT NULL DEFAULT '{}'"
  "timeout_ms INTEGER NOT NULL DEFAULT 30000"
  "retry_policy_json TEXT NOT NULL DEFAULT '{}'"
  "quality_gate_json TEXT NOT NULL DEFAULT '{}'"
  "risk_level TEXT DEFAULT 'low'"
  "requires_approval INTEGER NOT NULL DEFAULT 0"
  "is_active INTEGER NOT NULL DEFAULT 1"
  "sort_order INTEGER NOT NULL DEFAULT 0"
  "ui_icon TEXT"
  "ui_lane TEXT"
  "metadata_json TEXT NOT NULL DEFAULT '{}'"
  "created_at TEXT NOT NULL DEFAULT (datetime('now'))"
  "updated_at TEXT NOT NULL DEFAULT (datetime('now'))"
  "created_at_unix INTEGER DEFAULT (unixepoch())"
)

for col in "${cols[@]}"; do
  run "ALTER TABLE agentsam_workflow_nodes ADD COLUMN ${col};" || true
done

run "CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_workflow_nodes_ws_node ON agentsam_workflow_nodes(workflow_id, node_key);" || true
run "CREATE INDEX IF NOT EXISTS idx_agentsam_workflow_nodes_workflow ON agentsam_workflow_nodes(workflow_id, is_active, sort_order);" || true
run "CREATE INDEX IF NOT EXISTS idx_agentsam_workflow_nodes_type ON agentsam_workflow_nodes(node_type);" || true

echo "✓ agentsam_workflow_nodes table ready"
