-- FNF Agent Sam studio workflow pack — Content / Creative / Brand Refresh
-- Paste-safe for D1 Studio. Run: npm run db:seed:agentsam-workflows-studio
--
-- Rule: draft/generate = no approval · live publish / asset replace = approval required

-- ── Content Studio ────────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, tenant_id, workspace_id, workflow_key, display_name, description,
  workflow_type, trigger_type, default_mode, default_task_type,
  risk_level, requires_approval, max_concurrent_nodes, timeout_ms,
  quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_content_studio',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fnf_content_studio',
  'Fuel n Freetime Content Studio',
  'Generates and refines product copy, collection descriptions, homepage copy, email campaigns, SEO text, and content publishing suggestions for Fuel n Freetime.',
  'agentic',
  'manual',
  'agent',
  'content_generation',
  'low',
  0,
  3,
  600000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Copy matches Fuel n Freetime brand voice',
      'Output is clear, concise, and publishable',
      'SEO title and meta description included when relevant',
      'Product descriptions reflect actual product details from D1',
      'Draft is presented before any live publishing'
    ),
    'must_verify', json_array(
      'copy_matches_product_or_page_context',
      'seo_fields_present_when_requested',
      'no_live_publish_without_approval'
    ),
    'quality_rules', json_array(
      'brand_consistent',
      'seo_aware',
      'no_fluff',
      'conversion_focused',
      'human_review_before_publish'
    )
  ),
  json_object(
    'category', 'content',
    'ui_label', 'Content Studio',
    'ui_description', 'Product copy, collection pages, SEO, emails, and publish suggestions.',
    'store_brand', 'Fuel n Freetime',
    'workflow_loop', json_array('intent', 'context', 'plan', 'execute', 'verify', 'present', 'remember'),
    'primary_entities', json_array('products', 'collections', 'pages', 'emails'),
    'source_tables', json_array('products', 'product_images', 'pages', 'page_sections', 'newsletter_subscribers'),
    'outputs', json_array(
      'product_description',
      'collection_copy',
      'homepage_hero_copy',
      'email_campaign_draft',
      'seo_title',
      'meta_description'
    ),
    'suggested_prompts', json_array(
      'Write better product copy for this item',
      'Draft homepage hero copy for a summer drop',
      'Generate an email campaign for this collection',
      'What should we publish next on the site?'
    ),
    'tool_lanes', json_array('repo', 'database', 'files', 'memory'),
    'approval_required_for', json_array(
      'live_publish',
      'homepage_copy_replacement',
      'bulk_product_copy_update'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  workspace_id = excluded.workspace_id,
  display_name = excluded.display_name,
  description = excluded.description,
  workflow_type = excluded.workflow_type,
  trigger_type = excluded.trigger_type,
  default_mode = excluded.default_mode,
  default_task_type = excluded.default_task_type,
  risk_level = excluded.risk_level,
  requires_approval = excluded.requires_approval,
  max_concurrent_nodes = excluded.max_concurrent_nodes,
  timeout_ms = excluded.timeout_ms,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = excluded.is_active,
  is_platform_global = excluded.is_platform_global,
  updated_at = datetime('now');

-- ── Creative Studio ───────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, tenant_id, workspace_id, workflow_key, display_name, description,
  workflow_type, trigger_type, default_mode, default_task_type,
  risk_level, requires_approval, max_concurrent_nodes, timeout_ms,
  quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_creative_studio',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fnf_creative_studio',
  'Fuel n Freetime Creative Studio',
  'Generates visual creative assets for Fuel n Freetime including product imagery, collection banners, promo graphics, social creative, and image redesign direction.',
  'agentic',
  'manual',
  'agent',
  'image_generation',
  'medium',
  0,
  2,
  900000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Creative matches Fuel n Freetime visual identity',
      'Generated assets are usable for store or marketing',
      'Composition is clean and product-forward',
      'Requested dimensions or channel format are respected',
      'Assets are reviewed before replacing live imagery'
    ),
    'must_verify', json_array(
      'visual_brand_alignment',
      'asset_dimensions_or_format',
      'r2_upload_path_when_persisting',
      'no_live_image_replace_without_approval'
    ),
    'quality_rules', json_array(
      'brand_consistent',
      'high_visual_quality',
      'product_legibility',
      'channel_appropriate',
      'review_before_publish'
    )
  ),
  json_object(
    'category', 'creative',
    'ui_label', 'Creative Studio',
    'ui_description', 'Product mockups, banners, promo graphics, and image redesign direction.',
    'store_brand', 'Fuel n Freetime',
    'workflow_loop', json_array('intent', 'context', 'plan', 'execute', 'verify', 'present', 'remember'),
    'primary_entities', json_array('products', 'product_images', 'campaigns', 'social'),
    'source_tables', json_array('products', 'product_images', 'pages', 'media_assets'),
    'outputs', json_array(
      'product_mockup',
      'collection_banner',
      'promo_graphic',
      'social_post_creative',
      'hero_image_direction',
      'image_redesign_brief'
    ),
    'suggested_prompts', json_array(
      'Generate a banner for the new collection',
      'Create better product promo imagery for this hat',
      'Make a homepage hero visual direction',
      'Redesign this product image to feel more premium'
    ),
    'tool_lanes', json_array('files', 'design', 'database', 'browser', 'memory'),
    'approval_required_for', json_array(
      'replace_primary_product_image',
      'replace_homepage_hero',
      'launch_campaign_assets'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  workspace_id = excluded.workspace_id,
  display_name = excluded.display_name,
  description = excluded.description,
  workflow_type = excluded.workflow_type,
  trigger_type = excluded.trigger_type,
  default_mode = excluded.default_mode,
  default_task_type = excluded.default_task_type,
  risk_level = excluded.risk_level,
  requires_approval = excluded.requires_approval,
  max_concurrent_nodes = excluded.max_concurrent_nodes,
  timeout_ms = excluded.timeout_ms,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = excluded.is_active,
  is_platform_global = excluded.is_platform_global,
  updated_at = datetime('now');

-- ── Brand Refresh ─────────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, tenant_id, workspace_id, workflow_key, display_name, description,
  workflow_type, trigger_type, default_mode, default_task_type,
  risk_level, requires_approval, max_concurrent_nodes, timeout_ms,
  quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_brand_refresh',
  'tenant_fuelnfreetime',
  'ws_fuelnfreetime',
  'fnf_brand_refresh',
  'Fuel n Freetime Brand Refresh',
  'Handles logo refinement, logo redesign direction, brand system cleanup, visual identity exploration, and rollout suggestions for Fuel n Freetime.',
  'agentic',
  'manual',
  'plan',
  'brand_design',
  'high',
  1,
  2,
  1200000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Brand direction is clearly explained',
      'Logo/identity proposals feel intentional and premium',
      'Designs align to store audience and product category',
      'Multiple viable options or directions are presented',
      'No live replacement occurs without explicit approval'
    ),
    'must_verify', json_array(
      'design_rationale_documented',
      'cross_surface_usability_store_and_social',
      'approval_before_any_identity_swap'
    ),
    'quality_rules', json_array(
      'premium_brand_standard',
      'strategic_not_random',
      'clear_design_rationale',
      'usable_across_store_and_social',
      'approval_required'
    )
  ),
  json_object(
    'category', 'brand',
    'ui_label', 'Brand Refresh',
    'ui_description', 'Logo refinement, identity exploration, and rollout recommendations.',
    'store_brand', 'Fuel n Freetime',
    'workflow_loop', json_array('intent', 'context', 'plan', 'execute', 'verify', 'present', 'remember'),
    'primary_entities', json_array('logo', 'brand_system', 'store_identity', 'campaign_identity'),
    'outputs', json_array(
      'logo_refresh_direction',
      'logo_redesign_brief',
      'brand_moodboard',
      'type_color_direction',
      'store_visual_guidelines',
      'rollout_recommendations'
    ),
    'suggested_prompts', json_array(
      'Refresh our logo without losing recognition',
      'Create 3 more premium logo directions',
      'Help unify our storefront visual identity',
      'Redesign the brand to feel cleaner and more intentional'
    ),
    'tool_lanes', json_array('design', 'files', 'repo', 'memory'),
    'approval_required_for', json_array(
      'replace_store_logo',
      'replace_brand_colors',
      'replace_primary_identity_assets'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  workspace_id = excluded.workspace_id,
  display_name = excluded.display_name,
  description = excluded.description,
  workflow_type = excluded.workflow_type,
  trigger_type = excluded.trigger_type,
  default_mode = excluded.default_mode,
  default_task_type = excluded.default_task_type,
  risk_level = excluded.risk_level,
  requires_approval = excluded.requires_approval,
  max_concurrent_nodes = excluded.max_concurrent_nodes,
  timeout_ms = excluded.timeout_ms,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = excluded.is_active,
  is_platform_global = excluded.is_platform_global,
  updated_at = datetime('now');
