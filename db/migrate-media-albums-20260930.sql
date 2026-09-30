-- Reusable media organization: non-destructive albums over the durable media library.
-- Folders remain coarse storage categories; albums are creative/campaign curation.

CREATE TABLE IF NOT EXISTS media_albums (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  description          TEXT,
  cover_media_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  meta_json            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_album_assets (
  album_id       INTEGER NOT NULL REFERENCES media_albums(id) ON DELETE CASCADE,
  media_asset_id INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL DEFAULT 0,
  added_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (album_id, media_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_media_album_assets_album_position
  ON media_album_assets(album_id, position, media_asset_id);

CREATE INDEX IF NOT EXISTS idx_media_album_assets_media
  ON media_album_assets(media_asset_id, album_id);
