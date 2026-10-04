---
project: fuelnfreetime
kind: site-operating-brief
status: working
date: 2026-10-01
audit_baseline_branch: main
audit_baseline_revision: 96fdacdfbd3e6f00b707e48c106c35793ae4eafb
---

# Fuel & Free Time site operating brief

## 0. Purpose

This document converts the existing Fuel & Free Time brand, storefront, CMS, commerce runtime, admin console, media system, and productization work into one launch-oriented operating view.

It does not replace the canonical brand dossier, storefront contract, runtime contracts, or pipeline ownership map.

## 1. Current run mode

LAUNCH-POLISH + PREBUILD EXTRACTION

The client goal is to launch a coherent, trustworthy, operable Fuel & Free Time experience.

The productization goal is secondary: extract the strongest proven patterns into portable packages and presets after the client paths are real.

Do not allow generic-platform work to block product creation, product publishing, cart/checkout, fulfillment visibility, public-page completeness, CMS correctness, media operations, policies/trust, search/social metadata, or mobile quality.

## 2. Audit baseline

Observed locally on 2026-10-01:

- repo: SamPrimeaux/fuelnfreetime
- branch: main
- revision before these operating docs: 96fdacdfbd3e6f00b707e48c106c35793ae4eafb
- AgentSam CLI: 2.6.7
- agentsam machine inspect: 877 files / 16,952,913 bytes
- agentsam repo snapshot: 872 files, 836 source files, about 212k lines
- change pressure is concentrated in apps/ecommerce-cms-agentsam, especially frontend/static and backend
- the latest observed local codebase index is from commit 78c681ec, older than this audit baseline, so it must be refreshed before being treated as current-source proof

## 3. Confirmed brand foundation

Source: docs/brand/business-brand-dossier.md.

### Brand in plain English

CONFIRMED

Fuel & Free Time is a lifestyle brand for people who work hard and make their free time count.

It connects cars, trucks, motorcycles, boats, fishing, travel, events, garage time, and the people those interests bring together.

The canonical dossier's one idea to remember is:

Work hard. Make time. Use it well.

### Meaning

CONFIRMED

Fuel can be literal — gas, diesel, race fuel, engines, boats, bikes, trucks, aircraft — and also ambition, coffee, family, friendship, or whatever keeps someone moving.

Free time is the part of life that belongs to the person: weekends, retirement, a ride after work, a morning on the water, a road trip, a garage night, or time with people who matter.

### Audience

CONFIRMED

The dossier explicitly includes blue-collar workers, gearheads, riders, boat people, fishermen, veterans, retirees, weekend warriors, builders, travelers, and people who take pride in what they own and what they do.

They are connected by valuing time and earned enjoyment, not by owning the same machine or having the same budget.

### Emotional target

CONFIRMED

Freedom, pride, motivation, adventure, belonging, nostalgia, humor, and realness.

It should feel premium enough to be proud of, grounded enough to stay blue-collar, and welcoming enough not to become a private club for expensive toys.

### Long-term direction

ASPIRATIONAL

The dossier allows Fuel & Free Time to grow into a lifestyle company combining apparel, content, collaborations, events, stories, builds, road trips, boats, motorcycles, aircraft, interesting people, and real experiences.

Do not present those aspirations as current scale or current community proof.

## 4. Current site outcome contract

### Primary public-site job

Turn the brand belief into a coherent path:

understand the idea → see the lifestyle → discover a product/collection → trust the business → buy or join → have a reason to return

### 5–10 second target

A first-time visitor should understand:

Fuel & Free Time is about the time you earn to enjoy the machines, hobbies, places, and people that make life worth working for.

### 2–3 minute target

Visitors should understand what Fuel means, what Free Time means, who the brand is for, what is currently for sale, why collections exist, whether the company feels real, how to buy, and how to stay connected.

### Primary conversions

1. Product discovery and purchase.
2. Email/community signup.
3. Meaningful brand-story engagement.
4. Collaboration inquiry when relevant.

### Never

The experience should not feel like a generic print-on-demand catalog, fake luxury/status theater, fabricated community scale, expired event theater, an AI-generated mood board with no real business behind it, or a public site whose admin cannot actually maintain it.

## 5. Existing source architecture

docs/STOREFRONT-CONTRACTS.md already establishes the right separation:

- packages/heuristic-theme owns presentation, page compositions, semantic tokens, preset assets, section markup, and browser behavior.
- store backend owns public catalog reads, checkout validation, inventory/order transitions.
- CMS backend owns editable section content and hydration.
- D1 commerce tables own product/variant/collection/order truth.
- provider packages own provider synchronization and fulfillment integration.

Preserve that boundary.

The existing storefront contract also points the next CMS/editor sprint toward versioned section schemas instead of more hard-coded forms. That direction aligns with this operating brief.

## 6. Public surface architecture

### Home /

Job: establish the belief and route visitors into Shop, Story, and Community.

KEEP:
- current cinematic hero direction,
- the current time/horsepower campaign direction where approved,
- warm garage/road visual language,
- clear action color.

REFINE:
- the rest of the page must reach the same quality as the hero,
- Home and Shop must have distinct jobs.

### Shop /shop

Job: turn brand interest into product/collection discovery.

KEEP:
- strong header direction,
- collection framing,
- High Octane / Masters / Essentials family,
- lifestyle-to-product bridge.

REFINE:
- loading/empty/error product states,
- collection routing,
- product card semantics,
- option selection,
- merchandising controls,
- mobile behavior.

### About /about

Current classification: REBUILD AS SECTIONS.

Current source: packages/heuristic-theme/storefront/about.html.

The current page contains useful concepts such as hero, The Moment Everything Changed, video, collection cards, What We Stand Against, Lafayette, and full-story sections.

Target: convert useful ideas into versioned, reorderable, CMS-editable sections with portable schemas.

Do not freeze the old page as the new contract.

### Community /community

Current classification: REBUILD AROUND REAL CONTENT.

Current static source contains hard-coded values 5K+, 23, 150+, March/April 2025 events, Garage Night LA, and Miami Scavenger Hunt.

Those are implementation facts, not verified business facts.

Target modules:
1. community/lifestyle thesis,
2. real stories/gallery,
3. upcoming real events,
4. past event recaps,
5. customer/community submissions,
6. collaborator/partner spotlights,
7. email/community CTA.

If there are no live events, the empty state should say so honestly.

### Collaborate /collaborate

Job: qualify and capture real collaboration opportunities.

Possible audiences include creators, local businesses, builders/shops, event partners, brands, and interesting people/projects.

Required:
- who is a fit,
- collaboration types,
- examples when real,
- inquiry form,
- what happens after submission,
- media/usage consent where relevant.

### Policies /policies and Terms /terms

Job: trust and operational clarity.

Verify business identity, public support contact, shipping expectations, returns/refunds, privacy, terms, and effective/update dates.

### Cart /cart

Job: turn a selected product into a trustworthy payment attempt.

Must prove quantity changes, remove, discount, shipping threshold, email validation, payment start, failure recovery, successful confirmation, correct cart clearing, and mobile behavior.

## 7. Reusable visual/system patterns worth extracting

### Header preset family

Two useful directions are already visible:

Preset A — dark cinematic overlay for immersive storytelling.

Preset B — frosted/light floating pill for Shop/editorial surfaces.

These should become variants of one portable header contract, not separate page-specific inventions.

Config should include variant, logo treatment, foreground mode, background/blur, active-link treatment, cart state, sticky behavior, breakpoints, and optional announcement content.

### Section families

High-value candidates:
- hero,
- split media/story,
- collection cards,
- manifesto/value statement,
- image/video story block,
- CTA band,
- gallery,
- event list,
- newsletter signup,
- product grid,
- founder/origin section,
- trust/policy block.

### Media operations

packages/media-kit and recent Content work already establish a strong portable direction:

- originals are source identities,
- derivatives/delivery versions are separate,
- albums/galleries/campaigns/product collections are organizational contracts rather than storage folders,
- paid image transforms are optional rather than assumed.

Preserve that architecture.

## 8. Admin/operator outcome

A polished public site is insufficient if the client cannot operate it.

The admin must support:

create → organize → publish → sell → fulfill → communicate → measure → update

Minimum launch-operable domains:
- Home/dashboard
- Orders
- Products
- Inventory
- Customers/subscribers
- Discounts
- Content/media
- Store/pages/theme
- Preferences
- Analytics sufficient to trust key signals
- AgentSam helper surface only where it operates on canonical contracts

Growth, email, markets, and POS can mature after the launch floor is real.

## 9. Reusable admin core vs client-specific layer

Reusable core candidates:
- admin shell/sidebar/top bar,
- cards, forms, tables,
- product-studio workflow primitives,
- content/media library,
- albums/galleries,
- selected-asset inspector,
- Details / Optimize / SEO / Usage / Versions model,
- page editor,
- theme editor,
- header/footer preset system,
- analytics shells/cards,
- campaign draft UI,
- email shell,
- AgentSam composer/panel contract,
- loading/empty/error states.

F&FT-specific:
- copy,
- brand artwork,
- collection meanings,
- actual products,
- provider mappings used by this client,
- business policies,
- campaigns,
- stories,
- events,
- Louisiana-specific content,
- customer/subscriber/order data.

A portable package must not hardcode the second list.

## 10. Marketing/content pillars

PROPOSED editorial categories, not claims that all activities already exist:

1. Earned Time — work, service, retirement, weekends, owning your hours.
2. Machines & Rituals — garage nights, road, water, rides, builds, coffee, maintenance, early launches.
3. People & Stories — customers, owners, makers, collaborators, interesting locals, veterans/retirees where authentic.
4. Drops & Experiences — products, collaborations, real meetups, trips, builds, behind-the-scenes creation.

The site should give the brand a reason to be followed between purchases.

## 11. Search/content contract

Every public page needs explicit URL/canonical, title, meta description, H1, social title, social description, social image, indexability state, internal links, alt text, and structured-data opportunity where truthful.

Product pages additionally need product structured data, price/availability consistency, canonical behavior, real imagery, and collection context.

Do not publish event structured data for fictional/demo events.

## 12. Launch lanes

A. Release blockers — correctness or trust failures.

B. Page polish — public visual/content/interaction work.

C. Conversion — product → cart → payment → confirmation → fulfillment.

D. Content + SEO — media, metadata, search/social presentation, internal linking.

E. Admin + operations — anything the client must use immediately after launch.

F. Reusable extraction — only after the client path proves the pattern.

## 13. Definition of done for the current milestone

Fuel & Free Time is not launch-ready merely because the Worker deploys.

The milestone is done when:
- every primary public route has a clear job,
- no public placeholder/fabricated community proof remains,
- About and Community are maintainable section systems rather than frozen giant HTML,
- product can be created, published, found, carted, paid for, and fulfilled,
- payment failure and success paths are tested,
- policies/contact/business identity are coherent,
- page/search/social metadata is maintainable,
- media can be selected from existing library content instead of repeatedly rediscovered/reuploaded,
- client admin can operate products, content, orders, inventory, discounts, pages, and store settings,
- P0/P1 issues have evidence of closure,
- portable extraction does not contain customer-specific business logic.
