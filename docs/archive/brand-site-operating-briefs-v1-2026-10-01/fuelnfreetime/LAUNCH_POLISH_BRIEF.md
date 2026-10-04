# Fuel & Free Time — Launch-Polish Operating Brief v1

## 0. Run mode

**LAUNCH-POLISH + PREBUILD EXTRACTION**

Fuel & Free Time is an actual client launch. The public storefront and admin should be finished for the
client first. Reusable patterns should be extracted deliberately, but the launch must not be blocked by
trying to turn every unfinished admin concept into a universal platform.

## 1. Outcome contract

### Brand in one sentence — PROPOSED, client approval required
**Fuel & Free Time is a Louisiana-rooted lifestyle brand for people who work hard enough to understand
that the hours they finally get to call their own are worth more than horsepower.**

### Core current message — CONFIRMED
**TIME IS THE REAL HORSEPOWER.**

### Primary site job
Build belief in the lifestyle, sell a focused product line, and give the audience reasons to return
through stories, drops, collaborations, and real community activity.

### Primary actions
1. Shop current products/drop.
2. Explore collections.
3. Join email/community.
4. Learn the brand story.
5. Collaborate when relevant.

### 5–10 second target
A first-time visitor should understand that this is not generic racing merch. It is about **earned time**
and the machines, places, hobbies, and people someone finally has time to enjoy.

### Emotional target
Earned, warm, independent, cinematic, lived-in, premium without fake luxury.

### Never
Generic POD catalog; macho-for-macho's-sake; fabricated community proof; stale event theater;
AI-looking filler; brand story buried behind products.

## 2. Current strengths

### Public storefront
- Strong cinematic hero direction.
- Condensed headline typography supports the brand.
- The garage/motorcycle imagery makes the lifestyle immediately legible.
- The orange CTA is clear against the dark photography.
- Shop already has a useful three-collection structure.
- Cart has a coherent dark treatment and a visible shipping-progress affordance.

### Admin
Strong reusable foundations are visible in:
- left-navigation shell,
- product creation/catalog surface,
- content/media library,
- side inspector,
- theme editor structure,
- page metadata editor,
- growth/analytics card language,
- online-store management shell.

The admin is worth continuing as a **prebuild proving ground**, but reusable shell/components must be
separated from F&FT-specific business content.

## 3. Immediate public-site audit

### Home — KEEP + REFINE
Current hero direction is strong.

**Repair goals**
- Make the rest of the homepage carry the same level of polish as the hero.
- Ensure the homepage is not simply duplicated again at `/shop`.
- Give the visitor a clear route into brand story, product, and community.
- Replace any stale launch/countdown material that search engines may still expose.

### Shop — KEEP + REFINE
Current live structure already includes:
- collection story,
- High Octane / Masters / Essentials,
- current-drop/product area,
- lifestyle/story bridge.

**Repair goals**
- Keep the shop header style as a reusable header preset.
- Make product loading resilient with real loading/error/empty states.
- Ensure collection cards and filters route to real product states.
- Make product details and quick-add/choose-options paths fully testable.

### About — REMASTER
Do not preserve a giant old HTML page as the editing model.

Convert it into reusable sections:
1. Brand thesis / hero.
2. What “Fuel” means.
3. What “Free Time” means.
4. Founder/origin story.
5. Earned-hours philosophy.
6. Lifestyle/story media.
7. Community proof when real.
8. Shop/community CTA.

Each section should be reorderable, editable, responsive, and reusable in other theme presets.

### Community — REBUILD AROUND REAL CONTENT
The current screenshots expose the biggest trust problem:
- large skeleton/placeholder gallery blocks,
- event cards with 2025 dates,
- “5K+ / 23 / 150+ / ∞” style community statistics that should not appear unless they are real and sourced.

**Target structure**
1. Community manifesto.
2. Real stories/gallery.
3. Upcoming real events.
4. Past-event recap/gallery.
5. “What fuels your free time?” submission.
6. Collaborator/partner spotlight.
7. Newsletter/community CTA.

If there are no events yet, show an honest launch state:
**“Events are being planned — join the list for the first announcement.”**
Do not manufacture activity.

### Collaborate — BUILD AS A REAL FUNNEL
Audience options may include creators, local businesses, builders, shops, event partners, and brands.

Required:
- what collaboration means,
- who is a fit,
- example collaboration types,
- submission form,
- expectations/response path,
- consent for submitted media where needed.

### Terms / Policies
Treat these as operational trust surfaces, not footer filler.
Verify business identity, shipping, returns/refunds, privacy, terms, contact route, and effective dates.

### Cart
The visual base is coherent.

Required end-to-end tests:
- quantity updates,
- remove,
- discount,
- shipping threshold,
- email validation,
- payment start,
- failed payment,
- successful payment,
- cart clearing only after confirmed payment,
- confirmation/receipt,
- mobile.

## 4. Header system — reusable extraction

The screenshots show two directions worth preserving:

### Preset A — Dark overlay
For cinematic home/community storytelling.

### Preset B — Frosted/light pill
For shop/editorial surfaces where the navigation should float above imagery.

Do not maintain these as unrelated page-specific implementations.

Package one header contract with configurable:
- variant,
- logo treatment,
- background/blur,
- active link style,
- cart state,
- sticky behavior,
- breakpoint behavior,
- light/dark foreground,
- optional announcement bar.

## 5. Visual system

### Direction
Cinematic dark photography, warm garage light, fire-orange action color, restrained teal utility/accent,
off-white editorial sections, strong condensed display type, plain readable body type.

### Image worlds
Garage nights, early launches, road trips, boats/water, motorcycles/cars/trucks, craftsmanship,
coffee/dawn, friends/family, people using the products in real contexts.

### Guardrail
Real people and real moments should increasingly replace generated-looking or generic lifestyle filler
as launch content becomes available.

## 6. Content pillars — PROPOSED

1. **Earned Time**
   Work, service, retirement, weekends, finally owning your hours.

2. **Machines & Rituals**
   Garage, road, water, rides, builds, coffee, maintenance, launch mornings.

3. **People & Stories**
   Owners, customers, collaborators, veterans/retirees where authentic, makers and interesting locals.

4. **Drops & Experiences**
   Product releases, collaborations, meetups, scavenger-style experiences, behind-the-scenes creation.

These are editorial pillars, not promises that every listed activity already exists.

## 7. Search / SEO

### Immediate issue
Search/indexed copies can retain old launch-era content long after the visible page has changed.

### Required launch package
For every public page:
- dedicated title,
- meta description,
- canonical,
- social title/description/image,
- correct H1,
- crawl/index state,
- internal links,
- image alt text.

For products:
- product structured data,
- price/availability consistency,
- canonical handling,
- real product imagery,
- collection links.

For future real events:
- event structured data only for genuine published events.

### Important
The admin search preview is a useful start, but page metadata needs an explicit contract instead of
being only implicitly derived from the first text block.

## 8. Admin: reusable core vs client-specific logic

### REUSABLE CORE — extract/package
- Admin shell / sidebar / top command bar
- Cards/tables/forms
- Media browser
- Albums/galleries
- Asset detail inspector
- Details / Optimize / SEO / Usage / Versions model
- Page editor contract
- Theme editor contract
- Header/footer presets
- Analytics card primitives
- Campaign draft UI
- Discount form patterns
- Email shell/mailbox UI
- AgentSam panel/composer contract
- Empty/loading/error state library

### F&FT-SPECIFIC
- Brand copy and artwork
- Product/catalog selections
- Completeful/fulfillment-specific mappings
- F&FT collections
- Shipping/return policy content
- campaigns/events/stories
- Louisiana identity/content
- customer/subscriber data

### OPTIONAL MODULES — PARK UNTIL USE CASE EXISTS
**Markets**
Pursue only when there is a real need for region/currency/catalog/channel segmentation.

**POS**
Pursue when F&FT is actually selling at meetups/pop-ups/events and needs in-person checkout/inventory.

Do not keep empty modules in the primary navigation just to imitate Shopify.

## 9. Admin audit ledger

### P1 — `/admin/store`
**Observed:** performance cards render `[object Object]` for LCP/INP/CLS/device data.
**Outcome:** typed metrics render human values or an honest unavailable state.
**Acceptance:** no serialized object strings can render in production UI.

### P1 — `/admin/theme-editor?slug=...`
**Observed/project report:** switching pages does not reliably update the slug/edit target.
**Outcome:** selected page, URL, loaded document, preview, and save target stay in lockstep.
**Acceptance:** switch among at least 3 pages, edit each, refresh, and verify no cross-page write.

### P1 — `/admin/page-edit?slug=...`
**Observed:** good content/metadata structure, but media preview and visibility/state semantics need polish.
**Outcome:** page editor is the canonical content/metadata surface; theme editor owns visual composition;
both read/write the same underlying page contract.

### P1 — `/admin/preferences`
**Observed:** social sharing preview/image is not presenting cleanly in the supplied screenshot.
**Outcome:** validated public asset URL + reliable social preview + explicit save state.

### P1 — `/community`
**Observed:** placeholder/skeleton media and stale/demo event/community data.
**Outcome:** real-content states plus honest empty states.

### P2 — `/admin/growth`
**Observed:** attractive scaffold, but some metrics/copy appear semantically contradictory or incomplete.
**Outcome:** campaign creation, attribution, channel performance, and campaign status all map to real data.

### P2 — `/admin/content`
**Observed:** strongest recent scaffold.
**Keep:** folders, albums, drag/drop, reusable grouping, selected-asset inspector, versions/usage concept.
**Next:** multi-select actions, crop/aspect previews, publish destinations, optimization receipts,
attachment usage graph, SEO/alt metadata, duplicate handling.

### P2 — product creator
Keep the general workflow, but replace brand-specific assumptions with configurable product-provider
capabilities so the prebuild can support other apps/vendors later.

### P3 — analytics
The overview/finance/health UI can be a strong reusable analytics shell once every card has:
source, timestamp, coverage, empty state, error state, and a real drill-down.

### P3 — email
Promising future module for multi-user inbound/outbound operations.
Before expansion, define mailbox ownership, identity, threading, permissions, provider sync, attachments,
audit trail, templates, and automation boundaries.

## 10. Launch cockpit

### RELEASE BLOCKERS / P1
- Remove stale/fabricated community proof and dates.
- Fix `[object Object]` store metrics.
- Fix theme-editor selected-page/slug/save targeting.
- Verify page-editor/theme-editor contract is not split-brain.
- Fix social-sharing image/preview.
- Verify product → cart → payment → confirmation end to end.
- Verify public policies/terms/contact identity.
- Replace broken/placeholder public media states.
- Verify current homepage/search metadata and request recrawl where needed.

### PAGE POLISH / P1-P2
- Finish Home below the hero.
- Make Shop distinct from Home while retaining its strong header/visual direction.
- Remaster About into reusable sections.
- Rebuild Community around real story/gallery/event contracts.
- Build Collaborate as a real intake path.
- Unify footer and both header presets.

### CONTENT / SEO
- Page-level metadata.
- Social cards.
- Product titles/descriptions/alt text.
- Real photo/video shot list.
- Brand story copy approval.
- Internal linking.
- Search crawl/index review.

### ADMIN / OPS
- media library closeout,
- product publish flow,
- fulfillment/inventory validation,
- growth/campaign minimum viable workflow,
- discount flow,
- analytics data wiring,
- email scope decision,
- park Markets/POS until use cases are confirmed.

## 11. Definition of done for the client launch milestone

- Every public nav destination is intentional and complete enough to show a customer.
- No fabricated stats, stale demo events, blank skeleton galleries, or placeholder claims remain.
- Product can be created, merchandised, published, found, carted, paid for, and fulfilled.
- Cart/checkout failure and success states are tested.
- Brand story is coherent across Home, Shop, About, Community, and social/search metadata.
- Header/footer and major section patterns are reusable theme components.
- About and Community are CMS-controlled sections, not giant one-off HTML blobs.
- Admin can manage products, content/media, orders, inventory, discounts, page content, and store settings.
- Known P1 admin bugs are closed with proof.
- Optional Markets/POS/email ambitions do not block launch.
- Reusable prebuild components are identified without baking F&FT-specific business logic into them.
