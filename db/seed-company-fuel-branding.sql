-- Fuel & Free Time issuer-brand SSOT (company table).
-- Only known values; unknown fields stay NULL.
-- Logo: storefront-verified clear-background mark.

INSERT INTO company (
  id, slug, name, legal_name, logo_url, favicon_url,
  primary_color, auth_bg_color, support_email, website_url, tagline, meta_json,
  created_at, updated_at
) VALUES (
  'co_fuelnfreetime',
  'fuelnfreetime',
  'Fuel & Free Time',
  NULL,
  'https://fuelnfreetime.com/media/archive/shopify-import/logos/fandft-clear-background.png',
  NULL,
  '#ff4d00',
  '#090909',
  NULL,
  'https://fuelnfreetime.com',
  'Time is the real flex.',
  json_object(
    'home_title', 'Fuel & Free Time',
    'meta_description', 'Earned-not-given lifestyle apparel — built in Lafayette, Louisiana.',
    'social_image_url', '/media/archive/shopify-import/graphics/high_octane.jpg',
    'public_assets_base', 'https://assets.fuelnfreetime.com',
    'worker_media_base', 'https://fuelnfreetime.com/media',
    'logo_asset_key', 'archive/shopify-import/logos/fandft-clear-background.png'
  ),
  unixepoch(),
  unixepoch()
)
ON CONFLICT(id) DO UPDATE SET
  slug = excluded.slug,
  name = excluded.name,
  logo_url = excluded.logo_url,
  primary_color = COALESCE(company.primary_color, excluded.primary_color),
  auth_bg_color = COALESCE(company.auth_bg_color, excluded.auth_bg_color),
  website_url = COALESCE(company.website_url, excluded.website_url),
  tagline = COALESCE(company.tagline, excluded.tagline),
  meta_json = COALESCE(company.meta_json, excluded.meta_json),
  updated_at = unixepoch();

-- If an older co_default row exists, point its logo at the same SSOT mark without wiping other fields.
UPDATE company
SET logo_url = 'https://fuelnfreetime.com/media/archive/shopify-import/logos/fandft-clear-background.png',
    name = CASE WHEN name IS NULL OR name = '' OR name = 'FuelnFreeTime' THEN 'Fuel & Free Time' ELSE name END,
    website_url = COALESCE(website_url, 'https://fuelnfreetime.com'),
    updated_at = unixepoch()
WHERE id = 'co_default' OR slug IN ('default', 'fuelnfreetime');
