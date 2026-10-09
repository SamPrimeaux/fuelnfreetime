# FNF Revise D1 + R2 draft installation — 2026-10-09

Branch: feat/cms-revise-full-d1-r2-20261009 in SamPrimeaux/fuelnfreetime.

## Correct ownership

Actual CMS: Cloudflare D1 fuelnfreetime (9fd6ff92-e407-4b51-8b01-3c93f3845bb2) and R2 bucket fuelnfreetime. Do not use inneranimalmedia-business as the editor's page store. The local 4319 SiteDocument is a source fixture, not a deployed FNF CMS build.

## Confirmed draft data

| Page | Sections | Canonical blocks | Status |
| --- | ---: | ---: | --- |
| Stories | 4 | 33 (9 parents / 24 children) | draft |
| Campaigns | 4 existing | 47 existing | draft |
| Products | 5 | 27 (7 parents / 20 children) | draft |
| Ideas | 4 | 120 (8 parents / 112 children) | draft |
| Home | 8 existing | not modified | unchanged |

All 17 actual FNF CMS draft JSON bodies are uploaded to FNF R2 using the immutable backend/cms/r2-store.js content-addressed version-one convention. All 17 were read back: section key, status draft, version 1, hash, portable editor contract agree with D1. Thirteen new legacy/canonical section pairs link directly through legacy_section_id; four old Campaigns pairs had previously missing R2 pointers connected conditionally on their existing SHA-256 hashes. No existing Campaigns copy was overwritten.

Three draft CMS pages and three legacy pages inserted; 13 new section definition records derived from real reviseAtlas.schema; 24 top-level block groups and 156 child fields inserted. Version-one cms_revisions records point to matching R2 keys. D1 foreign_key_check has zero violations and canonical/legacy pointer joins report zero mismatches.

No public/published R2 objects created; no publish API invoked. Existing FNF Home page and its storefront snapshot are untouched.

## Reproducible code

- apps/ecommerce-cms-agentsam/backend/cms/registry.js adds Stories/Products/Campaigns/Ideas to the existing registry with actual Revise portable presets and draft-only status; does not replace Home.
- apps/ecommerce-cms-agentsam/backend/cms/api.js denies implicit published bootstrap of draft-only Revise pages, and ordinary save now mirrors versioned R2 pointer/hash/content projection into canonical cms_page_sections and inserts pointer-based cms_revisions draft rows.
- scripts/build-revise-campaigns-cms-seed.mjs adds --pages, --r2-drafts and --r2-out flags. The default Campaigns SQL remains byte-for-byte identical to its old seed. The new mode exports a safe, rerunnable D1 seed and 13 exact R2 payload documents and hash manifest, without publishing.
- D1 seed SQL is generated deterministically using --out; the 190 KB SQL is deliberately not committed as a duplicate source artifact. It inserts absent page, section, definition, block, and revision rows without overwriting newer edits.
- tests/cms-revise-full-r2-drafts.test.mjs and tests/cms-revise-save-roundtrip.test.mjs prove source hashes, registry, edit, optimistic conflict, R2 readback and canonical revision behavior.

To regenerate locally:

    node scripts/build-revise-campaigns-cms-seed.mjs --pages=stories,products,ideas --r2-drafts --r2-out=/tmp/fnf-revise-drafts --out=/tmp/fnf-revise.sql

Do not re-run a seed blindly on a tenant with newer edits. The authenticated editor API owns future changes.

## Unresolved and intentionally NOT counted as ready

Missing source media mappings: fnf.tee.front, fnf.hat, completeful.glass-coffee-can, fnf.build.dirt.1, fnf.graphic.fuel-up, fnf.hero, fnf.tee.back, fnf.build.dirt.4, fnf.build.heli.4. Corresponding block rows retain source keys and mark unresolved_media=true. Verify actual Asset Core and FNF R2 masters before declaring visual fidelity.

Source fixture is not necessarily the same as unsaved changes in local-browser localStorage. Hosted editor has not been deployed/visually verified; actual authenticated save/edit/preview/publish must still be exercised. Browser tests at 360/390/768/1440 pending. The imported cms_section_blocks tree is an initial projection; ordinary save updates both section records, R2, and canonical revisions, but full synchronization of nested block rows after subsequent edits/clone/reorder is not yet proven.

State: D1/R2 DRAFT WIRED, NOT PUBLISHED.
