-- Hydrate normalized CMS globals from their existing R2-backed legacy snapshots.
-- This does not alter public content or publication status; it only makes the
-- same small settings available directly through cms_globals.
UPDATE cms_globals
SET inline_content_json = '{"logoUrl":"/media/archive/shopify-import/logos/fandft-clear-background.png","tagline":"Time is the real flex.","footerDescription":"For those who''ve earned their freedom through hard work, service, and dedication. This is more than apparel — it''s a badge of the life you''ve built."}',
    metadata_json = json_set(metadata_json, '$.inline_hydrated_from_r2', content_r2_key, '$.inline_hydration', '2026-10-07'),
    updated_at = datetime('now')
WHERE global_key = 'brand'
  AND content_r2_key = 'cms/pages/site/draft/brand.json'
  AND inline_content_json = '{}';

UPDATE cms_globals
SET inline_content_json = '{"exploreTitle":"Explore","exploreShopLabel":"Shop","exploreShopHref":"/shop","exploreCommunityLabel":"Community","exploreCommunityHref":"/community","exploreCollaborateLabel":"Collaborate","exploreCollaborateHref":"/collaborate","supportTitle":"Support","supportContactLabel":"Contact","supportContactHref":"/collaborate","supportPoliciesLabel":"Policies","supportPoliciesHref":"/policies","supportTermsLabel":"Terms","supportTermsHref":"/terms","supportDashboardLabel":"Dashboard","supportDashboardHref":"/admin/","connectTitle":"Stay Connected","instagramUrl":"","facebookUrl":"","youtubeUrl":"","newsletterTitle":"Get Updates","newsletterPlaceholder":"Your email","newsletterButtonLabel":"Join","copyright":"Fuel & Free Time. All rights reserved.","closingLine":"Built for those who''ve earned it."}',
    metadata_json = json_set(metadata_json, '$.inline_hydrated_from_r2', content_r2_key, '$.inline_hydration', '2026-10-07'),
    updated_at = datetime('now')
WHERE global_key = 'footer'
  AND content_r2_key = 'cms/pages/site/draft/footer.json'
  AND inline_content_json = '{}';
