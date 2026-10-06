# Fuel N Free Time — Brand Workspace

**Stage:** Prelaunch, working materials. **Not** blanket approval from Justin.

This is the starting index for the FNF brand and creative work. The existing live storefront, CMS and media library remain the operational systems for publishing; this folder is for creative direction, approvals, portable master artwork and evidence.

## Start here

| Need | Where |
|---|---|
| Understand the brand and what is still proposed | [Original handoff](foundation/00_START_HERE.md) |
| Purpose, voice, manifesto | [Brand foundation](foundation/01_Brand_Foundation_and_Positioning.md) · [Messaging](foundation/02_Voice_Messaging_and_Manifesto.md) |
| Find the preserved F&FT logo vectors | [Badge masters v1](identity/artwork/v1/README.md) |
| Know where every creative asset belongs | [Creative library](creative/README.md) |
| Review aviation, motorsport and other mockups | [Collection concepts](collections/concepts/README.md) |
| Organize actual merch photography | [Product photography](products/photography/README.md) |
| Plan pickup footage, bike wrap and launch visuals | [Campaign creative](campaigns/creative/README.md) |
| Review outstanding founder decisions | [Justin's review questions](collaboration/11_Justin_Review_Questions_and_Decisions.md) |
| Plan website/CMS publishing | [Website brief](website/09_Website_CMS_Content_and_SEO.md) |

## Source-of-truth boundaries

- **This Git folder:** brand strategy, concept records, permissions/approval notes and reusable artwork masters.
- **FNF Content / media library:** real uploaded photos and videos, albums, optimization and delivery via existing D1/R2-backed infrastructure.
- **FNF Product Studio / commerce:** actual products, variants, production artwork placement, inventory and merchandising.
- **FNF CMS:** live public pages, collections, stories and campaigns when implemented and published.
- **Shared ChatGPT Project:** asynchronous brainstorming and reviews, **not** the authoritative production inventory.

An image in this workspace is not automatically published or manufacture-approved. A published asset doesn't retroactively approve a draft logo.

## Existing materials

The identity master pack at `identity/artwork/v1/` is **manufacturer-review only**, even though vector formats exist. The logo family is indexed in [creative/asset-registry.json](creative/asset-registry.json).

Older brand materials in `docs/brand/` also exist; they are background references and should be reconciled deliberately, not silently overwritten.

## Workflow

1. Capture an incoming idea or original photo.
2. Create a short [asset record](creative/templates/ASSET_RECORD.md) with provenance and status.
3. Place the record in the relevant category; store heavyweight originals in the existing media library or approved durable storage.
4. Get Justin's explicit input/approval for design, public claims and products.
5. Prepare vendor proofs or publish through existing FNF systems; record exact links/IDs once known.
6. Preserve originals, decisions and versions. Never replace a master in place.

**Naming:** Prefer stable identifiers (e.g. `fnf-aviation-smoke-show-01`), descriptive filenames, and version suffixes. Keep collection labels descriptive; no fake SKU or inventory until a real product record exists.

## Working identity gallery (admin only)

The six transparent PNG previews from the manufacturer-review pack are registered in the existing FNF Content library album **FNF Identity — Review v1**. Open [FNF Content](https://fuelnfreetime.com/admin/content), then choose the album. These remain **review-stage assets**: the import does not approve, publish, or manufacture any design.

The versioned asset registry records the preview keys. To audit or repeat the import without creating duplicates, run `node scripts/import-fnf-brand-previews.mjs` (dry-run) and explicitly pass `--apply` for R2/D1 writes. Keep source vectors and manufacturing masters in Git, never only in the media library.
