-- AgentSam tools — brand/content asset optimization pipelines (FNF)
-- Scope: fuelnfreetime Worker + D1 + R2 bucket `fuelnfreetime` (WEBSITE_ASSETS)
--
-- R2 Object Storage (WNAM):
--   bucket:          fuelnfreetime
--   binding:         WEBSITE_ASSETS
--   S3 API:          https://ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/fuelnfreetime
--   custom domain:   https://assets.fuelnfreetime.com/{r2_key}  (Active/Enabled)
--   worker serve:    https://fuelnfreetime.com/media/{r2_key}   (verified production path)
--   CORS origins:    fuelnfreetime.com, www, workers.dev, localhost:8787
-- Law: persist object keys in media_assets; derive public URLs at render time.
-- Prefer custom domain when healthy; fall back to Worker /media/* until CDN proves 200.
-- Account: ede6590ac0d2fb7daf155b35653457b2
-- Run: npm run db:seed:agentsam-tools-asset-pipelines

INSERT INTO agentsam_tools (
  id, account_id, tool_name, tool_key, display_name, tool_category,
  handler_type, description, input_schema, handler_config, intent_tags,
  mcp_server_key, mcp_service_url, dispatch_target,
  risk_level, requires_approval, is_active, oauth_visible,
  route_key, workflow_key, task_type, domain, capability_key, sort_priority,
  created_at, updated_at
) VALUES

-- ── Media library (manage) ────────────────────────────────────────────────────
(
  'ast_fnf_media_library_list',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_media_library_list', 'fnf_media_library_list', 'Media Library List',
  'assets.media', 'http',
  'List Fuel n Freetime media library rows (images, videos, products, 3D) from D1 media_assets backed by R2 WEBSITE_ASSETS.',
  '{"type":"object","properties":{"folder":{"type":"string","enum":["images","videos","products","3d-models","uploads","cms"]},"asset_kind":{"type":"string","enum":["image","icon","video","glb","any"],"default":"any"},"limit":{"type":"integer","default":40},"q":{"type":"string"}}}',
  '{"path":"/api/admin/media","method":"GET","binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","registry_table":"media_assets","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/","s3_api":"https://ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/fuelnfreetime","internal":true}',
  '["media","library","assets","image","video","glb","icon","r2","upload"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'creative', 'fnf_asset_ops', 'asset_manage', 'brand', 'media.library.read', 22,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_media_library_sync',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_media_library_sync', 'fnf_media_library_sync', 'Media Library Sync',
  'assets.media', 'http',
  'Sync R2 WEBSITE_ASSETS object keys into D1 media_assets (folder inference for images/videos/products/glb). Does not rewrite live storefront paths.',
  '{"type":"object","properties":{"prefix":{"type":"string","default":""},"dry_run":{"type":"boolean","default":false}}}',
  '{"path":"/api/admin/media/sync","method":"POST","binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","registry_table":"media_assets","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/","internal":true}',
  '["media","sync","r2","library","import","assets"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'creative', 'fnf_asset_ops', 'asset_manage', 'brand', 'media.library.sync', 23,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_media_upload',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_media_upload', 'fnf_media_upload', 'Media Upload',
  'assets.media', 'http',
  'Upload a brand/content asset into fuelnfreetime R2 and register it in media_assets. Prefer staging prefixes until publish approval.',
  '{"type":"object","properties":{"folder":{"type":"string","enum":["images","videos","products","uploads","3d-models"],"default":"uploads"},"filename":{"type":"string"},"content_type":{"type":"string"},"stage_only":{"type":"boolean","default":true}},"required":["filename"]}',
  '{"path":"/api/admin/media","method":"POST","binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","registry_table":"media_assets","stage_prefix":"uploads/staging/","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/","internal":true}',
  '["upload","media","r2","image","video","glb","icon"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'creative', 'fnf_asset_ops', 'asset_manage', 'brand', 'media.asset.create', 24,
  unixepoch(), unixepoch()
),

-- ── Images ────────────────────────────────────────────────────────────────────
(
  'ast_fnf_image_optimize',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_image_optimize', 'fnf_image_optimize', 'Optimize Image',
  'assets.image', 'cf',
  'Plan and stage optimized image variants (WebP/AVIF, max dimensions, quality) for storefront/CMS use. Writes staging keys under uploads/staging/images/ until publish.',
  '{"type":"object","properties":{"r2_key":{"type":"string"},"media_asset_id":{"type":"integer"},"max_width":{"type":"integer","default":1600},"formats":{"type":"array","items":{"type":"string","enum":["webp","avif","jpeg"]},"default":["webp","jpeg"]},"quality":{"type":"integer","default":82},"dry_run":{"type":"boolean","default":false}},"required":[]}',
  '{"binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","operation":"optimize_image","stage_prefix":"uploads/staging/images/","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/","registry_table":"media_assets","cors_origins":["https://fuelnfreetime.com","https://www.fuelnfreetime.com","https://fuelnfreetime.meauxbility.workers.dev"]}',
  '["image","optimize","webp","avif","compress","resize","cms","product"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'creative', 'fnf_image_pipeline', 'image_optimize', 'brand', 'media.image.optimize', 26,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_image_variant_plan',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_image_variant_plan', 'fnf_image_variant_plan', 'Image Variant Plan',
  'assets.image', 'agent',
  'Produce a responsive image variant plan (hero, card, thumb, OG) with target sizes and which CMS/product fields to update.',
  '{"type":"object","properties":{"r2_key":{"type":"string"},"channel":{"type":"string","enum":["storefront","cms","social","email","pdp"],"default":"storefront"},"product_id":{"type":"integer"},"page_slug":{"type":"string"}}}',
  '{"operation":"plan_image_variants","tables":["media_assets","product_images","pages"],"outputs":["variant_manifest"]}',
  '["image","responsive","srcset","hero","og","variant","plan"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'creative', 'fnf_image_pipeline', 'image_optimize', 'brand', 'media.image.variant.plan', 27,
  unixepoch(), unixepoch()
),

-- ── Icons ─────────────────────────────────────────────────────────────────────
(
  'ast_fnf_icon_optimize',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_icon_optimize', 'fnf_icon_optimize', 'Optimize Icon',
  'assets.icon', 'cf',
  'Optimize SVG/PNG icons for admin, PWA, and storefront (strip metadata, simplify paths, export PNG densites). Stage under uploads/staging/icons/.',
  '{"type":"object","properties":{"r2_key":{"type":"string"},"sizes":{"type":"array","items":{"type":"integer"},"default":[16,32,48,180,192,512]},"keep_svg":{"type":"boolean","default":true},"dry_run":{"type":"boolean","default":false}}}',
  '{"binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","operation":"optimize_icon","stage_prefix":"uploads/staging/icons/","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/"}',
  '["icon","favicon","pwa","svg","png","optimize","brand"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'creative', 'fnf_icon_pipeline', 'icon_optimize', 'brand', 'media.icon.optimize', 28,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_icon_generate',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_icon_generate', 'fnf_icon_generate', 'Generate Icon Set',
  'assets.icon', 'ai',
  'Generate or refresh a Fuel n Freetime icon/favicon set from brand marks (Workers AI + SVG post). Draft/stage only until brand approval.',
  '{"type":"object","properties":{"source_r2_key":{"type":"string"},"style":{"type":"string","enum":["flat","badge","monochrome","color"],"default":"flat"},"purpose":{"type":"string","enum":["favicon","pwa","nav","social"],"default":"favicon"}}}',
  '{"binding":"AGENTSAM_WAI","operation":"generate_icon_set","stage_prefix":"uploads/staging/icons/","brand":"Fuel n Freetime"}',
  '["icon","generate","favicon","brand","logo","pwa"]',
  NULL, NULL, 'internal',
  'medium', 1, 1, 0,
  'creative', 'fnf_icon_pipeline', 'icon_generate', 'brand', 'media.icon.generate', 29,
  unixepoch(), unixepoch()
),

-- ── Video ─────────────────────────────────────────────────────────────────────
(
  'ast_fnf_video_optimize',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_video_optimize', 'fnf_video_optimize', 'Optimize Video',
  'assets.video', 'cf',
  'Plan/stage optimized storefront video (H.264/WebM targets, max bitrate, duration trim hints). Live replace requires approval.',
  '{"type":"object","properties":{"r2_key":{"type":"string"},"max_width":{"type":"integer","default":1280},"target_mb":{"type":"number","default":12},"format":{"type":"string","enum":["mp4","webm"],"default":"mp4"},"dry_run":{"type":"boolean","default":false}}}',
  '{"binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","operation":"optimize_video","stage_prefix":"uploads/staging/videos/","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/","registry_table":"media_assets"}',
  '["video","optimize","compress","mp4","webm","cms","about"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'creative', 'fnf_video_pipeline', 'video_optimize', 'brand', 'media.video.optimize', 30,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_video_thumbnail',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_video_thumbnail', 'fnf_video_thumbnail', 'Video Poster / Thumbnail',
  'assets.video', 'cf',
  'Create or select a poster/thumbnail image for a video asset and register it in media_assets.',
  '{"type":"object","properties":{"r2_key":{"type":"string"},"timecode_sec":{"type":"number","default":1},"width":{"type":"integer","default":1280}}}',
  '{"binding":"WEBSITE_ASSETS","operation":"video_thumbnail","stage_prefix":"uploads/staging/images/posters/"}',
  '["video","thumbnail","poster","preview","optimize"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'creative', 'fnf_video_pipeline', 'video_optimize', 'brand', 'media.video.thumbnail', 31,
  unixepoch(), unixepoch()
),

-- ── GLB / 3D ──────────────────────────────────────────────────────────────────
(
  'ast_fnf_glb_inspect',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_glb_inspect', 'fnf_glb_inspect', 'Inspect GLB / 3D Model',
  'assets.glb', 'cf',
  'Inspect a GLB/USDZ on WEBSITE_ASSETS (size, content-type, path, linked CMS/product usage). Read-only.',
  '{"type":"object","properties":{"r2_key":{"type":"string","default":"3d-models/emblem-of-elegance.glb"},"include_usage":{"type":"boolean","default":true}}}',
  '{"binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","operation":"inspect_glb","paths":["3d-models/"],"tables":["media_assets","pages","page_sections"],"public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/"}',
  '["glb","gltf","3d","model","inspect","mesh","usdz"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'creative', 'fnf_glb_pipeline', 'glb_optimize', 'brand', 'media.glb.inspect', 32,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_glb_optimize',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_glb_optimize', 'fnf_glb_optimize', 'Optimize GLB',
  'assets.glb', 'cf',
  'Stage an optimized GLB (Draco/meshopt targets, texture resize hints) under uploads/staging/3d-models/. Replacing live 3d-models/* (assets CDN or /media) requires approval.',
  '{"type":"object","properties":{"r2_key":{"type":"string"},"target_mb":{"type":"number","default":8},"draco":{"type":"boolean","default":true},"max_texture":{"type":"integer","default":2048},"dry_run":{"type":"boolean","default":false}}}',
  '{"binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","operation":"optimize_glb","stage_prefix":"uploads/staging/3d-models/","live_prefix":"3d-models/","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/"}',
  '["glb","optimize","3d","draco","meshopt","compress","hero"]',
  NULL, NULL, 'internal',
  'high', 1, 1, 0,
  'creative', 'fnf_glb_pipeline', 'glb_optimize', 'brand', 'media.glb.optimize', 33,
  unixepoch(), unixepoch()
),

-- ── Brand / content linking + publish ─────────────────────────────────────────
(
  'ast_fnf_brand_asset_audit',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_brand_asset_audit', 'fnf_brand_asset_audit', 'Brand Asset Audit',
  'assets.brand', 'd1',
  'Audit logos, icons, hero media, product imagery, and GLBs referenced by CMS pages and products. Flags missing, oversized, or unoptimized assets.',
  '{"type":"object","properties":{"include_r2_stats":{"type":"boolean","default":true},"page_slug":{"type":"string"},"product_id":{"type":"integer"}}}',
  '{"binding":"DB","operation":"brand_asset_audit","tables":["media_assets","pages","page_sections","products","product_images"],"r2_binding":"WEBSITE_ASSETS"}',
  '["brand","audit","logo","icon","hero","glb","optimize","seo"]',
  NULL, NULL, 'internal',
  'low', 0, 1, 0,
  'creative', 'fnf_asset_ops', 'brand_audit', 'brand', 'media.brand.audit', 21,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_content_asset_link',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_content_asset_link', 'fnf_content_asset_link', 'Link Asset to Content',
  'assets.content', 'agent',
  'Propose CMS section / product_image field updates to point at an optimized assets.fuelnfreetime.com/{key} (fallback /media/{key}) asset. Draft only until approval.',
  '{"type":"object","properties":{"media_url":{"type":"string"},"target":{"type":"string","enum":["cms_section","product_image","site_logo","glb"],"default":"cms_section"},"page_slug":{"type":"string"},"section_key":{"type":"string"},"product_id":{"type":"integer"},"field_key":{"type":"string"}}}',
  '{"operation":"link_asset_draft","tables":["pages","page_sections","product_images","media_assets"],"writes":"draft_proposal"}',
  '["cms","product","link","media","hero","glb","content"]',
  NULL, NULL, 'internal',
  'medium', 0, 1, 0,
  'content', 'fnf_asset_ops', 'content_link', 'brand', 'media.content.link', 34,
  unixepoch(), unixepoch()
),
(
  'ast_fnf_asset_publish',
  'ede6590ac0d2fb7daf155b35653457b2',
  'fnf_asset_publish', 'fnf_asset_publish', 'Publish Staged Asset',
  'media.asset.publish', 'cf',
  'Promote a staged asset (uploads/staging/...) to a live R2 key served via assets.fuelnfreetime.com or /media and update media_assets. Always requires approval.',
  '{"type":"object","properties":{"staging_key":{"type":"string"},"live_key":{"type":"string"},"confirm":{"type":"boolean"}},"required":["staging_key","live_key","confirm"]}',
  '{"binding":"WEBSITE_ASSETS","bucket":"fuelnfreetime","operation":"publish_staged_asset","requires_approval":true,"registry_table":"media_assets","public_base_url":"https://assets.fuelnfreetime.com","worker_media_prefix":"/media/","s3_api":"https://ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/fuelnfreetime"}',
  '["publish","media","live","replace","approve","r2"]',
  NULL, NULL, 'internal',
  'high', 1, 1, 0,
  'creative', 'fnf_asset_ops', 'asset_publish', 'brand', 'media.asset.publish', 35,
  unixepoch(), unixepoch()
)

ON CONFLICT(tool_key) DO UPDATE SET
  account_id = excluded.account_id,
  display_name = excluded.display_name,
  description = excluded.description,
  tool_category = excluded.tool_category,
  handler_type = excluded.handler_type,
  input_schema = excluded.input_schema,
  handler_config = excluded.handler_config,
  intent_tags = excluded.intent_tags,
  mcp_server_key = excluded.mcp_server_key,
  mcp_service_url = excluded.mcp_service_url,
  dispatch_target = excluded.dispatch_target,
  risk_level = excluded.risk_level,
  requires_approval = excluded.requires_approval,
  is_active = excluded.is_active,
  route_key = excluded.route_key,
  workflow_key = excluded.workflow_key,
  task_type = excluded.task_type,
  domain = excluded.domain,
  capability_key = excluded.capability_key,
  sort_priority = excluded.sort_priority,
  updated_at = unixepoch();

-- Chat / safe allowlist policy keys for asset pipelines
INSERT INTO agentsam_tool_policy_keys (id, account_id, policy_kind, tool_key, sort_order, notes)
VALUES
  ('atpk_fnf_chat_media_list', 'ede6590ac0d2fb7daf155b35653457b2', 'agent_chat_essential', 'fnf_media_library_list', 22, 'Media library'),
  ('atpk_fnf_chat_brand_audit', 'ede6590ac0d2fb7daf155b35653457b2', 'agent_chat_essential', 'fnf_brand_asset_audit', 21, 'Brand asset audit'),
  ('atpk_fnf_chat_glb_inspect', 'ede6590ac0d2fb7daf155b35653457b2', 'agent_chat_essential', 'fnf_glb_inspect', 32, 'GLB inspect'),
  ('atpk_fnf_safe_image_plan', 'ede6590ac0d2fb7daf155b35653457b2', 'builtin_safe_allowlist', 'fnf_image_variant_plan', 26, 'Image variant plan'),
  ('atpk_fnf_nc_asset_publish', 'ede6590ac0d2fb7daf155b35653457b2', 'non_cacheable', 'fnf_asset_publish', 30, 'Live asset publish'),
  ('atpk_fnf_nc_media_sync', 'ede6590ac0d2fb7daf155b35653457b2', 'non_cacheable', 'fnf_media_library_sync', 31, 'Media sync')
ON CONFLICT(account_id, policy_kind, tool_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  notes = excluded.notes,
  is_active = 1,
  updated_at = unixepoch();
