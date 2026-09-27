-- Step graphs for FNF asset optimization pipelines
-- Run after seed-agentsam-workflows-asset-pipelines.sql
-- npm run db:seed:agentsam-workflow-nodes-asset-pipelines

DELETE FROM agentsam_workflow_nodes
WHERE workflow_id IN (
  'wf_fnf_asset_ops',
  'wf_fnf_image_pipeline',
  'wf_fnf_icon_pipeline',
  'wf_fnf_video_pipeline',
  'wf_fnf_glb_pipeline'
);

-- Asset Ops (umbrella)
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_ao_intent', 'wf_fnf_asset_ops', 'intent', 'trigger', 'Capture asset goal',
 'Which surfaces (CMS, PDP, PWA, hero 3D) and asset kinds (image/icon/video/glb).', 'fnf.capture_asset_intent',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_ao_audit', 'wf_fnf_asset_ops', 'audit_inventory', 'process', 'Audit brand assets',
 'Run brand asset audit + media library list; flag oversized/missing/unoptimized.', 'fnf_brand_asset_audit',
 20, 'search', 'database', 0, '{"tools":["fnf_brand_asset_audit","fnf_media_library_list"]}'),
('wnode_fnf_ao_plan', 'wf_fnf_asset_ops', 'make_plan', 'agent', 'Plan optimization lanes',
 'Route work to image/icon/video/glb child pipelines with size/format targets.', 'fnf.plan_asset_ops',
 30, 'list', 'repo', 0, '{"child_workflows":["fnf_image_pipeline","fnf_icon_pipeline","fnf_video_pipeline","fnf_glb_pipeline"]}'),
('wnode_fnf_ao_execute', 'wf_fnf_asset_ops', 'execute_optimize', 'agent', 'Optimize & stage',
 'Run optimize tools; write only to uploads/staging/** until approval.', 'fnf.execute_asset_optimize',
 40, 'sparkles', 'files', 0, '{"writes":"staging_only","tools":["fnf_image_optimize","fnf_icon_optimize","fnf_video_optimize","fnf_glb_optimize"]}'),
('wnode_fnf_ao_link', 'wf_fnf_asset_ops', 'link_draft', 'agent', 'Draft content links',
 'Propose CMS/product field updates pointing at staged or live /media URLs.', 'fnf_content_asset_link',
 50, 'link', 'content', 0, '{"tools":["fnf_content_asset_link"],"writes":"draft_proposal"}'),
('wnode_fnf_ao_approval', 'wf_fnf_asset_ops', 'approval_gate', 'approval_gate', 'Publish approval',
 'Required before promoting staged assets to live /media or replacing logos/GLBs.', 'fnf.approval_asset_publish',
 60, 'shield', 'memory', 1, '{"triggers":["publish_live_media","replace_store_logo","replace_live_glb"]}'),
('wnode_fnf_ao_publish', 'wf_fnf_asset_ops', 'publish', 'process', 'Publish staged assets',
 'Promote approved staging keys via fnf_asset_publish and refresh media_assets.', 'fnf_asset_publish',
 70, 'upload', 'files', 1, '{"tools":["fnf_asset_publish"]}'),
('wnode_fnf_ao_present', 'wf_fnf_asset_ops', 'present_proof', 'output', 'Present results',
 'Before/after sizes, URLs, and remaining backlog.', 'fnf.present_asset_ops',
 80, 'send', 'files', 0, '{"phase":"present"}');

-- Image pipeline
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_img_intent', 'wf_fnf_image_pipeline', 'intent', 'trigger', 'Capture image brief',
 'Channel, max width, and target entity (product/CMS).', 'fnf.capture_image_brief',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_img_context', 'wf_fnf_image_pipeline', 'load_context', 'process', 'Load source image',
 'Resolve media_assets / R2 key and current usage.', 'fnf_media_library_list',
 20, 'image', 'database', 0, '{"tools":["fnf_media_library_list"]}'),
('wnode_fnf_img_plan', 'wf_fnf_image_pipeline', 'variant_plan', 'agent', 'Plan variants',
 'Hero/card/thumb/OG sizes and formats.', 'fnf_image_variant_plan',
 30, 'list', 'design', 0, '{"tools":["fnf_image_variant_plan"]}'),
('wnode_fnf_img_execute', 'wf_fnf_image_pipeline', 'optimize', 'process', 'Optimize & stage',
 'Write WebP/AVIF (and JPEG fallback) under uploads/staging/images/.', 'fnf_image_optimize',
 40, 'sparkles', 'files', 0, '{"tools":["fnf_image_optimize"],"writes":"staging_only"}'),
('wnode_fnf_img_approval', 'wf_fnf_image_pipeline', 'approval_gate', 'approval_gate', 'Publish approval',
 'Required before live product/hero image replace.', 'fnf.approval_image_publish',
 50, 'shield', 'memory', 1, '{"triggers":["replace_primary_product_image","replace_homepage_hero"]}'),
('wnode_fnf_img_publish', 'wf_fnf_image_pipeline', 'publish', 'process', 'Publish',
 'Promote staged image to live /media path.', 'fnf_asset_publish',
 60, 'upload', 'files', 1, '{"tools":["fnf_asset_publish"]}'),
('wnode_fnf_img_present', 'wf_fnf_image_pipeline', 'present_proof', 'output', 'Present variants',
 'Show URLs, sizes, and suggested CMS/product fields.', 'fnf.present_image_pipeline',
 70, 'layout', 'files', 0, '{"phase":"present"}');

-- Icon pipeline
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_ico_intent', 'wf_fnf_icon_pipeline', 'intent', 'trigger', 'Capture icon goal',
 'Favicon, PWA, nav, or social mark constraints.', 'fnf.capture_icon_goal',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_ico_context', 'wf_fnf_icon_pipeline', 'load_brand', 'process', 'Load brand marks',
 'Audit current logos/icons from media library.', 'fnf_brand_asset_audit',
 20, 'palette', 'database', 0, '{"tools":["fnf_brand_asset_audit"]}'),
('wnode_fnf_ico_generate', 'wf_fnf_icon_pipeline', 'generate', 'agent', 'Generate icon set',
 'Draft icon set from brand source (approval before identity swap).', 'fnf_icon_generate',
 30, 'sparkles', 'design', 1, '{"tools":["fnf_icon_generate"]}'),
('wnode_fnf_ico_optimize', 'wf_fnf_icon_pipeline', 'optimize', 'process', 'Optimize densities',
 'SVG clean + PNG matrix under uploads/staging/icons/.', 'fnf_icon_optimize',
 40, 'check', 'files', 0, '{"tools":["fnf_icon_optimize"],"writes":"staging_only"}'),
('wnode_fnf_ico_approval', 'wf_fnf_icon_pipeline', 'approval_gate', 'approval_gate', 'Identity approval',
 'Required before replacing store favicon/logo identity assets.', 'fnf.approval_icon_publish',
 50, 'shield', 'memory', 1, '{"triggers":["replace_store_logo","replace_favicon"]}'),
('wnode_fnf_ico_publish', 'wf_fnf_icon_pipeline', 'publish', 'process', 'Publish icons',
 'Promote staged icons to live media paths.', 'fnf_asset_publish',
 60, 'upload', 'files', 1, '{"tools":["fnf_asset_publish"]}'),
('wnode_fnf_ico_present', 'wf_fnf_icon_pipeline', 'present_proof', 'output', 'Present icon set',
 'Grid of sizes with crispness notes.', 'fnf.present_icon_pipeline',
 70, 'layout', 'files', 0, '{"phase":"present"}');

-- Video pipeline
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_vid_intent', 'wf_fnf_video_pipeline', 'intent', 'trigger', 'Capture video goal',
 'Page placement, max size, and format.', 'fnf.capture_video_goal',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_vid_context', 'wf_fnf_video_pipeline', 'load_context', 'process', 'Locate videos',
 'List videos folder + CMS references.', 'fnf_media_library_list',
 20, 'video', 'database', 0, '{"tools":["fnf_media_library_list"],"folder":"videos"}'),
('wnode_fnf_vid_optimize', 'wf_fnf_video_pipeline', 'optimize', 'process', 'Optimize video',
 'Stage compressed mp4/webm under uploads/staging/videos/.', 'fnf_video_optimize',
 30, 'sparkles', 'files', 0, '{"tools":["fnf_video_optimize"],"writes":"staging_only"}'),
('wnode_fnf_vid_poster', 'wf_fnf_video_pipeline', 'thumbnail', 'process', 'Make poster',
 'Generate poster frame and register in media_assets.', 'fnf_video_thumbnail',
 40, 'image', 'files', 0, '{"tools":["fnf_video_thumbnail"]}'),
('wnode_fnf_vid_link', 'wf_fnf_video_pipeline', 'link_draft', 'agent', 'Draft CMS links',
 'Propose page_section video URL updates.', 'fnf_content_asset_link',
 50, 'link', 'content', 0, '{"tools":["fnf_content_asset_link"]}'),
('wnode_fnf_vid_approval', 'wf_fnf_video_pipeline', 'approval_gate', 'approval_gate', 'Publish approval',
 'Required before replacing live CMS video URLs.', 'fnf.approval_video_publish',
 60, 'shield', 'memory', 1, '{"triggers":["replace_cms_video"]}'),
('wnode_fnf_vid_publish', 'wf_fnf_video_pipeline', 'publish', 'process', 'Publish',
 'Promote staged video + poster.', 'fnf_asset_publish',
 70, 'upload', 'files', 1, '{"tools":["fnf_asset_publish"]}'),
('wnode_fnf_vid_present', 'wf_fnf_video_pipeline', 'present_proof', 'output', 'Present',
 'Size savings and draft CMS field map.', 'fnf.present_video_pipeline',
 80, 'send', 'files', 0, '{"phase":"present"}');

-- GLB pipeline
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_glb_intent', 'wf_fnf_glb_pipeline', 'intent', 'trigger', 'Capture 3D goal',
 'Hero viewer, product emblem, or scene budget.', 'fnf.capture_glb_goal',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_glb_inspect', 'wf_fnf_glb_pipeline', 'inspect', 'process', 'Inspect model',
 'Size, path, and CMS/product usage for the GLB.', 'fnf_glb_inspect',
 20, 'box', 'database', 0, '{"tools":["fnf_glb_inspect"]}'),
('wnode_fnf_glb_plan', 'wf_fnf_glb_pipeline', 'make_plan', 'agent', 'Plan optimize',
 'Draco/meshopt/texture targets and viewer compatibility notes.', 'fnf.plan_glb_optimize',
 30, 'list', 'design', 0, '{"phase":"plan"}'),
('wnode_fnf_glb_optimize', 'wf_fnf_glb_pipeline', 'optimize', 'process', 'Optimize & stage',
 'Stage optimized GLB under uploads/staging/3d-models/.', 'fnf_glb_optimize',
 40, 'sparkles', 'files', 1, '{"tools":["fnf_glb_optimize"],"writes":"staging_only"}'),
('wnode_fnf_glb_link', 'wf_fnf_glb_pipeline', 'link_draft', 'agent', 'Draft glbUrl',
 'Propose CMS hero glbUrl / product 3D field draft.', 'fnf_content_asset_link',
 50, 'link', 'content', 0, '{"tools":["fnf_content_asset_link"],"target":"glb"}'),
('wnode_fnf_glb_approval', 'wf_fnf_glb_pipeline', 'approval_gate', 'approval_gate', 'Live GLB approval',
 'Required before replacing 3d-models/* live objects.', 'fnf.approval_glb_publish',
 60, 'shield', 'memory', 1, '{"triggers":["replace_live_glb"]}'),
('wnode_fnf_glb_publish', 'wf_fnf_glb_pipeline', 'publish', 'process', 'Publish GLB',
 'Promote staged GLB to live 3d-models/ path.', 'fnf_asset_publish',
 70, 'upload', 'files', 1, '{"tools":["fnf_asset_publish"]}'),
('wnode_fnf_glb_present', 'wf_fnf_glb_pipeline', 'present_proof', 'output', 'Present',
 'Before/after MB, URLs, and draft CMS wiring.', 'fnf.present_glb_pipeline',
 80, 'send', 'files', 0, '{"phase":"present"}');
