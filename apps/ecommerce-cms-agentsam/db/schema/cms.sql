PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cms_pages (
  id TEXT PRIMARY KEY DEFAULT ('cmsp_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  legacy_page_id INTEGER UNIQUE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'standard' CHECK (page_type IN ('standard','scene','global')),
  status TEXT NOT NULL DEFAULT 'draft',
  template_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, slug)
);

CREATE TABLE IF NOT EXISTS cms_page_sections (
  id TEXT PRIMARY KEY DEFAULT ('cmss_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  page_id TEXT NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  legacy_section_id INTEGER UNIQUE,
  section_key TEXT NOT NULL,
  section_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  inline_content_json TEXT NOT NULL DEFAULT '{}',
  content_r2_key TEXT,
  content_version INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (page_id, section_key)
);

CREATE TABLE IF NOT EXISTS cms_artifacts (
  id TEXT PRIMARY KEY DEFAULT ('cmsa_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  artifact_key TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('page','section','block','global','asset')),
  source_kind TEXT NOT NULL DEFAULT 'generator',
  content_hash TEXT,
  content_r2_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, artifact_key, version)
);

CREATE TABLE IF NOT EXISTS cms_section_blocks (
  id TEXT PRIMARY KEY DEFAULT ('cmsb_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  section_id TEXT NOT NULL REFERENCES cms_page_sections(id) ON DELETE CASCADE,
  parent_block_id TEXT REFERENCES cms_section_blocks(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  block_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','archived')),
  content_json TEXT NOT NULL DEFAULT '{}',
  source_path TEXT,
  artifact_id TEXT REFERENCES cms_artifacts(id),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (section_id, block_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_section_blocks_tree ON cms_section_blocks(section_id, parent_block_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_cms_section_blocks_artifact ON cms_section_blocks(artifact_id);

CREATE TABLE IF NOT EXISTS cms_revisions (
  id TEXT PRIMARY KEY DEFAULT ('cmsr_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page','section','block','global')),
  entity_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 0,
  revision_kind TEXT NOT NULL DEFAULT 'current' CHECK (revision_kind IN ('current','history','published','draft','imported')),
  content_r2_key TEXT,
  content_hash TEXT,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_revisions_entity ON cms_revisions(account_id, entity_type, entity_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS cms_globals (
  id TEXT PRIMARY KEY DEFAULT ('cmsg_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  global_key TEXT NOT NULL,
  global_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  inline_content_json TEXT NOT NULL DEFAULT '{}',
  content_r2_key TEXT,
  content_version INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT,
  legacy_page_id INTEGER,
  legacy_section_id INTEGER UNIQUE,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, global_key)
);
