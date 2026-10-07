-- Track the canonical artifact-aware CMS schema.
INSERT INTO agentsam_repository_contracts (
  id, account_id, repository_id, contract_key, contract_version, contract_type,
  name, description, manifest_path, contract_hash, status, metadata_json,
  created_at, updated_at
) VALUES (
  'rct_cms_artifact_blocks_v1',
  'acct_fuelnfreetime',
  'github:samprimeaux/fuelnfreetime',
  'schema.cms-artifacts-block-system',
  '1.0.0',
  'schema',
  'CMS artifact + nested block system',
  'Canonical D1/SQLite CMS schema with artifact-backed custom blocks, nested groups, provider-neutral artifact provenance and block integrity guards.',
  'db/schema/cms.sql',
  'c5197d54540195b2119fd57077da4305f406eb43fb41ad88e4945d15f33b1577',
  'active',
  '{"tables":["cms_artifacts","cms_section_blocks"],"canonical_schema":"db/schema/cms.sql","migration":"db/migrate-cms-artifacts-block-tree-20261007.sql","integrity_migration":"db/migrate-cms-block-integrity-20261007.sql","block_registry":"apps/ecommerce-cms-agentsam/cms/block-types.json","hash_algorithm":"sha256"}',
  unixepoch(),
  unixepoch()
)
ON CONFLICT(repository_id,contract_key,contract_version) DO UPDATE SET
  name=excluded.name,
  description=excluded.description,
  manifest_path=excluded.manifest_path,
  contract_hash=excluded.contract_hash,
  status=excluded.status,
  metadata_json=excluded.metadata_json,
  updated_at=unixepoch();
