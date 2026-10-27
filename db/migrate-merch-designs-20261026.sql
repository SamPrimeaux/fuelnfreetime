-- Merchandise design library for Product Studio. Not CMS page/theme data.
-- All design identities are scoped to the currently authenticated account.
CREATE TABLE IF NOT EXISTS merch_designs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES auth_users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private','team')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','archived')),
  current_revision INTEGER NOT NULL DEFAULT 1 CHECK (current_revision > 0),
  thumbnail_media_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_merch_designs_account
  ON merch_designs(account_id, status, updated_at DESC);
CREATE TABLE IF NOT EXISTS merch_design_revisions (
  design_id TEXT NOT NULL REFERENCES merch_designs(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  canvas_json TEXT NOT NULL DEFAULT '{}',
  placements_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL REFERENCES auth_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (design_id, revision)
);
CREATE TABLE IF NOT EXISTS merch_design_collections (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES auth_users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'team' CHECK (visibility IN ('private','team')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_merch_collections_account
  ON merch_design_collections(account_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS merch_design_collection_items (
  collection_id TEXT NOT NULL REFERENCES merch_design_collections(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL REFERENCES merch_designs(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (collection_id, design_id)
);
CREATE INDEX IF NOT EXISTS idx_merch_collection_items_design
  ON merch_design_collection_items(design_id);
CREATE TABLE IF NOT EXISTS merch_design_draft_links (
  draft_id TEXT PRIMARY KEY REFERENCES product_studio_drafts(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL REFERENCES merch_designs(id),
  design_revision INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  applied_by TEXT NOT NULL REFERENCES auth_users(id),
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (design_id, design_revision)
    REFERENCES merch_design_revisions(design_id, revision)
);
CREATE INDEX IF NOT EXISTS idx_merch_design_draft_links_design
  ON merch_design_draft_links(design_id, design_revision);
CREATE TABLE IF NOT EXISTS merch_design_provider_links (
  design_id TEXT NOT NULL REFERENCES merch_designs(id) ON DELETE CASCADE,
  design_revision INTEGER NOT NULL,
  provider TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  provider_design_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'linked',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (design_id, design_revision, provider, shop_id, slot),
  FOREIGN KEY (design_id, design_revision)
    REFERENCES merch_design_revisions(design_id, revision)
);

CREATE TABLE IF NOT EXISTS merch_design_exports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL REFERENCES merch_designs(id) ON DELETE CASCADE,
  design_revision INTEGER NOT NULL,
  slot TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_export_id TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id,provider,provider_export_id),
  FOREIGN KEY (design_id, design_revision) REFERENCES merch_design_revisions(design_id,revision)
);
CREATE INDEX IF NOT EXISTS idx_merch_design_exports_design
  ON merch_design_exports(design_id,design_revision);
