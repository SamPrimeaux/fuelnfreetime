-- Idempotent evolution of the EXISTING cms_definitions block family.
-- v1 records and all existing block instances are preserved.
-- Uses cms_pages only to enumerate already-registered merchant accounts.
INSERT INTO cms_definitions (
  account_id, definition_key, kind, label, category, origin, version,
  settings_schema_json, allowed_blocks_json, metadata_json, status
)
SELECT DISTINCT p.account_id, 'button', 'block', 'Button', 'basic', 'built_in', '2',
  '{"label":{"type":"text","label":"Button text","group":"content"},"href":{"type":"link","label":"Destination","group":"links"},"openInNewTab":{"type":"boolean","label":"Open in new tab","group":"links","default":false},"style":{"type":"text","label":"Style","group":"appearance"}}',
  '[]',
  '{"canonical":true,"source":"cms-block-types","contract":"button.v2","note":"Only renderer-supported appearance controls may be added"}',
  'active'
FROM cms_pages p
WHERE NOT EXISTS (
  SELECT 1 FROM cms_definitions d WHERE d.account_id=p.account_id
    AND d.kind='block' AND d.definition_key='button' AND d.version='2'
);
