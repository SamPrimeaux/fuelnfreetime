# FNF Media Library + AgentSam resource workbench

**Branch:** feat/fnf-media-agent-workbench-20261006
**Baseline:** main at 38c2e16 (October 6, 2026)
**Status:** Implementation in an isolated branch; **not merged or deployed**.

## Authority and reuse

Keep the existing Content Media Library, R2/D1 media ingest, packages/media-kit,
the portable packages/agentsam-workbench, and /api/admin/agentsam/chat.
There is no second media database, chat backend, admin shell, or product editor.

| Owner | Responsibility |
| --- | --- |
| packages/agentsam-workbench/src/media-asset-workbench.js | Portable resource composer, editor canvas and action presentation |
| frontend/static/js/media-library.js | FNF host adapter for selected media, uploads, comments and AgentSam |
| frontend/static/content.html, css/media-library.css | Existing asset inspector mount and responsive presentation |
| backend/admin/media.js | Existing media ingest with verified source provenance; review-comment append |
| backend/admin/api.js | Authenticated admin comment endpoint |
| frontend/static/js/agentsam.js | Preserve explicit image selection over unrelated bulk-selection context |

## Implemented in this branch

1. Opening a media image shows a contextual miniAgentSam composer in the existing inspector. No unsolicited full AgentSam drawer.
2. Tools: **Markup**, **Comment**, **Erase**, **Resize**, and visible but disabled **Remove BG**. PNG/JPEG/WebP can be pixel-edited; unsupported formats can still be commented on without being destructively rasterized.
3. A large editing dialog preserves the preview and offers pointer/pen/touch drawing, transparent pixel erasing, resize in exact pixel units with optional aspect lock, and undo/reset.
4. Explicit **Save as new asset** exports PNG through the existing media upload. The request links to a server-validated source media ID, records browser edit operations and uses the derivatives namespace. Uploaded originals are not mutated.
5. Review comments are pinned to normalized image coordinates, appended to media_assets.meta_json with an actor ID and server timestamp, and preserved across ordinary metadata changes through compare-and-swap.
6. The Versions inspector displays derivative source identity and edit operations when available.
7. AgentSam messages use existing transport with a selected media resource. Text proposals don't directly modify a media asset.
8. Responsive full-screen editing on phones and bounded panel editing on desktops.

## Explicit limitations

- **Background removal:** No FNF-authorized provider operation has been demonstrated. The button is disabled rather than simulating a cutout or silently sending assets to an unapproved service.
- **AI inpainting:** Erase removes pixels to transparency, not generative scene content.
- **Provider mockups:** A browser edited image is not a Completeful/manufacturer-verified render.
- **Production validation:** No live D1 comments, live R2 edits, authenticated end-to-end staging, or real-device editor QA is claimed.
- **Large/unsupported images:** Browser editing supports PNG/JPEG/WebP within 8192 px per edge and 20 MP. SVG/GIF/AVIF can be commented on, not pixel-edited.
- **Media lineage navigation:** Derivatives record their original asset; reverse listing and one-click source navigation are future improvements.
- **Orders, Inventory, Customers:** Not implemented by this media slice.

## Next implementation order

**Sprint B — Finish Media + AgentSam:** Validate real staging R2/D1 upload/comment and safe authentication, add authorized server/provider image transforms in Media Kit (including background removal only when available), shared proposal-review/accept workflow, dedicated asset detail view, source version navigation and true responsive editor interaction traces.

**Sprint C — Product-first Inventory:** Group by existing product/variant authority, expand actual SKU variants, expose stored local/POD/dropship classification, and prevent a stock form from overwriting a more recent order adjustment.

**Sprint D — Orders and Customers:** Provide actual order and customer detail routes on existing commerce records, separated payment/fulfillment state, Stripe sandbox labeling and safe customer consent. AgentSam prepares drafts but never sends contact messages without approval.

**Sprint E — Product Studio and CMS:** Host the same authorized workbench in artwork/section field contexts without new chat or media storage stacks. Preserve the current Studio Save/Next into Product Editor.

## Quality gates

- Run the new media-asset-workbench tests, existing media/mobile browser tests, and npm run build:admin.
- Require staging evidence for actual login, original asset identity, upload/reload, comment/reopen, and image edit Save/Discard before merging or deploying.
- Do not merge, deploy, or alter live customer content without explicit approval.
