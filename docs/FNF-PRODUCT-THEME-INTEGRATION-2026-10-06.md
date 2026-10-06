# FNF Product Studio and Theme convergence (2026-10-06)

## Runtime authority

- **Commerce:** `products` and `product_variants` remain the sole merchant product and variant identity. `completeful_product_links` only joins optional provider catalog/store metadata; no second supplier product catalog is introduced. The portable `@inneranimalmedia/agentsam-merch` package classifies artwork manufacturing readiness, plans derivatives and groups stock, but it owns no application persistence.
- **Media:** source masters and purpose-specific derivatives use the existing Media Library API and storage, not an independent merch media library. A manufacturing derivative is not interchangeable with a storefront optimized image.
- **Theme editing:** the existing `/admin/theme-editor` and `/api/admin/cms/pages` own real page drafts, revisions and publishing. `packages/theme-contract/editor` provides optional portable adapters; it does not own an extra database or publish a different page. The existing `ThemeStudioPreview` registry and host-provided FNF/Revise/Heuristic renderers support theme appearance previews; cross-theme portable sections are actual reusable CMS section instances.

## Deliberately not imported from the old Theme Library worktree

The old worktree's `store_theme_pages` and `store_themes` migrations, parallel `/api/admin/store/themes/*/pages` endpoint, and new theme-workspace page were **not** migrated. They duplicate CMS page authority and could make the live preview disagree with the published storefront. Visual theme selection other than the live Heuristic renderer remains preview-only; no code may claim it is publishable until runtime rendering, release/rollback and preview fidelity are demonstrated against the same live CMS document. Existing worktree files must be preserved until their owners retire them.

## Operator acceptance path

1. Select a real Completeful or store-managed product in Product Studio; choose artwork, inspect compatibility, save the design draft and advance to Product Editor.
2. Reopen the product and its artwork master; confirm save/reload, variant identities and inventory grouped by product. Test both a successful inventory adjustment and a stale-value conflict in two tabs.
3. Open Media Library, inspect source and derivatives independently, and verify saved versions are not silently substituted for production artwork.
4. Open Theme Studio on a **real CMS page**, insert a portable section from another visual theme, edit it, save draft, preview and reopen. Publish only while the live Heuristic renderer is selected and compare with the public page.
5. Preview Revise/FNF in desktop and mobile sizes as **visual previews**, not an active theme switch. No theme-specific page store or parallel editor should appear.

## Release boundaries

Provider manufacturing profiles shipped as operator-defined data are not provider-certified production requirements. A passing build or in-memory adapter test does not prove a real Completeful order, manufacturer acceptance, or live theme switch. The remaining end-to-end workflows must be exercised with real authorized data before declaring those operations complete.
