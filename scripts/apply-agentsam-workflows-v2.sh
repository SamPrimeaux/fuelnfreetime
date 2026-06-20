#!/usr/bin/env bash
# Apply agentsam_workflows v2 without comma-split issues in wrangler --file batching.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RUN=("./scripts/with-cf-admin-env.sh" npx wrangler d1 execute fuelnfreetime --remote --command)

run() {
  echo "→ $1"
  "${RUN[@]}" "$1"
}

run "PRAGMA foreign_keys = OFF;"

run "ALTER TABLE agentsam_workflows ADD COLUMN created_at_unix INTEGER;" || true

run "UPDATE agentsam_workflows SET created_at_unix = unixepoch() WHERE created_at_unix IS NULL;"

run "CREATE UNIQUE INDEX IF NOT EXISTS idx_agentsam_workflows_ws_key ON agentsam_workflows(workspace_id, workflow_key);"

bash "$ROOT/scripts/apply-agentsam-workflow-nodes-table.sh"

run "PRAGMA foreign_keys = ON;"

echo "✓ agentsam_workflows v2 applied"
