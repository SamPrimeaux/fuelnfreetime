-- Skill revision history + vector chunk registry for FNF embed pipeline
-- Run: npm run db:migrate:agentsam-skill-revisions

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS agentsam_skill_revision (
  id              TEXT PRIMARY KEY DEFAULT ('asrev_' || lower(hex(randomblob(8)))),
  skill_id        TEXT NOT NULL REFERENCES agentsam_skill(id) ON DELETE CASCADE,
  tenant_id       TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  workspace_id    TEXT DEFAULT 'ws_fuelnfreetime',
  content_hash    TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  version         INTEGER NOT NULL,
  source          TEXT NOT NULL DEFAULT 'sync',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_revision_skill
  ON agentsam_skill_revision(skill_id, version DESC);

CREATE TABLE IF NOT EXISTS agentsam_vector_chunks (
  chunk_id         TEXT PRIMARY KEY,
  content_hash     TEXT NOT NULL,
  source_type      TEXT NOT NULL CHECK (source_type IN ('product','cms','skill','repo','brand')),
  source_key       TEXT NOT NULL,
  workspace_id     TEXT NOT NULL DEFAULT 'ws_fuelnfreetime',
  tenant_id        TEXT NOT NULL DEFAULT 'tenant_fuelnfreetime',
  vectorize_index  TEXT NOT NULL DEFAULT 'fnf-agentsam-bge-m3-1024',
  embedded_at      TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_vector_chunks_hash
  ON agentsam_vector_chunks(content_hash, source_key);

CREATE INDEX IF NOT EXISTS idx_agentsam_vector_chunks_source
  ON agentsam_vector_chunks(source_type, workspace_id);
