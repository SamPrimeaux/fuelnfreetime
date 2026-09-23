-- Shared catalog contract for fuelnfreetime and inneranimalmedia-business.
-- Preserves rows, fails on invalid data, and never reads commerce/provider tables.
-- Store-local repository projection: resolved registry IDs, not invented IDs.
CREATE TABLE IF NOT EXISTS code_repositories (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('github','local','cloudflare','gitlab','bitbucket','upload')),
  provider_repository_id TEXT,
  owner TEXT,
  name TEXT NOT NULL,
  repo_full_name TEXT,
  default_branch TEXT,
  source_uri TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS asset_relationships (
  id TEXT PRIMARY KEY DEFAULT ('rel_' || lower(hex(randomblob(8)))),
  source_type TEXT NOT NULL, source_id TEXT NOT NULL,
  target_type TEXT NOT NULL, target_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);
-- Baseline permits this migration on a new installation as well as either live schema.
CREATE TABLE IF NOT EXISTS agentsam_products (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'prototype', description TEXT,
  repository_id TEXT, source_type TEXT, source_id TEXT, canonical_path TEXT,
  package_name TEXT, version TEXT, tags TEXT, metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
DROP TRIGGER IF EXISTS agentsam_products_ai;
DROP TRIGGER IF EXISTS agentsam_products_ad;
DROP TRIGGER IF EXISTS agentsam_products_au;
DROP TRIGGER IF EXISTS agentsam_products_au_fts;
DROP TRIGGER IF EXISTS agentsam_products_au_relationships;
DROP TRIGGER IF EXISTS agentsam_products_touch;
DROP TRIGGER IF EXISTS agentsam_products_no_provider_insert;
DROP TRIGGER IF EXISTS agentsam_products_no_provider_update;
DROP TABLE IF EXISTS agentsam_products_fts;
CREATE TABLE agentsam_products_next (
  id TEXT PRIMARY KEY DEFAULT ('prod_' || lower(hex(randomblob(8)))),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('ui-component','sdk-package','integration','theme','section','block','app','script','service','solution','product','collection','product-line')),
  status TEXT NOT NULL DEFAULT 'prototype' CHECK(status IN ('prototype','scaffolded','wired','production','deprecated')),
  description TEXT,
  repository_id TEXT REFERENCES code_repositories(id) ON DELETE SET NULL,
  source_type TEXT, source_id TEXT,
  canonical_path TEXT, package_name TEXT, version TEXT,
  tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags) AND json_type(tags)='array'),
  metadata TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata) AND json_type(metadata)='object'),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK((source_type IS NULL AND source_id IS NULL) OR (source_type IS NOT NULL AND source_id IS NOT NULL)),
  CHECK(source_type IS NULL OR lower(source_type) NOT LIKE 'completeful%'),
  CHECK(COALESCE(lower(json_extract(metadata,'$.origin')),'') NOT IN ('completeful','provider-import'))
);
INSERT INTO agentsam_products_next
 SELECT id,slug,name,kind,status,description,repository_id,source_type,source_id,
 canonical_path,package_name,version,COALESCE(tags,'[]'),metadata,created_at,updated_at
 FROM agentsam_products;
DROP TABLE agentsam_products;
ALTER TABLE agentsam_products_next RENAME TO agentsam_products;
CREATE INDEX idx_agentsam_products_kind ON agentsam_products(kind);
CREATE INDEX idx_agentsam_products_repository ON agentsam_products(repository_id);
CREATE INDEX idx_agentsam_products_source ON agentsam_products(source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_asset_relationships_target ON asset_relationships(target_type,target_id,relationship_type);
CREATE VIRTUAL TABLE agentsam_products_fts USING fts5(slug,name,description,tags,canonical_path,package_name,content='agentsam_products',content_rowid='rowid');
INSERT INTO agentsam_products_fts(agentsam_products_fts) VALUES('rebuild');
CREATE TRIGGER agentsam_products_ai AFTER INSERT ON agentsam_products BEGIN
 INSERT INTO agentsam_products_fts(rowid,slug,name,description,tags,canonical_path,package_name)
 VALUES(new.rowid,new.slug,new.name,new.description,new.tags,new.canonical_path,new.package_name);
 INSERT INTO asset_relationships(source_type,source_id,target_type,target_id,relationship_type,metadata)
 SELECT 'agentsam_product',new.id,'code_repository',new.repository_id,'defined_in',json_object('managed_by','agentsam_products','canonical_path',new.canonical_path,'package_name',new.package_name,'version',new.version)
 WHERE new.repository_id IS NOT NULL
 ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type) DO UPDATE SET metadata=excluded.metadata;
 INSERT INTO asset_relationships(source_type,source_id,target_type,target_id,relationship_type,metadata)
 SELECT 'agentsam_product',new.id,new.source_type,new.source_id,'sourced_from',json_object('managed_by','agentsam_products')
 WHERE new.source_type IS NOT NULL
 ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type) DO UPDATE SET metadata=excluded.metadata;
END;
CREATE TRIGGER agentsam_products_ad AFTER DELETE ON agentsam_products BEGIN
 INSERT INTO agentsam_products_fts(agentsam_products_fts,rowid,slug,name,description,tags,canonical_path,package_name)
 VALUES('delete',old.rowid,old.slug,old.name,old.description,old.tags,old.canonical_path,old.package_name);
 DELETE FROM asset_relationships WHERE (source_type='agentsam_product' AND source_id=old.id) OR (target_type='agentsam_product' AND target_id=old.id);
END;
CREATE TRIGGER agentsam_products_au_fts AFTER UPDATE ON agentsam_products BEGIN
 INSERT INTO agentsam_products_fts(agentsam_products_fts,rowid,slug,name,description,tags,canonical_path,package_name)
 VALUES('delete',old.rowid,old.slug,old.name,old.description,old.tags,old.canonical_path,old.package_name);
 INSERT INTO agentsam_products_fts(rowid,slug,name,description,tags,canonical_path,package_name)
 VALUES(new.rowid,new.slug,new.name,new.description,new.tags,new.canonical_path,new.package_name);
END;
CREATE TRIGGER agentsam_products_au_relationships AFTER UPDATE OF repository_id,source_type,source_id,canonical_path,package_name,version ON agentsam_products BEGIN
 DELETE FROM asset_relationships WHERE source_type='agentsam_product' AND source_id=old.id AND relationship_type IN ('defined_in','sourced_from') AND json_extract(metadata,'$.managed_by')='agentsam_products';
 INSERT INTO asset_relationships(source_type,source_id,target_type,target_id,relationship_type,metadata)
 SELECT 'agentsam_product',new.id,'code_repository',new.repository_id,'defined_in',json_object('managed_by','agentsam_products','canonical_path',new.canonical_path,'package_name',new.package_name,'version',new.version)
 WHERE new.repository_id IS NOT NULL
 ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type) DO UPDATE SET metadata=excluded.metadata;
 INSERT INTO asset_relationships(source_type,source_id,target_type,target_id,relationship_type,metadata)
 SELECT 'agentsam_product',new.id,new.source_type,new.source_id,'sourced_from',json_object('managed_by','agentsam_products')
 WHERE new.source_type IS NOT NULL
 ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type) DO UPDATE SET metadata=excluded.metadata;
END;
CREATE TRIGGER agentsam_products_touch AFTER UPDATE OF slug,name,kind,status,description,repository_id,source_type,source_id,canonical_path,package_name,version,tags,metadata ON agentsam_products BEGIN
 UPDATE agentsam_products SET updated_at=unixepoch() WHERE id=new.id;
END;
-- Reconcile managed edges for preserved rows without touching unrelated topology.
UPDATE agentsam_products SET repository_id=repository_id;
