-- First-class Online Store theme lifecycle.
-- Theme installation/activation is separate from agentsam_products catalog status
-- and separate from page publishing. Exactly one theme may be active.

CREATE TABLE IF NOT EXISTS store_themes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  package_version TEXT,
  source_kind TEXT NOT NULL DEFAULT 'package'
    CHECK(source_kind IN ('package','local','imported')),
  source_ref TEXT,
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK(state IN ('active','draft','archived')),
  editor_mode TEXT NOT NULL DEFAULT 'package'
    CHECK(editor_mode IN ('legacy','package')),
  preview_path TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}'
    CHECK(json_valid(settings_json) AND json_type(settings_json)='object'),
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK(json_valid(metadata_json) AND json_type(metadata_json)='object'),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_themes_single_active
  ON store_themes(state)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS idx_store_themes_state_updated
  ON store_themes(state, updated_at DESC);

CREATE TABLE IF NOT EXISTS store_theme_events (
  id TEXT PRIMARY KEY DEFAULT ('themeevt_' || lower(hex(randomblob(8)))),
  theme_id TEXT NOT NULL REFERENCES store_themes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('installed','saved','published','unpublished','archived','restored')),
  from_state TEXT,
  to_state TEXT,
  actor_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK(json_valid(metadata_json) AND json_type(metadata_json)='object'),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_store_theme_events_theme
  ON store_theme_events(theme_id, created_at DESC);

-- Register the currently-live customer theme without changing storefront output.
INSERT INTO store_themes (
  id, slug, name, package_name, package_version, source_kind, source_ref,
  state, editor_mode, preview_path, metadata_json
) VALUES (
  'theme_heuristic',
  'heuristic',
  'Heuristic',
  '@inneranimalmedia/heuristic-theme',
  '0.1.0',
  'local',
  'packages/heuristic-theme/theme.json',
  'active',
  'legacy',
  '/',
  json_object('role','current_customer_theme','runtime','legacy-static-storefront')
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  package_name = excluded.package_name,
  package_version = excluded.package_version,
  source_kind = excluded.source_kind,
  source_ref = excluded.source_ref,
  editor_mode = excluded.editor_mode,
  preview_path = excluded.preview_path,
  metadata_json = excluded.metadata_json,
  updated_at = datetime('now');

-- Register Revise as an unpublished alternate. This does NOT activate it.
INSERT INTO store_themes (
  id, slug, name, package_name, package_version, source_kind, source_ref,
  state, editor_mode, preview_path, metadata_json
) VALUES (
  'theme_revise',
  'revise',
  'Revise',
  '@inneranimalmedia/revise-theme',
  '0.2.0',
  'package',
  '@inneranimalmedia/revise-theme/theme.json',
  'draft',
  'package',
  '/api/admin/store/themes/revise/preview?slug=shop',
  json_object(
    'role','alternate_customer_theme',
    'contractVersion',1,
    'contentAuthority','customer-theme-workspace',
    'publishReady',0,
    'runtimeReady',0
  )
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  package_name = excluded.package_name,
  package_version = excluded.package_version,
  source_kind = excluded.source_kind,
  source_ref = excluded.source_ref,
  editor_mode = excluded.editor_mode,
  preview_path = excluded.preview_path,
  metadata_json = excluded.metadata_json,
  updated_at = datetime('now');

INSERT OR IGNORE INTO store_theme_events(id,theme_id,event_type,to_state,metadata_json)
VALUES ('themeevt_install_heuristic','theme_heuristic','installed','active',json_object('migration','migrate-store-themes.sql'));

INSERT OR IGNORE INTO store_theme_events(id,theme_id,event_type,to_state,metadata_json)
VALUES ('themeevt_install_revise','theme_revise','installed','draft',json_object('migration','migrate-store-themes.sql'));

-- Theme-scoped editable page documents. Draft theme workspaces never touch the
-- live pages/page_sections CMS tables. The active theme may later be resolved
-- to these documents by the storefront runtime when that theme is published.
CREATE TABLE IF NOT EXISTS store_theme_pages (
  theme_id TEXT NOT NULL REFERENCES store_themes(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  route TEXT NOT NULL,
  document_json TEXT NOT NULL CHECK(json_valid(document_json) AND json_type(document_json)='object'),
  media_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(media_json) AND json_type(media_json)='object'),
  shell_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(shell_json) AND json_type(shell_json)='object'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(theme_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_theme_pages_theme
  ON store_theme_pages(theme_id, updated_at DESC);
