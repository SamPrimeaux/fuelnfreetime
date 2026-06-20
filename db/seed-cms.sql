-- Seed CMS pages + hero sections (matches static HTML / stubs)

INSERT OR IGNORE INTO pages (slug, title, status, updated_at) VALUES
  ('home', 'Home', 'published', datetime('now')),
  ('shop', 'Shop', 'published', datetime('now')),
  ('about', 'About', 'published', datetime('now')),
  ('community', 'Community', 'published', datetime('now'));

INSERT OR IGNORE INTO page_sections (page_id, section_key, sort_order, content_json, status, updated_at)
SELECT p.id, 'hero', 0,
  CASE p.slug
    WHEN 'home' THEN '{"titleLine1":"TIME IS THE","titleLine2":"REAL HORSEPOWER","subheadline":"For those who''ve earned their freedom — on two wheels, four wheels, water, or in the garage.","ctaLabel":"Explore More","ctaHref":"./shop.html"}'
    WHEN 'shop' THEN '{"eyebrow":"Collections","headline":"A lifestyle built from grit — and time.","subheadline":"Shop High Octane, Masters, and Essentials. Clean grid. Real stories. Fire-orange attitude.","imageUrl":"https://cdn.shopify.com/s/files/1/0666/4060/9411/files/high_octane.jpg?v=1756307558","ctaPrimary":{"label":"Shop All","href":"#fft-grid"},"ctaSecondary":{"label":"Browse Collections","href":"#fft-collections"}}'
    WHEN 'about' THEN '{"meta1":"Est. 2025","meta2":"Made in Lafayette, Louisiana","headline":"Built in the Garage","subheadline":"Born from blood, sweat, and years of earning our freedom. This is more than a brand — it''s a brotherhood."}'
    WHEN 'community' THEN '{"headline":"Join the","headlineAccent":"Movement","subheadline":"Where every mile has a story, every hour is earned, and every member is family. This is more than a brand — it''s a brotherhood of freedom seekers.","stat1Value":"5K+","stat1Label":"Members Strong","stat2Value":"23","stat2Label":"Cities Connected","stat3Value":"150+","stat3Label":"Events Hosted","stat4Value":"∞","stat4Label":"Stories Shared"}'
  END,
  'published',
  datetime('now')
FROM pages p
WHERE p.slug IN ('home', 'shop', 'about', 'community');
