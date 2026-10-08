# AgentSam Side Assistant — Reference contract

Source: user-provided reference-fidelity and generation-flow requirements (October 8, 2026). Screenshot reference files are not committed yet. Never claim pixel matching without the source images.

## Fixed geometry
- Side Assistant is the right rail; left Theme Studio tree/block panel owns generation; storefront preview stays centered; native settings inspector remains the existing editor.
- Compact header: canonical AgentSam mark, New Chat, Expand as presentation-only, Close, contextual selection chip.
- Mini composer is single-line until explicit expand; the same custom element serves editor and dock slots.

## Interaction
1. Mini composer sends text to Side Assistant, opening it, appending the user message, short explanatory reply, and a Create section action card. No generation.
2. Only action-card click inserts one client-only temporary tree node and opens the editable request in the left block panel. No generation.
3. Only Send from that panel starts existing generation lock, SSE phases, Stop/abort and 13-line text-only preview.
4. Generated output receives script-disabled review and explicit acceptance into a private draft through existing D1/R2 APIs. No automatic publishing.
5. Once accepted, the native inspector owns settings, plus collapsible AI-generated prompt/provenance and per-section follow-up. Follow-up returns to editable request before another Send.
6. Failure and abort clean temporary nodes; no fake completion or silent publish.

## Shared authority
- Existing app/backend owns resource discovery, authorization, tool routing, persistence, media, D1 and R2. The portable UI owns composer and picker interaction only.
- Future Products/Orders/Customers/Collections mentions must carry typed, authorized resource references, not raw text or extra registries.
- User-owned Skills must reuse existing skill schema and real CRUD; never static fake entries.
- Keep the canonical AgentSam SVG from SDK; FNF stages its copy under frontend/static/brand/agentsam-mark.svg with color controlled by host theme, not repainted/rasterized.

See acceptance.md for acceptance and visual comparison gates.
