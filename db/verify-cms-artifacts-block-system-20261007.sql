-- Read-only checks for the artifact-aware nested block system.

SELECT name, type
FROM sqlite_master
WHERE name IN ('cms_artifacts','cms_section_blocks')
ORDER BY name;

SELECT name
FROM pragma_table_info('cms_section_blocks')
WHERE name IN ('parent_block_id','artifact_id')
ORDER BY name;

SELECT count(*) AS artifact_count FROM cms_artifacts;
SELECT count(*) AS block_count FROM cms_section_blocks;

SELECT block_type, count(*) AS n
FROM cms_section_blocks
GROUP BY block_type
ORDER BY block_type;

SELECT count(*) AS cross_section_parent_mismatches
FROM cms_section_blocks child
JOIN cms_section_blocks parent ON parent.id = child.parent_block_id
WHERE parent.section_id <> child.section_id
   OR parent.account_id <> child.account_id;

SELECT count(*) AS cross_account_artifact_mismatches
FROM cms_section_blocks b
JOIN cms_artifacts a ON a.id = b.artifact_id
WHERE a.account_id <> b.account_id;
