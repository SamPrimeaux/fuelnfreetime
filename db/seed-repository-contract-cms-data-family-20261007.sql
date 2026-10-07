-- Track the live CMS data-family migration in agentsam_repository_contracts.
INSERT INTO agentsam_repository_contracts (
  id, account_id, repository_id, contract_key, contract_version, contract_type,
  name, description, manifest_path, contract_hash, status, metadata_json,
  created_at, updated_at
) VALUES (
  'rct_cms_data_family_v1',
  'acct_fuelnfreetime',
  'github:samprimeaux/fuelnfreetime',
  'schema.cms-data-family',
  '1.0.0',
  'schema',
  'CMS normalized data family',
  'Parallel normalized CMS page, section, block, revision and global tables with legacy provenance; renderer/editor authority remains on pages/page_sections during migration.',
  'db/migrate-cms-data-family-20261007.sql',
  '396d08196d946e730ab4be61e8a2320d553a2c22a28e0b6f2ee4e92f77cedda1',
  'active',
  '{"tables":["cms_pages","cms_page_sections","cms_section_blocks","cms_revisions","cms_globals"],"legacy_authority":["pages","page_sections"],"migration_mode":"parallel-backfill","hash_algorithm":"sha256"}',
  unixepoch(),
  unixepoch()
)
ON CONFLICT(repository_id,contract_key,contract_version) DO UPDATE SET
  account_id=excluded.account_id,
  contract_type=excluded.contract_type,
  name=excluded.name,
  description=excluded.description,
  manifest_path=excluded.manifest_path,
  contract_hash=excluded.contract_hash,
  status=excluded.status,
  metadata_json=excluded.metadata_json,
  updated_at=unixepoch();
