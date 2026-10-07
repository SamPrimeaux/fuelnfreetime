-- CMS data-family foundation — 2026-10-07
--
-- Data-only migration. It DOES NOT change storefront rendering, editor reads/writes,
-- publish behavior, or the existing pages/page_sections authority.
--
-- Goals:
--   1) Create the normalized cms_* family alongside the current CMS.
--   2) Backfill every current page + section one-for-one with explicit legacy IDs.
--   3) Project the current "site" pseudo-page into cms_globals without deleting it.
--   4) Seed revision metadata from the version/R2 pointers we actually have.
--   5) Leave cms_section_blocks for a separate R2-backed factual block backfill.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cms_pages (
  id                 TEXT PRIMARY KEY
    DEFAULT ('cmsp_' || lower(hex(randomblob(8)))),
  account_id         TEXT NOT NULL REFERENCES accounts(id),
  legacy_page_id     INTEGER UNIQUE,
  slug               TEXT NOT NULL,
  title              TEXT NOT NULL,
  page_type          TEXT NOT NULL DEFAULT 'standard'
    CHECK (page_type IN ('standard','scene','global')),
  status             TEXT NOT NULL DEFAULT 'draft',
  template_key       TEXT,
  metadata_json      TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_account_status
  ON cms_pages(account_id, status, slug);

CREATE TABLE IF NOT EXISTS cms_page_sections (
  id                  TEXT PRIMARY KEY
    DEFAULT ('cmss_' || lower(hex(randomblob(8)))),
  account_id          TEXT NOT NULL REFERENCES accounts(id),
  page_id             TEXT NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  legacy_section_id   INTEGER UNIQUE,
  section_key         TEXT NOT NULL,
  section_type        TEXT NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft',
  inline_content_json TEXT NOT NULL DEFAULT '{}',
  content_r2_key      TEXT,
  content_version     INTEGER NOT NULL DEFAULT 0,
  content_hash        TEXT,
  metadata_json       TEXT NOT NULL DEFAULT '{}',
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (page_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_page_sections_page
  ON cms_page_sections(page_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_cms_page_sections_type
  ON cms_page_sections(account_id, section_type, status);

CREATE TABLE IF NOT EXISTS cms_section_blocks (
  id             TEXT PRIMARY KEY
    DEFAULT ('cmsb_' || lower(hex(randomblob(8)))),
  account_id     TEXT NOT NULL REFERENCES accounts(id),
  section_id     TEXT NOT NULL REFERENCES cms_page_sections(id) ON DELETE CASCADE,
  block_key      TEXT NOT NULL,
  block_type     TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active',
  content_json   TEXT NOT NULL DEFAULT '{}',
  source_path    TEXT,
  metadata_json  TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (section_id, block_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_section_blocks_section
  ON cms_section_blocks(section_id, sort_order, id);

CREATE TABLE IF NOT EXISTS cms_revisions (
  id               TEXT PRIMARY KEY
    DEFAULT ('cmsr_' || lower(hex(randomblob(8)))),
  account_id       TEXT NOT NULL REFERENCES accounts(id),
  entity_type      TEXT NOT NULL
    CHECK (entity_type IN ('page','section','block','global')),
  entity_id        TEXT NOT NULL,
  revision_number  INTEGER NOT NULL DEFAULT 0,
  revision_kind    TEXT NOT NULL DEFAULT 'current'
    CHECK (revision_kind IN ('current','history','published','draft','imported')),
  content_r2_key   TEXT,
  content_hash     TEXT,
  snapshot_json    TEXT NOT NULL DEFAULT '{}',
  metadata_json    TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id, revision_number, revision_kind, content_r2_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_revisions_entity
  ON cms_revisions(account_id, entity_type, entity_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS cms_globals (
  id                    TEXT PRIMARY KEY
    DEFAULT ('cmsg_' || lower(hex(randomblob(8)))),
  account_id            TEXT NOT NULL REFERENCES accounts(id),
  global_key            TEXT NOT NULL,
  global_type           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',
  inline_content_json   TEXT NOT NULL DEFAULT '{}',
  content_r2_key        TEXT,
  content_version       INTEGER NOT NULL DEFAULT 0,
  content_hash          TEXT,
  legacy_page_id        INTEGER,
  legacy_section_id     INTEGER UNIQUE,
  metadata_json         TEXT NOT NULL DEFAULT '{}',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, global_key)
);

CREATE INDEX IF NOT EXISTS idx_cms_globals_account
  ON cms_globals(account_id, global_type, status);

-- Resolve this installed application's account by stable account_key, not UUID.
-- This keeps the migration readable/replayable while avoiding a customer UUID literal.
INSERT INTO cms_pages (
  id, account_id, legacy_page_id, slug, title, page_type, status,
  template_key, metadata_json, created_at, updated_at
)
SELECT
  'cmsp_legacy_' || p.id,
  a.id,
  p.id,
  p.slug,
  p.title,
  CASE
    WHEN p.slug = 'site' THEN 'global'
    WHEN EXISTS (
      SELECT 1 FROM page_sections sx
      WHERE sx.page_id = p.id AND sx.section_key = 'scene'
    ) THEN 'scene'
    ELSE 'standard'
  END,
  p.status,
  NULL,
  json_object(
    'legacy_source_table', 'pages',
    'legacy_page_id', p.id,
    'migration', 'cms-data-family-20261007'
  ),
  p.created_at,
  p.updated_at
FROM pages p
JOIN accounts a ON a.account_key = 'fuelnfreetime'
WHERE NOT EXISTS (
  SELECT 1 FROM cms_pages cp
  WHERE cp.account_id = a.id AND cp.slug = p.slug
);

INSERT INTO cms_page_sections (
  id, account_id, page_id, legacy_section_id, section_key, section_type,
  sort_order, status, inline_content_json, content_r2_key, content_version,
  content_hash, metadata_json, created_at, updated_at
)
SELECT
  'cmss_legacy_' || s.id,
  cp.account_id,
  cp.id,
  s.id,
  s.section_key,
  s.section_key,
  s.sort_order,
  s.status,
  CASE
    WHEN s.content_json IS NULL OR trim(s.content_json) = '' THEN '{}'
    ELSE s.content_json
  END,
  s.content_r2_key,
  s.content_version,
  s.content_hash,
  json_object(
    'legacy_source_table', 'page_sections',
    'legacy_section_id', s.id,
    'legacy_page_id', s.page_id,
    'legacy_history_prefix',
      'cms/pages/' || p.slug || '/history/',
    'migration', 'cms-data-family-20261007'
  ),
  s.created_at,
  s.updated_at
FROM page_sections s
JOIN pages p ON p.id = s.page_id
JOIN cms_pages cp ON cp.legacy_page_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM cms_page_sections cs
  WHERE cs.legacy_section_id = s.id
);

-- The old "site" page currently carries global brand/footer documents.
-- Project them into a dedicated global namespace while preserving the original rows.
INSERT INTO cms_globals (
  id, account_id, global_key, global_type, status, inline_content_json,
  content_r2_key, content_version, content_hash,
  legacy_page_id, legacy_section_id, metadata_json, created_at, updated_at
)
SELECT
  'cmsg_legacy_' || s.id,
  cp.account_id,
  s.section_key,
  s.section_key,
  s.status,
  CASE
    WHEN s.content_json IS NULL OR trim(s.content_json) = '' THEN '{}'
    ELSE s.content_json
  END,
  s.content_r2_key,
  s.content_version,
  s.content_hash,
  p.id,
  s.id,
  json_object(
    'legacy_source', 'site-page-section',
    'legacy_page_slug', p.slug,
    'migration', 'cms-data-family-20261007'
  ),
  s.created_at,
  s.updated_at
FROM pages p
JOIN page_sections s ON s.page_id = p.id
JOIN cms_pages cp ON cp.legacy_page_id = p.id
WHERE p.slug = 'site'
  AND NOT EXISTS (
    SELECT 1 FROM cms_globals cg
    WHERE cg.legacy_section_id = s.id
  );

-- Seed only revisions that are evidenced by existing D1 version/pointer state.
-- Historical R2 objects stay untouched and can be imported later without inventing data.
INSERT INTO cms_revisions (
  id, account_id, entity_type, entity_id, revision_number, revision_kind,
  content_r2_key, content_hash, snapshot_json, metadata_json, created_at
)
SELECT
  'cmsr_legacy_section_' || cs.legacy_section_id || '_v' || cs.content_version,
  cs.account_id,
  'section',
  cs.id,
  cs.content_version,
  CASE
    WHEN cs.content_r2_key LIKE '%/history/%' THEN 'history'
    WHEN cs.status = 'published' THEN 'published'
    ELSE 'current'
  END,
  cs.content_r2_key,
  cs.content_hash,
  cs.inline_content_json,
  json_object(
    'legacy_section_id', cs.legacy_section_id,
    'source', 'page_sections',
    'migration', 'cms-data-family-20261007'
  ),
  cs.updated_at
FROM cms_page_sections cs
WHERE NOT EXISTS (
  SELECT 1 FROM cms_revisions r
  WHERE r.entity_type = 'section'
    AND r.entity_id = cs.id
    AND r.revision_number = cs.content_version
    AND COALESCE(r.content_r2_key, '') = COALESCE(cs.content_r2_key, '')
);

INSERT INTO cms_revisions (
  id, account_id, entity_type, entity_id, revision_number, revision_kind,
  content_r2_key, content_hash, snapshot_json, metadata_json, created_at
)
SELECT
  'cmsr_legacy_global_' || cg.legacy_section_id || '_v' || cg.content_version,
  cg.account_id,
  'global',
  cg.id,
  cg.content_version,
  CASE WHEN cg.status = 'published' THEN 'published' ELSE 'current' END,
  cg.content_r2_key,
  cg.content_hash,
  cg.inline_content_json,
  json_object(
    'legacy_section_id', cg.legacy_section_id,
    'source', 'site-page-section',
    'migration', 'cms-data-family-20261007'
  ),
  cg.updated_at
FROM cms_globals cg
WHERE NOT EXISTS (
  SELECT 1 FROM cms_revisions r
  WHERE r.entity_type = 'global'
    AND r.entity_id = cg.id
    AND r.revision_number = cg.content_version
    AND COALESCE(r.content_r2_key, '') = COALESCE(cg.content_r2_key, '')
);
