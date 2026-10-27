-- Additive collection membership policy. Existing manual product assignments remain authoritative
-- for mode='manual' and are never deleted by the rules engine.
CREATE TABLE IF NOT EXISTS store_collection_rules (
  collection_id INTEGER PRIMARY KEY REFERENCES store_collections(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK(mode IN ('manual','automatic','hybrid')),
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
