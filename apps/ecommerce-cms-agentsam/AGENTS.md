# FNF Ecommerce CMS — Agent Authoring Rules

## Reference-fidelity implementation (mandatory)

When this app has a committed UI reference or a user-provided reference screenshot, treat it as an **implementation contract**, not inspiration. Reproduce the reference's interaction/layout model and information hierarchy closely while substituting canonical FNF/AgentSam data, ownership, branding, and theme tokens. "Polish" never authorizes arbitrary redesign.

Do **not** collapse or relocate panels, swap compact menu rows for oversized cards, hide controls shown in the reference, invent substitute icons, change established picker or modal workflows, or reinterpret placement/density without recording an explicit justified deviation. Do not copy donor code, logos, artwork, or proprietary assets. Use our canonical AgentSam vector and existing application registries/renderer instead.

Every reference-driven change must follow: **reference contract → implementation → actual DOM/browser screenshot → visual comparison at desktop/tablet/mobile → fail on unjustified drift**. Keep the chosen reference and acceptance checks together under `docs/ui-reference/`; never claim pixel comparison when reference files are missing. Browser mount/geometry and keyboard interaction are acceptance requirements, not tests of module registration alone.

**Assistant handoff authority:** mini composer sends text to the right-docked Side Assistant. Only an action-card click opens the left-side editable request and client-only temporary tree node; only its Send may start generation. The editor's existing generation session, lock, Stop/abort, native inspector, and R2/D1 accept/publish authority remain unchanged. A generated code preview is text-only and cannot execute source HTML/JS.


Scope: `apps/ecommerce-cms-agentsam/`. Read `theme/authoring.contract.json` before editing storefront sections, blocks, or Theme Studio. This is our portable adaptation of the Shopify theme authoring guide, **not a Liquid/Shopify runtime**.

## Ownership and source of truth

Inspect existing code, schema, renderer, and tests **before adding anything**. Extend the component or contract that already owns the behavior. Never create a second page authority, editor, renderer, media store, or type registry.

| Concept | FNF authority |
| --- | --- |
| Page/resource | `cms_pages`, existing route/template resolution |
| Placed section | `cms_page_sections` |
| Placed/nested block | `cms_section_blocks` |
| Reusable section/block definition | `cms_definitions` (roll out through migration; do not assume deployed) |
| Implementation and versions | `cms_artifacts`, immutable R2 objects |
| Private work, publish, history | `cms_revisions` and current publishing API |
| Global shared settings | `cms_globals` |
| Images/video | `media_assets` or existing media references |
| Products/collections/orders | Commerce resource bindings, never CMS-owned copies |

Read `backend/cms/registry.js` and `cms/block-types.json` as existing compatibility inputs. Avoid creating a competing section renderer. Introduce runtime `cms_definitions` integration only when migrated and validated against these inputs.

## Editing and composition

Pages contain sections; sections contain ordered, optionally nested blocks; settings describe merchant-facing options. **Definition != instance.** Built-in, imported, generated, packaged, and App-provided are provenance values, not editor types.

Search existing keys and schemas first; preserve stable page, section, block, and setting IDs. Treat setting keys/types/options as public APIs. Use a `cms_definitions` entry with semantic key, kind, label, category, settings schema, allowed blocks, implementation reference and provenance. Respect allowed block kinds and static/required positions. Static means structurally fixed, not inherently uneditable.

Store editable copy in section/block instance settings; site-wide settings in globals; business data as resource references; images in media; HTML/CSS/JS implementation in versioned artifacts. Keep useful presets as initial instance data, not separate page authorities.

## Theme Studio UX safety

Always open or restore a **private working revision**. Autosave never publishes. Publish is the sole deliberate live transition. Protect existing private work before changing import/reconciliation logic. Do not expose `Start editing page`, `Replace private draft`, `live-only`, or `adapter needed` in normal merchant workflows.

The left drawer navigates, the preview renders the real section, and the contextual inspector edits the selected section or block. Add Section/Block opens a visual catalog, not a scroll tunnel. Filter block choices by the containing definition. Preserve selection and scroll when the right-hand AgentSam panel opens. Contextual miniAgentSam is a fixed-height, one-line command capsule; full conversation belongs to Side Assistant.

## AgentSam generate/edit/normalize workflow

1. Inspect the intended page, selected node, existing owners, settings, and applicable contracts.
2. Propose a semantic reusable definition. **Never** introduce generic `custom`/`ai_section` as the permanent type.
3. Extract typed merchant settings and resource pickers. Keep code and data separate.
4. Create a temporary tree item during generation; stream honest phases and allow cancellation.
5. Validate markup, CSS, JS, namespace and code safety; repair before acceptance.
6. Namespace per-instance behavior with `agentsam_gen_` identifiers and instance-scoped selectors/properties; avoid globals and cross-instance collisions.
7. Store implementation as an immutable artifact; register/version the definition and insert a normal section/block instance.
8. Select the resulting normal tree row. Render its inspector from the definition schema. Follow-up edits produce a new artifact version under the same semantic key unless the component's meaning changes.

The generator may use any authorized provider; neither the UI nor this guide may hardcode one model. A generated section must survive the same duplicate, hide, reorder, nested-block, reload and publish path as stock.

## Styling, interaction and security

Use existing theme tokens and component owners. Keep feature CSS with its implementation, shared foundations global, and merchant-controlled values in scoped custom properties. Prefer native semantic controls. Preserve keyboard/focus behavior, ARIA names, alt text, accessible contrast, and reduced-motion behavior. Use responsive intrinsic sizes, `min-width: 0`, bounded media, text wrapping, and narrow-screen testing. Clean up observers/listeners/timers and prevent stale requests overwriting newer edits. Product widgets must preserve variant identity, inventory, quantity, pricing and checkout actions.

Do not copy Shopify-specific Liquid tags, `content_for`, `shopify_attributes`, app objects, `@theme/component`, section-renderer APIs, or translation file paths into FNF. Map those responsibilities onto our actual TS/JS, Workers, CMS and theme runtime after inspecting the code.

## Required validation before declaring done

Check schema validity, existing owner reuse, identity stability, allowed-block rules, settings references, resource/media resolution, artifact integrity, scoped CSS, independent duplicate instances, accessible and responsive preview, reduced motion, editor field round-trip, private draft persistence, refresh, and deliberate Publish. Verify desktop and narrow widths, missing/long content, and empty/populated collections. Run relevant tests and build commands; report any check **not run** as unverified.

Do not silently deploy a database migration or promote work to the live storefront. Do not invent tables such as `cms_ai_sections`, `cms_custom_sections`, or `cms_section_templates`.
