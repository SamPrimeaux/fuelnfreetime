# Editorial Tile — D1 contract drift and inspector repair

Date: 2026-10-15. Scope: merchant Theme Studio, existing Shop editorial-grid.

## Grounded discovery (read-only production inspection)

- R2 published snapshot cms/pages/shop/history/editorial-grid.v1.44600121a2d83156.json contains nested tile1, tile2, tile3, and __editor.blocks entries with templateKey: editorial-tile.
- The first existing tile has the real content keys eyebrow, headline, imageUrl, href. The hosted Heuristic Shop markup uses data-cms-block=tile1 and the same four nested keys.
- The ACTIVE production cms_definitions section entry for editorial-grid version 1, origin=package, instead declares eyebrow, heading, anchor as SECTION-level fields, and allowed_blocks_json=["group"]. These have no corresponding authorable parent-section values.
- Previous attachCmsDefinitions() silently overwrote the section inspector fields and filtered editorial-tile out of the block template catalog. Selecting a card fell back to the invalid section fields, producing empty inputs and no image/link inspector.

## Remediation now in application code

- Block-only source sections do not accept unrelated section-level fields from D1 as usable editor fields.
- If a D1 child-type restriction matches NONE of the installed renderable block templates, it is recorded as schemaConflicts and cannot erase the real implementation or editable child contract.
- A missing selected-block schema never falls through to an unrelated parent section inspector.
- The Editorial Tile retains real image replacement, live media source, text, and searchable CMS page/collection/product link controls. Media changes retain the full contextual card inspector.
- Save still uses the existing CMS section revision path; unrelated cards remain unchanged. No new schema, tables, storage authority, or generated mock blocks.

## Follow-up requiring approval: correct the source definition

The production D1 definition is still stale. Do not silently mutate it or insert another competing definition. A later approved versioned repair should change the existing editorial-grid definition's settings_schema_json from the three bogus section fields to the actual section-level contract (currently {}), and its allowed_blocks_json from ["group"] to ["editorial-tile"]. Confirm the template definition itself and its installed artifact before promotion, then remove the compatibility warnings.

Acceptance: clicking any of the three published tiles loads that exact tile's four real fields; changing its media or destination updates only its preview node and persists via the current private draft R2/D1 revision and explicit publish; no parent/child schema mismatch; Heuristic/Revise/FNF native definitions remain independently intact.
