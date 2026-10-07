-- AgentSam tool authority normalization — 2026-10-07
--
-- Goals:
--   1) agentsam_tools is the one tool→capability authority.
--   2) agentsam_capabilities remains the reusable capability dictionary.
--   3) resource scope + allowed operations are first-class columns, not hidden in handler_config.
--   4) agentsam_tool_capabilities becomes a compatibility VIEW, not a duplicate writer.
--   5) capability keys are domain-first and provider-neutral.

PRAGMA foreign_keys = OFF;

ALTER TABLE agentsam_tools ADD COLUMN app_id TEXT;
ALTER TABLE agentsam_tools ADD COLUMN resource_scope_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE agentsam_tools ADD COLUMN operations_json TEXT NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_agentsam_tools_app
  ON agentsam_tools(account_id, app_id, is_active, sort_priority);
CREATE INDEX IF NOT EXISTS idx_agentsam_tools_capability
  ON agentsam_tools(account_id, capability_key, is_active, sort_priority);

-- Provider App ownership.
UPDATE agentsam_tools SET app_id = 'completeful'
WHERE plugin_key = 'completeful' AND (app_id IS NULL OR app_id = '');

-- Promote plugin installation scopes into each provider tool.
UPDATE agentsam_tools
SET resource_scope_json = COALESCE(
  (
    SELECT p.resource_scope_json
    FROM agentsam_plugins p
    WHERE p.account_id = agentsam_tools.account_id
      AND p.plugin_key = agentsam_tools.plugin_key
      AND p.is_enabled = 1
    ORDER BY CASE WHEN p.environment = 'production' THEN 0 ELSE 1 END, p.updated_at DESC
    LIMIT 1
  ),
  resource_scope_json
)
WHERE plugin_key IS NOT NULL;

-- For internal FNF tools, preserve the already-scoped fnf_scope where present.
UPDATE agentsam_tools
SET resource_scope_json = json(json_extract(handler_config, '$.fnf_scope'))
WHERE json_type(handler_config, '$.fnf_scope') = 'object';

-- If no nested scope exists, at minimum bind the tool to its owning application account.
UPDATE agentsam_tools
SET resource_scope_json = json_object('account_id', account_id)
WHERE resource_scope_json IS NULL
   OR trim(resource_scope_json) = ''
   OR resource_scope_json = '{}';

-- Canonical capability namespace.
UPDATE agentsam_tools SET capability_key = CASE capability_key
  WHEN 'catalog.read' THEN 'commerce.catalog.read'
  WHEN 'catalog.search' THEN 'commerce.catalog.search'
  WHEN 'catalog.sync' THEN 'commerce.catalog.sync'
  WHEN 'design.create' THEN 'commerce.design.create'
  WHEN 'order.create' THEN 'commerce.order.create'
  WHEN 'order.quote' THEN 'commerce.order.quote'
  WHEN 'product.publish' THEN 'commerce.product.publish'
  WHEN 'product.sync' THEN 'commerce.product.sync'
  WHEN 'agentsam.ai.models' THEN 'agentsam.models.read'
  WHEN 'agentsam.analytics.summary' THEN 'agentsam.analytics.read'
  WHEN 'assets.brand.audit' THEN 'media.brand.audit'
  WHEN 'assets.content.link' THEN 'media.content.link'
  WHEN 'assets.glb.inspect' THEN 'media.glb.inspect'
  WHEN 'assets.glb.optimize' THEN 'media.glb.optimize'
  WHEN 'assets.icon.generate' THEN 'media.icon.generate'
  WHEN 'assets.icon.optimize' THEN 'media.icon.optimize'
  WHEN 'assets.image.optimize' THEN 'media.image.optimize'
  WHEN 'assets.image.variant_plan' THEN 'media.image.variant.plan'
  WHEN 'assets.media.list' THEN 'media.library.read'
  WHEN 'assets.media.sync' THEN 'media.library.sync'
  WHEN 'assets.media.upload' THEN 'media.asset.create'
  WHEN 'assets.publish' THEN 'media.asset.publish'
  WHEN 'assets.video.optimize' THEN 'media.video.optimize'
  WHEN 'assets.video.thumbnail' THEN 'media.video.thumbnail'
  WHEN 'cf.d1.query' THEN 'database.query'
  WHEN 'cf.r2.list' THEN 'storage.objects.list'
  WHEN 'cms.pages.list' THEN 'cms.pages.read'
  WHEN 'deploy.worker' THEN 'deployment.worker.deploy'
  WHEN 'fnf.semantic_search' THEN 'retrieval.semantic.search'
  WHEN 'github.repo.list' THEN 'repository.list'
  WHEN 'mcp.bridge.status' THEN 'integration.mcp.status'
  WHEN 'store.orders.list' THEN 'commerce.orders.read'
  WHEN 'store.products.list' THEN 'commerce.products.read'
  ELSE capability_key
END
WHERE capability_key IS NOT NULL;

-- Rebuild the capability dictionary from the tools that actually exist.
-- Existing hand-authored descriptions win where already useful.
INSERT INTO agentsam_capabilities (
  capability_key, domain, verb, description, is_mutating, is_active, created_at, updated_at
)
SELECT DISTINCT
  t.capability_key,
  COALESCE(NULLIF(t.domain, ''), 'general'),
  CASE
    WHEN t.capability_key LIKE '%.read' THEN 'read'
    WHEN t.capability_key LIKE '%.list' THEN 'list'
    WHEN t.capability_key LIKE '%.search' THEN 'search'
    WHEN t.capability_key LIKE '%.query' THEN 'query'
    WHEN t.capability_key LIKE '%.inspect' THEN 'inspect'
    WHEN t.capability_key LIKE '%.status' THEN 'status'
    WHEN t.capability_key LIKE '%.create' THEN 'create'
    WHEN t.capability_key LIKE '%.update' THEN 'update'
    WHEN t.capability_key LIKE '%.sync' THEN 'sync'
    WHEN t.capability_key LIKE '%.generate' THEN 'generate'
    WHEN t.capability_key LIKE '%.optimize' THEN 'optimize'
    WHEN t.capability_key LIKE '%.publish' THEN 'publish'
    WHEN t.capability_key LIKE '%.deploy' THEN 'deploy'
    WHEN t.capability_key LIKE '%.link' THEN 'link'
    WHEN t.capability_key LIKE '%.send' THEN 'send'
    ELSE 'execute'
  END,
  COALESCE(NULLIF(t.description, ''), t.display_name),
  CASE
    WHEN t.connector_access_class = 'write' THEN 1
    WHEN t.requires_approval = 1 OR t.requires_confirmation = 1 THEN 1
    WHEN t.capability_key LIKE '%.create'
      OR t.capability_key LIKE '%.update'
      OR t.capability_key LIKE '%.sync'
      OR t.capability_key LIKE '%.generate'
      OR t.capability_key LIKE '%.optimize'
      OR t.capability_key LIKE '%.publish'
      OR t.capability_key LIKE '%.deploy'
      OR t.capability_key LIKE '%.link'
      OR t.capability_key LIKE '%.send'
    THEN 1
    ELSE 0
  END,
  1,
  unixepoch(),
  unixepoch()
FROM agentsam_tools t
WHERE t.capability_key IS NOT NULL
ON CONFLICT(capability_key) DO UPDATE SET
  domain = excluded.domain,
  verb = excluded.verb,
  is_mutating = excluded.is_mutating,
  is_active = 1,
  updated_at = unixepoch();

-- Remove superseded aliases after the canonical rows exist.
DELETE FROM agentsam_capabilities
WHERE capability_key IN (
  'catalog.read',
  'catalog.search',
  'catalog.sync',
  'design.create',
  'order.create',
  'order.quote',
  'product.publish',
  'product.sync'
);

UPDATE agentsam_plugins
SET capabilities_json = '["commerce.catalog.read","commerce.catalog.search","commerce.catalog.sync","commerce.design.create","commerce.order.quote","commerce.order.create","commerce.product.sync","commerce.product.publish"]',
    updated_at = unixepoch()
WHERE plugin_key = 'completeful';

-- The capability dictionary determines the read/write access class.
UPDATE agentsam_tools
SET connector_access_class = CASE
  WHEN COALESCE((SELECT c.is_mutating FROM agentsam_capabilities c
                 WHERE c.capability_key = agentsam_tools.capability_key), 0) = 1
  THEN 'write'
  ELSE 'read'
END
WHERE capability_key IS NOT NULL;

-- Make the allowed operation legible without decoding handler_config.
UPDATE agentsam_tools
SET operations_json = json_array(
  COALESCE(
    NULLIF(json_extract(handler_config, '$.operation'), ''),
    (SELECT c.verb FROM agentsam_capabilities c
      WHERE c.capability_key = agentsam_tools.capability_key),
    lower(NULLIF(json_extract(handler_config, '$.method'), '')),
    'execute'
  )
)
WHERE capability_key IS NOT NULL;

-- Link tools to installed plugins where a plugin key already exists.
UPDATE agentsam_tools
SET plugin_id = (
  SELECT p.id FROM agentsam_plugins p
  WHERE p.account_id = agentsam_tools.account_id
    AND p.plugin_key = agentsam_tools.plugin_key
  ORDER BY CASE WHEN p.environment = 'production' THEN 0 ELSE 1 END, p.updated_at DESC
  LIMIT 1
)
WHERE plugin_key IS NOT NULL AND (plugin_id IS NULL OR plugin_id = '');

-- Registered Completeful mutations without a curated executor stay visible in data
-- but are not selectable/callable until the provider adapter implements them.
UPDATE agentsam_tools
SET is_degraded = 1,
    notes = trim(COALESCE(notes || ' ', '') || 'AgentSam executor pending in completeful-tools.js.'),
    updated_at = unixepoch()
WHERE plugin_key = 'completeful'
  AND json_extract(handler_config, '$.operation') IN (
    'design.create',
    'order.create',
    'order.quote',
    'product.publish',
    'product.sync'
  );

-- The old relationship table duplicates agentsam_tools.capability_key.
-- Preserve its read shape as a compatibility projection, with no second writer.
DROP TABLE IF EXISTS agentsam_tool_capabilities;
CREATE VIEW agentsam_tool_capabilities AS
SELECT
  id AS tool_id,
  capability_key,
  'required' AS requirement_type,
  1 AS is_primary,
  operations_json,
  created_at
FROM agentsam_tools
WHERE capability_key IS NOT NULL;

PRAGMA foreign_keys = ON;
