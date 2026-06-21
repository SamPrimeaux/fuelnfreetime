-- Growth campaigns — marketing campaign packs for /admin/growth
-- Apply: npm run db:migrate:growth-campaigns

CREATE TABLE IF NOT EXISTS growth_campaigns (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id        TEXT DEFAULT 'ws_fuelnfreetime',
  created_by          TEXT NOT NULL,
  updated_by          TEXT,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  goal                TEXT,
  audience            TEXT,
  priority            TEXT DEFAULT 'normal',
  brief               TEXT,
  channels_json       TEXT DEFAULT '[]',
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','generating','review','active','paused','completed','archived')),
  approval_mode       TEXT DEFAULT 'draft_only',
  primary_source      TEXT,
  start_date          TEXT,
  end_date            TEXT,
  pack_json           TEXT DEFAULT '{}',
  metadata_json       TEXT DEFAULT '{}',
  readiness_score     INTEGER,
  attributed_revenue_cents INTEGER DEFAULT 0,
  session_count       INTEGER DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_growth_campaigns_status
  ON growth_campaigns(tenant_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_campaigns_creator
  ON growth_campaigns(created_by, updated_at DESC);
