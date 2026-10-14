# Production Translation — Existing FNF CMS, Not a New Website Engine

This is a scoped build map from approved visual reference toward existing production architecture. **No deployment or live code change is authorized by this document.**

| UI component | Existing authority | Design action |
|---|---|---|
| Global header / lockup | CMS global header + FNF brand media/preferences; existing storefront theme | Present approved logo mark at a legible optical size and separate the full-name wordmark. Keep existing mobile dock and navigation behavior. |
| Hero / homepage | CMS page + ordered sections, theme renderer | Paper/photography editorial split hero, clear headline, concise real CTA; implement as reusable section settings, not one-off HTML. |
| Story cards | CMS stories/pages and section blocks | Three named editorial categories may appear as **labels** before articles exist. Only publish links to real articles. |
| Product detail | Current commerce product + variant + images + pricing + stock | Rework media gallery/zoom, clear selection and quantity; do not break selected color/size persistence through product creation/editor. |
| Product photography | Media assets + R2 originals/derivatives | Authentic originals, roles (primary, back, closeup, environment), no fabricated photo details or accidental derivative-as-master. |
| Collection tiles | Existing collections + section renderer | Essentials, High Octane and others only when real membership/stock exists. |
| Color and type | Theme tokens / FNF tenant settings | One approved palette with role-based tokens; headline font vs protected F&FT badge artwork. |
| Favicon | FNF-specific vector source and web icon config | Actual 16/32/48px optical assets derived from badge and inspected in browser tab. |

## Acceptance before marking ready
- Existing main/working storefront remains intact; visual branches isolated.
- 375, 390, 430, 768 and 1440px tested from **rendered screenshots**, not build success alone.
- Header, product gallery, collection links, cart/variant selection, keyboard focus and mobile menu work with real backend data. Do not replace with decorative dummy controls.
- Story items with no truth-backed content remain unpublished or clearly future-facing.
- No unsupported shipping, membership, local-manufacturing, founder story, price or stock claims.
- Output includes linked before/after screenshots and an approvals/change log.
- Reuse actual CMS sections and commerce routes; do not hardwire Fuel N Free Time into `apps/ecommerce-cms-agentsam` reusable product code.

**Process:** Design screenshot direction → Source-truth audit → CMS component design → Genuine UI and mobile acceptance → Justin visual review → controlled publish.
