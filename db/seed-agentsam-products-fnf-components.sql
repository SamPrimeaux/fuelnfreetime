-- Fuel & Free Time reusable product/component catalog for inneranimalmedia-business.
-- Repository ownership is resolved at execution time; never bake a repository id here.
-- Safe to rerun. Existing product rows are preserved; missing boundaries are inserted.

WITH v(
  slug,name,kind,status,description,canonical_path,package_name,version,tags,metadata
) AS (
  VALUES
  ('ecommerce-cms-agentsam','AgentSam Ecommerce + CMS','app','wired',
   'Canonical Fuel & Free Time commerce admin, CMS, AgentSam and storefront application.',
   'apps/ecommerce-cms-agentsam','@inneranimalmedia/ecommerce-cms-agentsam','0.2.0',
   '["commerce","cms","agentsam","admin"]',
   '{"origin":"developer","component_family":"commerce-cms"}'),
  ('commerce-admin-nav','Commerce Admin Nav','ui-component','scaffolded',
   'Reusable commerce admin navigation and shell boundary currently implemented by the ecommerce app shell.',
   'apps/ecommerce-cms-agentsam/frontend/shell.js','@inneranimalmedia/commerce-admin-nav','0.1.0',
   '["navigation","admin-shell","commerce"]',
   '{"origin":"developer","packaging_state":"planned","current_owner":"ecommerce-cms-agentsam"}'),
  ('mini-agentsam','miniAgentSam','ui-component','wired',
   'Contextual AgentSam selection, annotation and compact composer UI.',
   'packages/agentsam-workbench/src/mini-agentsam.js','@inneranimalmedia/mini-agentsam','0.1.0',
   '["agentsam","annotation","composer","ui"]',
   '{"origin":"developer","packaging_state":"embedded","current_package":"@inneranimalmedia/agentsam-workbench"}'),
  ('theme-studio','Theme Studio','ui-component','wired',
   'Live storefront theme and CMS section authoring surface.',
   'apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html','@inneranimalmedia/theme-studio','0.1.0',
   '["cms","theme","editor","storefront"]',
   '{"origin":"developer","packaging_state":"planned","current_owner":"ecommerce-cms-agentsam"}'),
  ('agentsam-workbench','AgentSam Workbench','sdk-package','wired',
   'Reusable AgentSam workbench primitives and contextual UI runtime.',
   'packages/agentsam-workbench','@inneranimalmedia/agentsam-workbench','0.1.0',
   '["agentsam","workbench","composer"]',
   '{"origin":"developer"}'),
  ('commerce-email','Commerce Email','ui-component','wired',
   'Commerce mailbox and email administration surface.',
   'apps/ecommerce-cms-agentsam/frontend/static/js/mail.js','@inneranimalmedia/commerce-email','0.1.0',
   '["commerce","email","mailbox","admin"]',
   '{"origin":"developer","packaging_state":"planned","current_owner":"ecommerce-cms-agentsam"}'),
  ('heuristic','Heuristic','theme','wired',
   'Reusable Fuel & Free Time storefront theme.',
   'packages/heuristic-theme','@inneranimalmedia/heuristic-theme','0.1.0',
   '["theme","storefront","commerce"]',
   '{"origin":"developer"}'),
  ('commerce-analytics','Commerce Analytics','ui-component','wired',
   'Reusable analytics presentation primitives for commerce/admin shells.',
   'packages/commerce-analytics','@inneranimalmedia/commerce-analytics','0.1.0',
   '["analytics","commerce","charts","admin"]',
   '{"origin":"developer","packaging_state":"package"}')
)
INSERT INTO agentsam_products (
  slug,name,kind,status,description,repository_id,
  canonical_path,package_name,version,tags,metadata
)
SELECT
  v.slug,v.name,v.kind,v.status,v.description,r.id,
  v.canonical_path,v.package_name,v.version,v.tags,
  json_set(v.metadata,'$.account_id',r.account_id)
FROM v
JOIN code_repositories r
  ON r.provider='github'
 AND lower(r.repo_full_name)='samprimeaux/fuelnfreetime'
 AND r.is_active=1
WHERE 1
ON CONFLICT(slug) DO NOTHING;

-- miniAgentSam is already a live component; update its intended standalone package
-- identity while recording that the implementation remains embedded in Workbench.
UPDATE agentsam_products
SET package_name='@inneranimalmedia/mini-agentsam',
    tags='["agentsam","annotation","composer","ui"]',
    metadata=json_patch(
      metadata,
      '{"packaging_state":"embedded","current_package":"@inneranimalmedia/agentsam-workbench"}'
    )
WHERE slug='mini-agentsam';

INSERT INTO asset_relationships (
  source_type,source_id,target_type,target_id,relationship_type,metadata
)
SELECT
  'agentsam_product',component.id,
  'agentsam_product',app.id,
  'consumed_by',
  '{"origin":"developer","managed_by":"fnf-component-catalog"}'
FROM agentsam_products component
JOIN agentsam_products app ON app.slug='ecommerce-cms-agentsam'
WHERE component.slug IN (
  'commerce-admin-nav','mini-agentsam','theme-studio','agentsam-workbench',
  'commerce-email','heuristic','commerce-analytics'
)
ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type)
DO UPDATE SET metadata=excluded.metadata;

INSERT INTO asset_relationships (
  source_type,source_id,target_type,target_id,relationship_type,metadata
)
SELECT
  'agentsam_product',mini.id,
  'agentsam_product',workbench.id,
  'packaged_as',
  '{"origin":"developer","managed_by":"fnf-component-catalog","state":"embedded"}'
FROM agentsam_products mini
JOIN agentsam_products workbench
WHERE mini.slug='mini-agentsam'
  AND workbench.slug='agentsam-workbench'
ON CONFLICT(source_type,source_id,target_type,target_id,relationship_type)
DO UPDATE SET metadata=excluded.metadata;
