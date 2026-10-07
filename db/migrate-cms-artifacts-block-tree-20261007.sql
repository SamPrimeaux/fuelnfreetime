-- One-time migration from the original cms_section_blocks shape created by
-- migrate-cms-data-family-20261007.sql to the artifact-aware nested block shape.
--
-- IMPORTANT:
-- The current production D1 table was already rebuilt manually into this final shape.
-- Do not replay this rebuild against a database that already has parent_block_id/artifact_id.
-- Fresh databases should use db/schema/cms.sql.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS cms_artifacts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  artifact_key TEXT NOT NULL,
  artifact_type TEXT NOT NULL
    CHECK (artifact_type IN (
      'section','template','theme','page-build','site-build','app','scene','embed'
    )),
  version TEXT NOT NULL,
  r2_prefix TEXT NOT NULL,
  manifest_r2_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content_mode TEXT NOT NULL DEFAULT 'bundle'
    CHECK (content_mode IN ('bundle','html','component','scene','embed','manifest')),
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('building','ready','failed','deprecated')),
  source_kind TEXT,
  source_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, artifact_key, version)
);

CREATE INDEX IF NOT EXISTS idx_cms_artifacts_account_type
  ON cms_artifacts(account_id, artifact_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_cms_artifacts_hash
  ON cms_artifacts(account_id, content_hash);

CREATE TABLE cms_section_blocks__migrate_20261007 (
  id              TEXT PRIMARY KEY
    DEFAULT ('cmsb_' || lower(hex(randomblob(8)))),
  account_id      TEXT NOT NULL REFERENCES accounts(id),
  section_id      TEXT NOT NULL REFERENCES cms_page_sections(id) ON DELETE CASCADE,
  parent_block_id TEXT REFERENCES cms_section_blocks__migrate_20261007(id) ON DELETE CASCADE,
  block_key       TEXT NOT NULL,
  block_type      TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','hidden','archived')),
  content_json    TEXT NOT NULL DEFAULT '{}',
  artifact_id     TEXT REFERENCES cms_artifacts(id),
  source_path     TEXT,
  metadata_json   TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(section_id, block_key)
);

INSERT INTO cms_section_blocks__migrate_20261007 (
  id, account_id, section_id, block_key, block_type, sort_order,
  status, content_json, source_path, metadata_json, created_at, updated_at
)
SELECT
  id, account_id, section_id, block_key, block_type, sort_order,
  status, content_json, source_path, metadata_json, created_at, updated_at
FROM cms_section_blocks;

DROP TABLE cms_section_blocks;
ALTER TABLE cms_section_blocks__migrate_20261007 RENAME TO cms_section_blocks;

CREATE INDEX idx_cms_section_blocks_tree
  ON cms_section_blocks(section_id, parent_block_id, sort_order, id);

CREATE INDEX idx_cms_section_blocks_artifact
  ON cms_section_blocks(artifact_id)
  WHERE artifact_id IS NOT NULL;

PRAGMA foreign_keys = ON;
