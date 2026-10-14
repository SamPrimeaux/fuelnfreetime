# FNF — Designed From What Already Exists
**Creative direction v1 — 2026-10-14.** Status: DIRECTION FOR REVIEW, not a legal, launch, production, or founder sign-off.

## Design decisions now, not more discovery worksheets
1. **Positioning:** A lifestyle brand for people who work hard and make time for what moves them. Time and personal freedom are the center; vehicles, garage projects, friends, exploration and craftsmanship are expressions of that idea. This is already established in `foundation/01_Brand_Foundation_and_Positioning.md`; we are carrying it forward, not restarting it.
2. **Signature:** Keep the user's recognizable *F&FT badge* as the central product identity. Physical cap examples and supplied garment presentation support this. Do not redraw it as a single F, a generic FN, a flame or a new hexagon. The work is to reconcile the variants **from the original**.
3. **Architecture:** One master badge family, controlled color/production variants, a readable full brand lockup and a derived favicon. Different media roles do not warrant different brand logos.
4. **Visual direction:** Workshop editorial, warm stock paper, dense black typography, clean restrained orange/red accents, occasional brass/gold on physical goods, authentic dark garment imagery, wide image crops, generous white space.
5. **Typography:** Giant condensed utility headings; measured serif editorial copy; concise crisp UI labels; the F&FT lettering remains a preserved artwork asset (do not retype it in the heading font).
6. **Merchandising:** Quiet left-chest badge on a shirt, larger narrative artwork on select back prints. F&FT caps make a credible everyday anchor. Product photography must communicate the actual item, not just a cinematic scene.
7. **Tone:** Conversational and grounded. `Made for the Hours Between` is the working campaign direction shown in the current concept, not a binding global slogan. We already know “Earn Your Freedom” appears in user-supplied product artwork; no need to repeatedly ask for slogans before designing.
8. **Information architecture:** SHOP (real products), STORIES (honest projects/people), the brand perspective (“The Process” or About) and an unobtrusive header. No false published stories to populate a page.
9. **Mobile first:** Legible logo and above-the-fold content; gallery/action layout designed for thumb use; no unbounded hero height or unreadable product data.
10. **Truth:** Remove or verify live claims like “Earned in Louisiana”, “small-batch drops”, invented member discounts/shipping, unsupported product materials, and fiction presented as founder history.

## Source-derived UI signatures from the supplied October 14 screenshots
| Reference | We should preserve | We should not inherit |
|---|---|---|
| Editorial Stories concept | Paper-like warm ivory, highly condensed black display headings, workshop dusk photography, editorial captions, three-column narrative teasers, orange micro-lines, generous typography hierarchy | “Field Notes Vol. 01” as a published issue with fabricated articles if none exist |
| Hoodie PDP concept | Big product media, side thumbnails, aligned product information, sensible color/size controls, strong buy action position, useful detail accordions, restrained proof/microcopy | Invented pricing, 20%-off membership, free-shipping thresholds, “premium comfort”, original-artwork claims or stock not proven |
| Existing live homepage screenshot | Strong machine/after-work photography, atmospheric evening palette, time-first concept | Tiny unreadable lockup, overly dark hero, broad indistinct “explore” buttons, unsupported locality/production statements |
| Original red F&FT logo | Exact shield and typography DNA; red-on-black application as an existing source | Generative single-letter replacements and unapproved metallic remakes |

## System palette (UI exploration, not printer ink or brand legal values)
- Ink `#151412`
- Warm paper `#F1EDE4`
- Signal rust/red-orange `#E34B16` (website interface accent — source logo red remains separately preserved)
- Brass/brown `#9B7740` (select applications only)
- Typography: condensed display + readable body serif + utilitarian UI sans, using actual licensed/system fonts at implementation.

## Interaction and data responsibility
Product pages must use storefront commerce product, variant, media, inventory and fulfillment authorities; no hardcoded dummy sizes/colors/quantities masquerading as products. Story pages use CMS page/section records. Media is R2-original + traceable derivatives. The shared ecommerce CMS app stays tenant-neutral. Brand-specific colors, logo references and copy belong to FNF theme configuration/CMS, never generic product code.

## Screenshot-derived first implementation order
1. Fix global lockup scale and mobile header readability.
2. Develop editorial homepage/stories section variants from existing CMS section primitives.
3. Convert product detail layout to visual hierarchy from reference; verify stock controls work, not just look attractive.
4. Audit product photos and logo rendition in the actual intended manufacturing/artwork pipeline.
5. Finalize favicon optical adaptation from approved original; test at 16/32/48px in a real browser tab.

## Demonstrable output
A standalone `FNF_Brand_Direction_Prototype_v1.zip` was produced in the originating design conversation: navigable homepage, Stories, product treatment and identity system, with desktop/mobile screenshots. The ZIP contains **clearly marked screenshot-derived review crops**, not reusable licensed catalog images or production art. It is a preview artifact, not a deployed page. The preview was checked for horizontal viewport overflow at desktop and 390px mobile.

## Remaining *real* gates
Only the source file legally controlling the badge, actual product/rights/vendor details and explicit public release approvals need confirmation before publication. They do not block us from making coherent design previews now.
