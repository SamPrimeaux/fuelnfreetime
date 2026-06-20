-- Default step graphs for FNF studio workflows (agentsam_workflow_nodes)
-- Run after seed-agentsam-workflows-studio.sql

DELETE FROM agentsam_workflow_nodes
WHERE workflow_id IN (
  'wf_fnf_content_studio',
  'wf_fnf_creative_studio',
  'wf_fnf_brand_refresh'
);

-- Shared 7-step spine — Content Studio
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_cs_intent', 'wf_fnf_content_studio', 'intent', 'trigger', 'Capture intent',
 'Parse user request: product, page, collection, or email goal.', 'fnf.capture_intent',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_cs_context', 'wf_fnf_content_studio', 'load_context', 'process', 'Load store context',
 'Read products, pages, page_sections, and brand voice from D1 + CMS KV.', 'fnf.load_store_context',
 20, 'database', 'database', 0, '{"tables":["products","pages","page_sections","store_settings"]}'),
('wnode_fnf_cs_plan', 'wf_fnf_content_studio', 'make_plan', 'agent', 'Plan copy approach',
 'Outline sections, tone, SEO fields, and which entities will be touched (draft only).', 'fnf.plan_content',
 30, 'list', 'repo', 0, '{"phase":"plan"}'),
('wnode_fnf_cs_execute', 'wf_fnf_content_studio', 'execute_draft', 'agent', 'Generate draft copy',
 'Produce publish-ready draft copy without writing live until approved.', 'fnf.generate_content_draft',
 40, 'edit', 'repo', 0, '{"phase":"execute","writes":"draft_only"}'),
('wnode_fnf_cs_approval', 'wf_fnf_content_studio', 'approval_gate', 'approval_gate', 'Publish approval',
 'Required before live CMS/product copy replacement or bulk updates.', 'fnf.approval_publish',
 50, 'shield', 'memory', 1, '{"triggers":["live_publish","homepage_copy_replacement","bulk_product_copy_update"]}'),
('wnode_fnf_cs_verify', 'wf_fnf_content_studio', 'verify_result', 'eval', 'Verify copy quality',
 'Check brand voice, SEO fields, factual match to product data, and mobile-readable length.', 'fnf.verify_content',
 60, 'check', 'browser', 0, '{"checks":["brand_consistent","seo_present","fact_match"]}'),
('wnode_fnf_cs_present', 'wf_fnf_content_studio', 'present_proof', 'output', 'Present draft',
 'Show copy with before/after and suggested CMS/product fields to update.', 'fnf.present_content',
 70, 'send', 'files', 0, '{"phase":"present"}'),
('wnode_fnf_cs_remember', 'wf_fnf_content_studio', 'write_memory', 'db_query', 'Remember decisions',
 'Persist tone choices, approved phrases, and publish decisions to project context.', 'fnf.write_memory',
 80, 'bookmark', 'memory', 0, '{"target":"agentsam_project_context"}');

-- Creative Studio
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_cr_intent', 'wf_fnf_creative_studio', 'intent', 'trigger', 'Capture creative brief',
 'Channel, dimensions, product/collection target, and visual goal.', 'fnf.capture_creative_brief',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_cr_context', 'wf_fnf_creative_studio', 'load_context', 'process', 'Load visual context',
 'Pull product images, media_assets, collection art, and GLB/logo paths from R2.', 'fnf.load_visual_context',
 20, 'image', 'database', 0, '{"tables":["products","product_images","media_assets"],"r2_prefix":"/media/"}'),
('wnode_fnf_cr_plan', 'wf_fnf_creative_studio', 'make_plan', 'agent', 'Plan creative direction',
 'Composition, palette, typography hints, and output formats per channel.', 'fnf.plan_creative',
 30, 'palette', 'design', 0, '{"phase":"plan"}'),
('wnode_fnf_cr_execute', 'wf_fnf_creative_studio', 'execute_generate', 'agent', 'Generate assets',
 'Create mockups/banners/direction boards; stage to R2 uploads/ until approved.', 'fnf.generate_creative',
 40, 'sparkles', 'design', 0, '{"phase":"execute","writes":"staging_only"}'),
('wnode_fnf_cr_approval', 'wf_fnf_creative_studio', 'approval_gate', 'approval_gate', 'Asset approval',
 'Required before replacing primary product image, homepage hero, or campaign launch assets.', 'fnf.approval_creative',
 50, 'shield', 'memory', 1, '{"triggers":["replace_primary_product_image","replace_homepage_hero","launch_campaign_assets"]}'),
('wnode_fnf_cr_verify', 'wf_fnf_creative_studio', 'verify_result', 'eval', 'Verify visual quality',
 'Brand alignment, legibility, dimensions, and file size/format checks.', 'fnf.verify_creative',
 60, 'check', 'browser', 0, '{"checks":["brand_alignment","dimensions","legibility"]}'),
('wnode_fnf_cr_present', 'wf_fnf_creative_studio', 'present_proof', 'output', 'Present creatives',
 'Gallery of variants with recommended primary pick and R2 paths.', 'fnf.present_creative',
 70, 'layout', 'files', 0, '{"phase":"present"}'),
('wnode_fnf_cr_remember', 'wf_fnf_creative_studio', 'write_memory', 'db_query', 'Remember style choices',
 'Save palette, layout patterns, and approved asset keys for reuse.', 'fnf.write_memory',
 80, 'bookmark', 'memory', 0, '{"target":"agentsam_project_context"}');

-- Brand Refresh
INSERT INTO agentsam_workflow_nodes (
  id, workflow_id, node_key, node_type, title, description, handler_key,
  sort_order, ui_icon, ui_lane, requires_approval, metadata_json
) VALUES
('wnode_fnf_br_intent', 'wf_fnf_brand_refresh', 'intent', 'trigger', 'Capture brand goal',
 'Recognition constraints, audience, and what must not change.', 'fnf.capture_brand_goal',
 10, 'target', 'intent', 0, '{"phase":"intent"}'),
('wnode_fnf_br_context', 'wf_fnf_brand_refresh', 'load_context', 'process', 'Load brand assets',
 'Current logos, bronze palette, storefront shell, and CMS theme tokens.', 'fnf.load_brand_context',
 20, 'layers', 'database', 0, '{"assets":["/media/archive/shopify-import/logos/","store_settings","store-shell.css"]}'),
('wnode_fnf_br_plan', 'wf_fnf_brand_refresh', 'make_plan', 'agent', 'Plan identity directions',
 '3+ directions with rationale; no live swaps in plan phase.', 'fnf.plan_brand_directions',
 30, 'compass', 'design', 0, '{"phase":"plan","min_directions":3}'),
('wnode_fnf_br_execute', 'wf_fnf_brand_refresh', 'execute_explore', 'agent', 'Explore identity',
 'Moodboards, logo refinements, type/color systems — staging only.', 'fnf.explore_brand',
 40, 'brush', 'design', 0, '{"phase":"execute","writes":"staging_only"}'),
('wnode_fnf_br_approval', 'wf_fnf_brand_refresh', 'approval_gate', 'approval_gate', 'Identity approval',
 'Required before replacing store logo, brand colors, or primary identity assets.', 'fnf.approval_brand',
 50, 'shield', 'memory', 1, '{"triggers":["replace_store_logo","replace_brand_colors","replace_primary_identity_assets"]}'),
('wnode_fnf_br_verify', 'wf_fnf_brand_refresh', 'verify_result', 'eval', 'Verify brand system',
 'Cross-surface check: header, product card, email, social thumbnail.', 'fnf.verify_brand',
 60, 'check', 'browser', 0, '{"checks":["store_header","product_card","social_thumbnail"]}'),
('wnode_fnf_br_present', 'wf_fnf_brand_refresh', 'present_proof', 'output', 'Present directions',
 'Side-by-side directions with rollout steps and risk notes.', 'fnf.present_brand',
 70, 'presentation', 'files', 0, '{"phase":"present"}'),
('wnode_fnf_br_remember', 'wf_fnf_brand_refresh', 'write_memory', 'db_query', 'Remember brand decisions',
 'Document chosen direction, rejected options, and rollout checklist.', 'fnf.write_memory',
 80, 'bookmark', 'memory', 0, '{"target":"agentsam_project_context"}');
