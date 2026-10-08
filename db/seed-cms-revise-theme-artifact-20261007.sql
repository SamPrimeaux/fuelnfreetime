-- Register the content-addressed Revise package implementation already uploaded
-- under cms/artifacts/theme/revise/<manifest-sha256>/ in WEBSITE_ASSETS.
INSERT INTO cms_artifacts (
  id,account_id,artifact_key,artifact_type,version,r2_prefix,manifest_r2_key,
  content_hash,content_mode,status,source_kind,source_ref,metadata_json
)
SELECT
  'cmsa_f6b40d147e64eaf9b947e395',
  (SELECT account_id FROM cms_pages ORDER BY created_at,id LIMIT 1),
  'theme/revise',
  'theme',
  '0.2.0+f6b40d147e64',
  'cms/artifacts/theme/revise/f6b40d147e64eaf9b947e395f3d44628c1706b53c4194c9cbedafeec9a61bfbd/',
  'cms/artifacts/theme/revise/f6b40d147e64eaf9b947e395f3d44628c1706b53c4194c9cbedafeec9a61bfbd/manifest.json',
  'f6b40d147e64eaf9b947e395f3d44628c1706b53c4194c9cbedafeec9a61bfbd',
  'bundle',
  'ready',
  'package',
  '@inneranimalmedia/revise-theme@0.2.0',
  '{"bundle_sha256":"80f43a8c48dac786665b7d369537d7b383923c6dde51845707d7ff30d4808d34","contract_version":1,"theme":"revise","immutable":true}'
WHERE NOT EXISTS (
  SELECT 1 FROM cms_artifacts
  WHERE account_id=(SELECT account_id FROM cms_pages ORDER BY created_at,id LIMIT 1)
    AND artifact_key='theme/revise'
    AND version='0.2.0+f6b40d147e64'
);

UPDATE cms_definitions
SET artifact_id='cmsa_f6b40d147e64eaf9b947e395',
    updated_at=datetime('now')
WHERE account_id=(SELECT account_id FROM cms_pages ORDER BY created_at,id LIMIT 1)
  AND kind='section'
  AND origin='package'
  AND definition_key IN ('editorial-grid','collection-split-media','before-after','testimonials')
  AND artifact_id IS NULL;
