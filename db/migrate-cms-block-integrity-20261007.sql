-- Additive/idempotent indexes + integrity triggers for the final CMS block/artifact shape.
-- Safe to run against the current production D1 and plain SQLite.

PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_cms_artifacts_account_type
  ON cms_artifacts(account_id, artifact_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_cms_artifacts_hash
  ON cms_artifacts(account_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_cms_section_blocks_tree
  ON cms_section_blocks(section_id, parent_block_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_cms_section_blocks_artifact
  ON cms_section_blocks(artifact_id)
  WHERE artifact_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_cms_blocks_parent_scope_insert
BEFORE INSERT ON cms_section_blocks
WHEN NEW.parent_block_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM cms_section_blocks p
      WHERE p.id = NEW.parent_block_id
        AND p.account_id = NEW.account_id
        AND p.section_id = NEW.section_id
    )
    THEN RAISE(ABORT, 'cms_block_parent_scope_mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_cms_blocks_parent_scope_update
BEFORE UPDATE OF parent_block_id, account_id, section_id ON cms_section_blocks
WHEN NEW.parent_block_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM cms_section_blocks p
      WHERE p.id = NEW.parent_block_id
        AND p.account_id = NEW.account_id
        AND p.section_id = NEW.section_id
    )
    THEN RAISE(ABORT, 'cms_block_parent_scope_mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_cms_blocks_parent_cycle_update
BEFORE UPDATE OF parent_block_id ON cms_section_blocks
WHEN NEW.parent_block_id IS NOT NULL
BEGIN
  WITH RECURSIVE lineage(id, parent_block_id) AS (
    SELECT id, parent_block_id
    FROM cms_section_blocks
    WHERE id = NEW.parent_block_id
    UNION ALL
    SELECT b.id, b.parent_block_id
    FROM cms_section_blocks b
    JOIN lineage l ON b.id = l.parent_block_id
    WHERE l.parent_block_id IS NOT NULL
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM lineage WHERE id = NEW.id)
    THEN RAISE(ABORT, 'cms_block_parent_cycle')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_cms_blocks_artifact_scope_insert
BEFORE INSERT ON cms_section_blocks
WHEN NEW.artifact_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM cms_artifacts a
      WHERE a.id = NEW.artifact_id
        AND a.account_id = NEW.account_id
    )
    THEN RAISE(ABORT, 'cms_block_artifact_scope_mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_cms_blocks_artifact_scope_update
BEFORE UPDATE OF artifact_id, account_id ON cms_section_blocks
WHEN NEW.artifact_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM cms_artifacts a
      WHERE a.id = NEW.artifact_id
        AND a.account_id = NEW.account_id
    )
    THEN RAISE(ABORT, 'cms_block_artifact_scope_mismatch')
  END;
END;
