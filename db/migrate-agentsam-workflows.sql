-- agentsam_workflows — IAM-parity workflow registry (Fuel & Free Time)
-- Run: npm run db:migrate:agentsam-workflows
--
-- Canonical workflow table for hooks, webhooks, and Agent Sam dispatch.
-- Complements agentsam_mcp_workflows (MCP step graphs); this row is the SSOT registry.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS agentsam_workflows (
  id                   TEXT PRIMARY KEY DEFAULT ('wf_' || lower(hex(randomblob(8)))),
  tenant_id            TEXT,
  workspace_id         TEXT,
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
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_workflows_tenant_active
  ON agentsam_workflows(tenant_id, is_active, workflow_key);

CREATE INDEX IF NOT EXISTS idx_agentsam_workflows_workspace
  ON agentsam_workflows(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentsam_workflows_trigger
  ON agentsam_workflows(trigger_type, is_active);

PRAGMA foreign_keys = ON;
