# FNF Theme Editor — contextual inspector and theme navigation

October 6, 2026. Changes to the existing ecommerce-cms-agentsam Theme Editor only. No new editor, schema migration, public-page redesign or production content writes.

## Problem

The old right rail split one selected section/block into Content, Media, Links and Layout tabs based on the input type. Editing a single collection card required switching views just to modify its copy, image and CTA. Three equal-weight preview theme buttons falsely suggested that each was an active and publishable storefront theme.

## Behavior

- **Theme identity:** A single Theme preview menu names the currently selected renderer. Heuristic is the current publishable storefront renderer; Revise and FNF are visibly labeled preview only. Selection never changes the published theme.
- **Page and device:** Keep the authenticated page selector, device switcher, page settings and Publish controls. The page picker stays accessible at small breakpoints.
- **Contextual inspector:** Selecting a section or block exposes its relevant text, media and buttons/links in one scrolling panel. CTA labels stay beside their destinations. No four-category tabs or empty-tab dead ends.
- **Advanced controls:** Schema-defined appearance, responsive and motion inputs remain available under an expandable Appearance and layout area. Editor-only outlines/refresh settings are separately tucked under Preview preferences.
- **Hierarchy:** A selected block has a parent-section return action. The existing tree selection, media picker, draft save, versioned mutation, publish and preview mechanisms are unchanged.
- **Mobile:** Keep one-pane-at-a-time Sections/Preview/Settings; do not obscure the edited preview with a fixed bottom drawer.
- **Authority:** Every displayed control still uses the current FNF CMS registry and established backend APIs. No stored field names, D1/R2 authorities, renderer identities or media records were changed.

## Verification

- Admin build, frontend sync and ownership-boundary checks passed.
- 30 existing CMS/theme source tests passed.
- Actual Chrome Shop editor smoke passed at 1440, 744 and 390 pixels. It verifies one theme menu, three available preview renderers inside that menu, page selector visibility, removed old tabs, the real Collection Card exposing Content + Media + Buttons and links simultaneously, direct return to parent Collections section, live-source import, responsive pane switching and no horizontal overflow.
- The current Portable theme sections workflow already exercises live Chrome editor interactions. The workflow will also include the revised header/CSS source checks.

## Production gate

Review the finished authoring experience in the authenticated FNF app and verify save/reload across browsers before merging and deploying. The branch does not write production Cloudflare resources, does not swap a live theme and does not claim independent cross-theme publication.
