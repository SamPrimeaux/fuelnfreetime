-- Read-only verification for cms-data-family-20261007.
SELECT 'pages' AS metric,
       (SELECT count(*) FROM pages) AS legacy_count,
       (SELECT count(*) FROM cms_pages) AS cms_count;

SELECT 'sections' AS metric,
       (SELECT count(*) FROM page_sections) AS legacy_count,
       (SELECT count(*) FROM cms_page_sections) AS cms_count;

SELECT 'unmapped_pages' AS metric, count(*) AS n
FROM pages p
LEFT JOIN cms_pages cp ON cp.legacy_page_id = p.id
WHERE cp.id IS NULL;

SELECT 'unmapped_sections' AS metric, count(*) AS n
FROM page_sections s
LEFT JOIN cms_page_sections cs ON cs.legacy_section_id = s.id
WHERE cs.id IS NULL;

SELECT page_type, count(*) AS n
FROM cms_pages
GROUP BY page_type
ORDER BY page_type;

SELECT global_key, global_type, legacy_page_id, legacy_section_id,
       content_r2_key, content_version, status
FROM cms_globals
ORDER BY global_key;

SELECT s.legacy_section_id, s.section_key, s.section_type, count(b.id) AS blocks
FROM cms_page_sections s
JOIN cms_section_blocks b ON b.section_id = s.id
GROUP BY s.id
ORDER BY s.legacy_section_id;

SELECT entity_type, revision_kind, count(*) AS n
FROM cms_revisions
GROUP BY entity_type, revision_kind
ORDER BY entity_type, revision_kind;
