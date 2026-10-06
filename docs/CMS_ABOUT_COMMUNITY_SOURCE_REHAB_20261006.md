# About and Community — FNF CMS source rehabilitation

**2026-10-06.** This is an authentic-source retrofit of the current Heuristic storefront, NOT another editor or a new CMS database.

## Verified production mismatch

Read-only FNF production D1 inspection found 5 published CMS rows for 9 actual About sections, and 2 published CMS rows for 6 actual Community sections. Existing published rows stay untouched by this branch. Global header/footer remain centrally owned by the existing storefront, not cloned into page section tables.

## Authored section inventory

About (original order, identifiers preserved): hero, moment, video, collections, against, lafayette, origins, lifestyle, cta.

Community (original order, identifiers preserved): hero, events, gallery, join, stories, social.

The original page HTML still owns markup and Heuristic styles. All fifteen visual regions now have stable CMS section identifiers and addressable text, link, or media fields. Original repeatable collection, editorial, values, event, gallery, connection, and story cards now have stable block IDs and compatible block-type definitions. The alternating About story panels retain distinct photo and video block shapes; they are not flattened into generic tiles. The original FNF media references remain in place.

## Actual cloud/editing workflow

The existing FNF CMS registry describes those exact source sections, and the existing Theme Editor controls them. Live-source import now recognizes qualified section.field and block.field identifiers. The CMS API reports missing source section keys by comparing the actual D1 page-section rows against the registered real source. When About or Community has existing published rows but lacks some real sections, Theme Editor offers **Stage N missing sections**, only after explicit merchant confirmation.

Staging uses the preexisting authenticated insert-section endpoint for the absent registered keys, saving real private D1/R2 draft records without replacing any of the seven old published records and without calling the Publish endpoint. Merchant may preview/reload/edit, then explicitly publish through the existing workflow. Public pages still render the previous published snapshot until approval.

This is **not a production data migration**: the branch does not mutate D1/R2/KV or deploy Workers. In particular, previously published old Community hero statistics can still override the newly corrected static fallback until the merchant explicitly approves revised content. No dummy totals, historical event dates, or unverified testimonials should be published as current facts.

## Editorial polishing, without redesign

About: improved source-scoped contrast and reading rhythm on the light narrative panels, retained the existing picture/video alternation, preserved the Lafayette roots and garage story, removed unsupported assertions that every product is sewn locally, and expanded the brand story to real restoration projects and work-in-progress. Mobile media/story layout and reduced motion received guards.

Community: old 2025 events are now clearly labeled **ideas with unconfirmed dates**, the previously blank gallery and event rails use existing FNF archive imagery (six URLs verified HTTP 200), controls link to real destinations, and sample member quotes are visibly labeled as placeholders pending approval. No customer metrics or real events are fabricated.

## Scope of portability

Source IDs and the editor schema are now aligned with the existing Heuristic runtime; no new editor or section rendering stack was added. These source sections still depend on their original page CSS/motion implementation. Do NOT call them installable across themes until their styles and behaviors are packaged and independently tested in a second consumer. The shared CMS metaobject/template contract can bind them after the existing FNF cloud adapter has a validated content storage and versioning path.

For one customer installation per Worker/DB, explicit site_id on every media row is not required. Keep account/site access checks on APIs; add tenancy keys only when storage becomes shared across different paying customers. Do not duplicate the R2 media library.

## Acceptance and commands

- npm run build:admin — frontend sync and boundary guards
- node --test tests/cms-editor-mutations.test.mjs tests/cms-about-community-source.test.mjs — 14 passing tests
- node scripts/smoke-about-community-cms.mjs — real Chrome tests at 390, 744 and 1280px for each page
- Before approving a publish: verify all sections in the actual Theme Editor; use Stage missing sections, review first/last section backgrounds and responsive types; approve truthful hero copy and event/story data; reload the saved draft in another browser; confirm public URL and rollback.

Published media claims, merchandising, events, and member quotes require explicit owner editorial approval, separate from the code review.

## Remaining integration gate

Extract the original Heuristic section CSS/JS as pinned portable renderer bundles with before/after design-fidelity checks in another customer theme. Create real typed Events/Project/Story resource entries and reference pickers backed by a versioned tenant-safe FNF cloud adapter. This must be implemented in the current CMS Studio and current FNF theme editor, not another editor and not a browser-only mockup.
