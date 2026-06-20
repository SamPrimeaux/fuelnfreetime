-- agentsam_project_context — Fuel & Free Time worker D1 compass row
-- Run: npm run db:migrate:project-context
-- Seed: npm run db:seed:ctx-fuelnfreetime

CREATE TABLE IF NOT EXISTS agentsam_project_context (
  id                    TEXT PRIMARY KEY DEFAULT ('ctx_' || lower(hex(randomblob(8)))),
  tenant_id             TEXT NOT NULL,
  workspace_id          TEXT,
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

CREATE INDEX IF NOT EXISTS idx_pctx_tenant_status ON agentsam_project_context(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pctx_project_key ON agentsam_project_context(project_key);
CREATE INDEX IF NOT EXISTS idx_pctx_workspace ON agentsam_project_context(workspace_id);
