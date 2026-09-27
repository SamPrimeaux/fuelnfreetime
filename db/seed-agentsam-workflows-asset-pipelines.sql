-- AgentSam workflows — brand/content asset optimization pipelines (FNF)
-- Images / icons / videos / GLBs managed by Agent Sam + admin apps
--
-- R2: bucket fuelnfreetime · binding WEBSITE_ASSETS · WNAM
--     custom domain assets.fuelnfreetime.com (Active)
--     worker path /media/{key} (verified)
--     S3 API …/ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/fuelnfreetime
-- Account: ede6590ac0d2fb7daf155b35653457b2
-- Run: npm run db:seed:agentsam-workflows-asset-pipelines
-- Rule: optimize/stage = no approval · live asset replace = approval required

-- ── Umbrella: Asset Ops ───────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, account_id, workflow_key, display_name, description, workflow_type, trigger_type,
  default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes,
  timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_asset_ops',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_asset_ops',
  'Fuel n Freetime Asset Ops',
  'Umbrella brand/content asset pipeline: audit, manage library, optimize images/icons/videos/GLBs, link to CMS/products, and publish to /media with approval.',
  'agentic', 'manual', 'agent', 'asset_ops', 'medium', 0, 4, 900000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Asset inventory is current in media_assets',
      'Oversized or unoptimized assets are flagged with a plan',
      'Optimized outputs staged under uploads/staging/',
      'Live /media replacements only after approval',
      'CMS/product links proposed as drafts when requested'
    ),
    'must_verify', json_array(
      'registry_synced_or_audited',
      'stage_before_live',
      'no_live_media_replace_without_approval'
    ),
    'quality_rules', json_array(
      'brand_consistent',
      'performance_aware',
      'format_appropriate',
      'human_review_before_publish'
    )
  ),
  json_object(
    'category', 'assets',
    'ui_label', 'Asset Ops',
    'ui_description', 'Manage and optimize images, icons, videos, and GLBs for Fuel n Freetime.',
    'store_brand', 'Fuel n Freetime',
    'r2_bucket', 'fuelnfreetime',
    'r2_binding', 'WEBSITE_ASSETS',
    'r2_location', 'WNAM',
    'public_base_url', 'https://assets.fuelnfreetime.com',
    'worker_media_prefix', '/media/',
    's3_api', 'https://ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/fuelnfreetime',
    'cors_origins', json_array(
      'https://fuelnfreetime.com',
      'https://www.fuelnfreetime.com',
      'https://fuelnfreetime.meauxbility.workers.dev',
      'http://localhost:8787',
      'http://127.0.0.1:8787'
    ),
    'url_law', 'Persist r2_key in media_assets; derive public URL from assets.fuelnfreetime.com when healthy, else Worker /media/{key}. Never store short-lived signed URLs.',
    'public_url_status', 'custom_domain_active_but_objects_may_404_until_cdn_path_proven',
    'child_workflows', json_array('fnf_image_pipeline', 'fnf_icon_pipeline', 'fnf_video_pipeline', 'fnf_glb_pipeline'),
    'tool_keys', json_array(
      'fnf_brand_asset_audit',
      'fnf_media_library_list',
      'fnf_media_library_sync',
      'fnf_media_upload',
      'fnf_image_optimize',
      'fnf_icon_optimize',
      'fnf_video_optimize',
      'fnf_glb_optimize',
      'fnf_content_asset_link',
      'fnf_asset_publish'
    ),
    'source_tables', json_array('media_assets', 'products', 'product_images', 'pages', 'page_sections'),
    'suggested_prompts', json_array(
      'Audit our brand assets and flag what needs optimizing',
      'Optimize the homepage hero image and stage WebP',
      'Inspect and optimize the emblem GLB',
      'Sync R2 media into the library then clean oversized videos'
    ),
    'approval_required_for', json_array(
      'publish_live_media',
      'replace_store_logo',
      'replace_primary_product_image',
      'replace_live_glb'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  account_id = excluded.account_id,
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

-- ── Image pipeline ────────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, account_id, workflow_key, display_name, description, workflow_type, trigger_type,
  default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes,
  timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_image_pipeline',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_image_pipeline',
  'Fuel n Freetime Image Pipeline',
  'Build, optimize, and manage storefront/CMS images: variants, WebP/AVIF, responsive plans, and staged publish to /media.',
  'agentic', 'manual', 'agent', 'image_optimize', 'medium', 0, 3, 600000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Source image located in media_assets or R2',
      'Optimized variants staged with target dimensions',
      'Variant plan covers hero/card/thumb/OG as needed',
      'Live replace proposed with before/after proof'
    ),
    'must_verify', json_array('format_and_size', 'brand_alignment', 'stage_before_live'),
    'quality_rules', json_array('webp_or_avif_preferred', 'max_width_respected', 'no_upscale_junk')
  ),
  json_object(
    'category', 'assets.image',
    'ui_label', 'Image Pipeline',
    'parent_workflow', 'fnf_asset_ops',
    'tool_keys', json_array('fnf_media_library_list', 'fnf_image_variant_plan', 'fnf_image_optimize', 'fnf_content_asset_link', 'fnf_asset_publish'),
    'r2_stage_prefix', 'uploads/staging/images/',
    'suggested_prompts', json_array(
      'Optimize this product photo for the PDP',
      'Create a hero + OG variant plan for the home page',
      'Compress oversized CMS images without looking soft'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  account_id = excluded.account_id,
  display_name = excluded.display_name,
  description = excluded.description,
  workflow_type = excluded.workflow_type,
  default_task_type = excluded.default_task_type,
  risk_level = excluded.risk_level,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = 1,
  updated_at = datetime('now');

-- ── Icon pipeline ─────────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, account_id, workflow_key, display_name, description, workflow_type, trigger_type,
  default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes,
  timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_icon_pipeline',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_icon_pipeline',
  'Fuel n Freetime Icon Pipeline',
  'Generate and optimize favicon/PWA/nav icons from brand marks; stage PNG densities + SVG; publish only with approval.',
  'agentic', 'manual', 'agent', 'icon_optimize', 'medium', 0, 2, 600000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Icon set covers required densities',
      'SVG kept when vector source available',
      'PWA 192/512 included when requested',
      'Live favicon/logo swap requires approval'
    ),
    'must_verify', json_array('size_matrix', 'legibility_at_16px', 'approval_before_identity_swap'),
    'quality_rules', json_array('crisp_small_sizes', 'brand_consistent', 'no_noise')
  ),
  json_object(
    'category', 'assets.icon',
    'ui_label', 'Icon Pipeline',
    'parent_workflow', 'fnf_asset_ops',
    'tool_keys', json_array('fnf_brand_asset_audit', 'fnf_icon_generate', 'fnf_icon_optimize', 'fnf_asset_publish'),
    'r2_stage_prefix', 'uploads/staging/icons/',
    'suggested_prompts', json_array(
      'Build a full favicon + PWA icon set from our logo',
      'Optimize the nav icon SVG for crisp 16px',
      'Refresh icons without changing brand recognition'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  account_id = excluded.account_id,
  display_name = excluded.display_name,
  description = excluded.description,
  default_task_type = excluded.default_task_type,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = 1,
  updated_at = datetime('now');

-- ── Video pipeline ────────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, account_id, workflow_key, display_name, description, workflow_type, trigger_type,
  default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes,
  timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_video_pipeline',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_video_pipeline',
  'Fuel n Freetime Video Pipeline',
  'Optimize storefront/about videos: compress, poster frames, register in media_assets, stage before replacing live /media video paths.',
  'agentic', 'manual', 'agent', 'video_optimize', 'medium', 0, 2, 900000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Source video inventoried',
      'Target bitrate/size plan set',
      'Poster thumbnail staged',
      'Live CMS video URL update is draft until approval'
    ),
    'must_verify', json_array('file_size_target', 'poster_present', 'stage_before_live'),
    'quality_rules', json_array('mobile_friendly', 'no_audio_clipping_surprise', 'brand_safe_frames')
  ),
  json_object(
    'category', 'assets.video',
    'ui_label', 'Video Pipeline',
    'parent_workflow', 'fnf_asset_ops',
    'tool_keys', json_array('fnf_media_library_list', 'fnf_video_optimize', 'fnf_video_thumbnail', 'fnf_content_asset_link', 'fnf_asset_publish'),
    'r2_stage_prefix', 'uploads/staging/videos/',
    'suggested_prompts', json_array(
      'Compress the about page videos for faster loads',
      'Generate posters for all videos in media library',
      'Optimize shop loop video under 12MB'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  account_id = excluded.account_id,
  display_name = excluded.display_name,
  description = excluded.description,
  default_task_type = excluded.default_task_type,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = 1,
  updated_at = datetime('now');

-- ── GLB pipeline ──────────────────────────────────────────────────────────────

INSERT INTO agentsam_workflows (
  id, account_id, workflow_key, display_name, description, workflow_type, trigger_type,
  default_mode, default_task_type, risk_level, requires_approval, max_concurrent_nodes,
  timeout_ms, quality_gate_json, metadata_json, is_active, is_platform_global,
  created_at_unix, created_at, updated_at
) VALUES (
  'wf_fnf_glb_pipeline',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_glb_pipeline',
  'Fuel n Freetime GLB Pipeline',
  'Inspect, optimize, and manage 3D models (GLB/USDZ) for hero/product viewers. Live 3d-models/* replace requires approval.',
  'agentic', 'manual', 'agent', 'glb_optimize', 'high', 1, 2, 900000,
  json_object(
    'version', '1.0.0',
    'definition_of_done', json_array(
      'Model inspected (size, path, CMS usage)',
      'Optimization targets documented (Draco/texture)',
      'Optimized GLB staged under uploads/staging/3d-models/',
      'CMS glbUrl update drafted; live swap needs approval'
    ),
    'must_verify', json_array('size_target', 'viewer_compat', 'approval_before_live_glb'),
    'quality_rules', json_array('keep_silhouette', 'texture_budget', 'mobile_loadable')
  ),
  json_object(
    'category', 'assets.glb',
    'ui_label', 'GLB Pipeline',
    'parent_workflow', 'fnf_asset_ops',
    'tool_keys', json_array('fnf_glb_inspect', 'fnf_glb_optimize', 'fnf_content_asset_link', 'fnf_asset_publish'),
    'r2_live_prefix', '3d-models/',
    'r2_stage_prefix', 'uploads/staging/3d-models/',
    'known_assets', json_array('3d-models/emblem-of-elegance.glb', 'cms/pages/bridge-fly/'),
    'suggested_prompts', json_array(
      'Inspect the emblem-of-elegance GLB and propose an optimize plan',
      'Stage a Draco-compressed hero model under 8MB',
      'Wire the optimized GLB into the home hero draft'
    )
  ),
  1, 0, unixepoch(), datetime('now'), datetime('now')
)
ON CONFLICT(workflow_key) DO UPDATE SET
  account_id = excluded.account_id,
  display_name = excluded.display_name,
  description = excluded.description,
  default_task_type = excluded.default_task_type,
  risk_level = excluded.risk_level,
  requires_approval = excluded.requires_approval,
  quality_gate_json = excluded.quality_gate_json,
  metadata_json = excluded.metadata_json,
  is_active = 1,
  updated_at = datetime('now');
