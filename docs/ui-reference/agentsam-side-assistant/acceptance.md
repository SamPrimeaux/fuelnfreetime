# AgentSam reference-fidelity acceptance

These are implementation requirements, not inspirational suggestions. Browser DOM, geometry, keyboard interactions and source image comparison are required; module registration alone does not pass.

## DOM / interaction
- [ ] At 390, 744 and 1440px, mini composer remains within slot; placeholder visible, no clipping/overlap; explicit Expand increases composer height.
- [ ] Mini Send opens RIGHT assistant with user message, short plan and Create action card, WITHOUT backend generation.
- [ ] Clicking card adds one temporary LEFT tree node and editable request field, with NO backend generation.
- [ ] Editing request then clicking LEFT Send starts exactly one generation event, the 13-line code preview, phase aria-live and accessible Stop.
- [ ] Preview follows tail until user scrolls up. Uses textContent/text nodes, not generated innerHTML.
- [ ] Color classes for HTML tags (pink), attrs (blue), strings (green), template tags (indigo), CSS properties (teal), comments (gray), via host CSS tokens.
- [ ] Generation Lock/abort/error/cleanup uses the existing orchestration; no stale temporary node.
- [ ] Script-disabled review remains distinct from explicit private-draft accept and Publish.
- [ ] After acceptance, actual native settings inspector stays mounted and shows collapsible prompt/provenance and follow-up editor.
- [ ] Follow-up routes through same editable request gate; no silent generation.
- [ ] New Chat resets conversation; Expand changes presentation state only; context chip and placeholder update with selected page/section.
- [ ] Canonical currentColor AgentSam mark, not sparkle logo; reduced motion honored.

## Screenshot comparison gate
Reference screenshots have not been committed to this folder. Do not fabricate reference-01.png, reference-02.png or claim visual equivalence. Once provided, record reference image, browser image and measured deviations at all three widths. Unjustified deviation fails review.

## Permitted intentional deviations
- Replace donor branding with AgentSam SVG and FNF content.
- Reuse FNF canonical resource authority and existing D1/R2/editor contracts.
- Explicit script-disabled review/private accept protects publish boundary.
- Theme-host variables resolve colors; donor artwork is not copied.

## Prohibited
Do not redesign panels, replace compact rows with giant cards, remove existing controls, resurrect a duplicate backend registry, or confuse setup status with real MCP connection readiness.
