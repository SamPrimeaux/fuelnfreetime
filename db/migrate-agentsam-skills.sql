-- Agent Sam skills registry (D1 metadata; markdown bodies in R2 agentsam/skills/…)
-- Aligned with inneranimalmedia agentsam_skill + retrieval_strategy r2
-- Run: npm run db:migrate:agentsam-skills

CREATE TABLE IF NOT EXISTS agentsam_skill (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  file_path       TEXT NOT NULL DEFAULT '',
  scope           TEXT NOT NULL DEFAULT 'platform',
  slash_trigger   TEXT,
  tags_json       TEXT NOT NULL DEFAULT '[]',
  globs_json      TEXT NOT NULL DEFAULT '[]',
  task_types_json TEXT NOT NULL DEFAULT '[]',
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  retrieval_strategy TEXT NOT NULL DEFAULT 'r2'
    CHECK (retrieval_strategy IN ('db', 'r2', 'none')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  version         INTEGER NOT NULL DEFAULT 1,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_active_sort
  ON agentsam_skill(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_scope
  ON agentsam_skill(scope);

-- Optional companion files (references/*.md, etc.)
CREATE TABLE IF NOT EXISTS agentsam_skill_file (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id    TEXT NOT NULL REFERENCES agentsam_skill(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'reference',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_skill_file_skill
  ON agentsam_skill_file(skill_id, sort_order);
