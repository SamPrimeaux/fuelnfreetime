-- Auto-generated from src/cms/registry.js — do not edit by hand
-- Run: npm run db:seed:cms:full

INSERT INTO pages (slug, title, status, updated_at) VALUES ('site', 'Site (global)', 'published', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'published', updated_at = datetime('now');

INSERT INTO pages (slug, title, status, updated_at) VALUES ('home', 'Home', 'published', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'published', updated_at = datetime('now');

INSERT INTO pages (slug, title, status, updated_at) VALUES ('shop', 'Shop', 'published', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'published', updated_at = datetime('now');

INSERT INTO pages (slug, title, status, updated_at) VALUES ('about', 'About', 'published', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'published', updated_at = datetime('now');

INSERT INTO pages (slug, title, status, updated_at) VALUES ('community', 'Community', 'published', datetime('now'))
ON CONFLICT(slug) DO UPDATE SET title = excluded.title, status = 'published', updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'brand', 0, '{"logoUrl":"/media/archive/shopify-import/logos/fandft-clear-background.png","tagline":"Time is the real flex.","footerDescription":"For those who''ve earned their freedom through hard work, service, and dedication. This is more than apparel — it''s a badge of the life you''ve built."}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'site'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'hero', 0, '{"titleLine1":"TIME IS THE","titleLine2":"REAL HORSEPOWER","subheadline":"For those who''ve earned their freedom — on two wheels, four wheels, water, or in the garage.","ctaLabel":"Explore More","ctaHref":"./shop.html","glbUrl":"/media/archive/shopify-import/3d-models/Emblem_of_Elegance.glb"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'manifesto', 1, '{"line1":"Some chase","highlight1":"horsepower.","line2":"We chase","highlight2":"hours.","body1":"Fuel & Free Time isn''t about how fast you go — it''s about finally having the time to go at all.","body2":"Born in a Lafayette garage, built for those who''ve earned their freedom. Whether you''re a veteran who''s done your time, a weekend warrior stealing moments, or a young gun working toward that first real ride.","body3":"You get it. Time is everything money can''t buy back.","imageUrl":"/media/archive/shopify-import/graphics/50C9CEB5.png"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'collections', 2, '{"badge":"Limited Drops","title":"Fuel Your Style","card1":{"name":"High Octane","description":"Performance gear for redline living","imageUrl":"/media/archive/shopify-import/graphics/high_octane.jpg","href":"/collections/high-octane-performance-gear"},"card2":{"name":"Masters","description":"For those who''ve earned their stripes","imageUrl":"/media/archive/shopify-import/graphics/Masters.png","href":"/collections/masters"},"card3":{"name":"Essentials","description":"Daily drivers for the daily grind","imageUrl":"/media/archive/shopify-import/graphics/Gone_Fishing.png","href":"/collections/essentials"}}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'values', 3, '{"title":"More Than Merch","v1":{"title":"Earned Not Given","description":"Every thread tells a story of hard work and dedication. This isn''t fast fashion — it''s a lifestyle earned through years of grinding."},"v2":{"title":"Built in Lafayette","description":"Proudly designed, cut, and sewn in Louisiana. Supporting local means building something real in a world of dropshipped dreams."},"v3":{"title":"Community First","description":"From garage nights to poker runs, we''re building connections that matter. Real people, real stories, real freedom."}}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'community', 4, '{"title":"Join the Movement","subtitle":"Where every mile has a story and every hour is earned","f1":{"title":"Hunt Drops","text":"Exclusive scavenger hunts for limited gear"},"f2":{"title":"Garage Nights","text":"Monthly meetups in Lafayette and beyond"},"f3":{"title":"Fuel Stops","text":"Pop-ups where stories meet the road"},"f4":{"title":"Early Access","text":"First dibs on every limited release"}}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'comingSoon', 5, '{"title":"The Clock is Ticking","dateLabel":"First Drop • November 3rd, 2025"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'newsletter', 6, '{"title":"Stay Fueled Up","text":"Get first access to drops, event invites, and the stories that matter.","buttonLabel":"Join"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'home'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'hero', 0, '{"eyebrow":"Collections","headline":"A lifestyle built from grit — and time.","subheadline":"Shop High Octane, Masters, and Essentials. Clean grid. Real stories. Fire-orange attitude.","imageUrl":"/media/archive/shopify-import/graphics/high_octane.jpg","ctaPrimary":{"label":"Shop All","href":"#fft-grid"},"ctaSecondary":{"label":"Browse Collections","href":"#fft-collections"}}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'shop'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'collections', 1, '{"title":"Collections","card1":{"name":"High Octane Collection","imageUrl":"/media/archive/shopify-import/graphics/high_octane.jpg","href":"#fft-grid"},"card2":{"name":"Masters Collection","imageUrl":"/media/archive/shopify-import/graphics/Masters.png","href":"#fft-grid"},"card3":{"name":"Everyday Essentials","imageUrl":"/media/archive/shopify-import/graphics/Gone_Fishing.png","href":"#fft-grid"}}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'shop'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'stories', 2, '{"title":"Built for the long haul","body":"Every piece is designed for people who''ve earned their hours — not given them.","imageUrl":"/media/archive/shopify-import/graphics/fuel_up.png"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'shop'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'newsletter', 3, '{"title":"Stay fueled. Don''t miss drops, meetups, or giveaways.","buttonLabel":"Join the Movement"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'shop'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'hero', 0, '{"meta1":"Est. 2025","meta2":"Made in Lafayette, Louisiana","headline":"Built in the Garage","subheadline":"Born from blood, sweat, and years of earning our freedom. This is more than a brand — it''s a brotherhood."}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'about'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'moment', 1, '{"headline":"The Moment That Started It All","body":"Late nights in the garage. Engines cooling. Stories flowing. That''s where Fuel & Free Time was born.","videoUrl":"/media/archive/shopify-import/videos/video-2-48add6d0.mp4"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'about'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'collections', 2, '{"title":"Three Collections. One Brotherhood.","card1":{"title":"Fuel & Free Time Core Collection","imageUrl":"/media/archive/shopify-import/graphics/50C9CEB5.png"},"card2":{"title":"High Octane Performance Collection","imageUrl":"/media/archive/shopify-import/graphics/Vette.png"},"card3":{"title":"Masters Series Limited Edition","imageUrl":"/media/archive/shopify-import/graphics/fuel_up.png"}}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'about'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'origins', 3, '{"headline":"Fuel & Free Time Origins","body":"From Lafayette garages to open roads — every design starts with a story worth wearing.","imageUrl":"/media/archive/shopify-import/graphics/50C9CEB5.png","videoUrl":"/media/archive/shopify-import/videos/video-1-f506d934.mp4"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'about'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'lifestyle', 4, '{"headline":"High Octane Lifestyle","imageUrl":"/media/archive/shopify-import/graphics/high_octane.jpg"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'about'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'hero', 0, '{"headline":"Join the","headlineAccent":"Movement","subheadline":"Where every mile has a story, every hour is earned, and every member is family. This is more than a brand — it''s a brotherhood of freedom seekers.","stat1Value":"5K+","stat1Label":"Members Strong","stat2Value":"23","stat2Label":"Cities Connected","stat3Value":"150+","stat3Label":"Events Hosted","stat4Value":"∞","stat4Label":"Stories Shared"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'community'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');

INSERT INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'join', 1, '{"headline":"Ready to Ride With Us?","body":"Join the movement. Get early access to drops, event invites, and the stories that matter.","ctaLabel":"Join the Movement","ctaHref":"#newsletter"}', 'published', datetime('now')
FROM pages p WHERE p.slug = 'community'
ON CONFLICT(page_id, section_key) DO UPDATE SET
  sort_order = excluded.sort_order,
  content_json = excluded.content_json,
  status = 'published',
  updated_at = datetime('now');
