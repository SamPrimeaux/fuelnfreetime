-- Automatic media asset processing jobs (upload → process → ready).
CREATE TABLE IF NOT EXISTS media_asset_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  media_asset_id INTEGER,
  intake_key TEXT NOT NULL,
  canonical_key TEXT,
  pipeline TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  -- queued | processing | succeeded | failed | skipped
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  plan_json TEXT,
  result_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_media_asset_jobs_status ON media_asset_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_asset_jobs_media ON media_asset_jobs(media_asset_id);
