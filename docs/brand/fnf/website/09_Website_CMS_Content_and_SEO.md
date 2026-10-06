# 09 — Website Blueprint, CMS Content Model & SEO

**Status:** Suggested improvement plan for an active, unfinished site.  
**Sites:** https://fuelnfreetime.com/ · https://fuelnfreetime.com/shop · https://fuelnfreetime.com/about · https://fuelnfreetime.com/community  
**Related:** `01_Brand_Foundation_and_Positioning.md`, `04_Collections_and_Real_Products.md`

## What the site must do in five seconds

A stranger should be able to say: **"Fuel N Free Time is an apparel/lifestyle brand for people who value the time they spend doing what they love."** Then they should see real merchandise, understand the collections and trust that they can buy something and receive exactly what they saw.

A website can be cinematic without hiding basic shop functions. Brand story belongs near accurate merchandise, not ahead of every buyer action.

## Home: proposed section sequence

### 1. Hero — own the proposition

**Headline candidate:** THE BEST HOURS AREN'T ON THE CLOCK.  
**Subhead:** Gear and stories for the people who make their time count. From the garage to the lake and wherever the weekend goes.  
**Visual:** Real merch + true lifestyle scene; muted loop only if performance/accessibility is controlled.  
**Buttons:** Shop the Gear · Our Story.

### 2. Proof that the merch exists

Show 3–4 verified products with authentic photos, real stock/variants and recognizable badges. Prioritize trust over mockup quantity. On product pages, show front/back/detail and real fit/care.

### 3. Find your fuel

Collection cards for **Essentials**, **High Octane**, **Masters**, and eventually proposed **Flightline**. Only create a public shopping collection if it leads to valid inventory; otherwise, use an editorial concept panel clearly labeled.

### 4. The hours we live for

Three editorial panels: real garage project, first product batch, ordinary weekend story. Feature the bike as a documentary project *after the applicable permissions are obtained.*

### 5. A human brand statement

One 70–120-word founder-approved About excerpt. Resist huge invented origin narratives.

### 6. The community starts here

Invitation to submit a story or subscribe. Use authentic contributions; no made-up membership metrics, fabricated testimonials, or fictional events.

### 7. Newsletter + footer

A concise email invitation promising *specific* kinds of updates. Footer with Shop, About, Community, Contact/Support, Shipping/Returns, Privacy, Terms, social accounts; consistent on every page.

## About: suggested reusable section sequence

1. Intro/hero: one line + real founder/garage image.
2. Condensed manifesto: 2–4 honest paragraphs; see `02`.
3. Three expressions: **Earn It / Fuel It / Live It**, preferably paired with true photo stories.
4. The FNF marks: brief badge/hourglass meaning, only what is actually approved.
5. Real founder story: Justin's own words with verified people/places, not invented scenes.
6. Current focus: early product batches, site launch and the community being built.
7. Invitation: Shop, submit your story, subscribe.

**Previous planning flagged** a highly specific origin-story scene and manufacturing statements on the About page requiring Justin's factual confirmation. Do not preserve these just because they are already live.

## Shop: proposed sections

- Collection navigation / filtering (accessible mobile-first controls).
- Featured real-stock merchandise; meaningful photos, pricing and shipping facts.
- Curated collection introductions; not developer-facing descriptions of internal inventory contracts.
- New/real drop feature if actual stock is ready.
- Editorial callout to the hourglass/F&FT identity, without blocking shopping.
- Optional concept-gallery link outside the main purchase catalog.
- Clear contact/returns/shipping links; functional checkout smoke test.

## Community: proposed sections

- Community intro with genuine point of view.
- Real project stories, maker spotlights or customer features with permission.
- Submission form / inbox or signup, with consent statement.
- Upcoming events only when real; archive past events only with evidence.
- Beginner-friendly invitation: "No special build required. If you've got something you love doing, we'd like to hear about it."

**Previous discussion flagged** unverified community metrics and dated event/testimonial copy. Treat these as audit items to verify against the current live page before keeping them.

## Example on-site copy (working drafts)

**Hero:** *The best hours aren't on the clock.*  
"The stuff we do when the day's ours. Apparel and stories for the projects, people and places that keep us going."

**Essentials collection:** *Good gear for the good hours.*  
"Everyday tees, hats and the F&FT badge—built around a simple idea: make your time count."

**High Octane:** *There are worse ways to spend a Saturday.*  
"For the garage nights, the unfinished projects and the friends who know exactly why you're still out there."

**Masters:** *Some stories take years to earn.*  
"The people, skill and experience behind the things we love."

**Community:** *Different rides. Same reason we show up.*  
"We're putting the first stories together. Got a project, a favorite hobby or a good weekend worth sharing?"

## Search visibility priorities

**1. Clean brand identity:** Stable brand spelling, consistent metadata, about text, logo alt text, social profiles.  
**2. Crawlable pages:** Real title/H1/intro and merchandise in initial HTML when feasible, not only JavaScript loading states. Verify with search tools rather than assuming rendered content is indexed.  
**3. Specific product data:** Unique descriptions, descriptive image filenames/alt text, price/availability/variant metadata, applicable `Product` structured data. Never invent review ratings.  
**4. Collection introductions:** Why a collection exists, whose interests it speaks to, which *real products* it contains.  
**5. Editorial:** Original founder stories, product production notes, creator-authorized articles, genuine photos; don't churn out empty SEO pages.  
**6. Navigation and health:** Working footer, policies, canonical URLs, valid sitemap, mobile responsive images, accessible labels, fast pages and QA.

### Suggested page metadata seeds (not keyword research conclusions)

| Page | Title direction | Description direction |
|---|---|---|
| Home | Fuel N Free Time — Gear for the Good Hours | Apparel and stories for the time you make your own |
| Shop | Shop FNF Apparel & Accessories | Real shirts, hats and accessories from FNF, with current selections |
| About | Our Story — Fuel N Free Time | Why we make gear around the things you love doing |
| Community | FNF Stories & Community | Real people, projects, products and shared passions |
| High Octane | High Octane — Fuel N Free Time | Garage and motorsports-inspired FNF gear |

Choose actual product-specific language and research keywords only after verifying the assortment and demand; these are writing direction, not volume or ranking promises.

## Editorial/CMS: avoid a fourth incompatible editor

The existing site and AgentSam CMS work have suffered from duplicated page builders and HTML-first sections. The long-term model should separate:

- **Content types / definitions** (e.g., Product Story, Maker Profile, Design Concept, Campaign)
- **Entries** (actual concrete content independent of page layout)
- **Resource fields** (product's material, fit, images, inventory, collection links)
- **Templates** (Home, collection, product, standard editorial)
- **Reusable sections** (hero, video/story, product strip, quote, project timeline, newsletter)
- **Themes** (design tokens, typography, spacing, colors)
- **Media** (owner/site, rights, files, renditions, alt text, usage and source)

The CMS should let Sam change and reorder sections, while Justin changes the content and approves artwork without manually patching raw HTML. Product truth is managed by the product/resource record, and a design concept stays distinct from stock.

### Example relationships

```text
Brand:FNF
 ├── IdentityAsset:F&FT Heritage Shield
 ├── Collection:Essentials ── Product:Hourglass Tee ── Media:[front,back,detail]
 ├── Collection:High Octane ── Product:[only real SKUs]
 ├── ConceptSeries:Flightline ── DesignConcept:Smoke Show
 └── StoryProject:Dirt Bike ── Episodes:[pickup,wrap,reveal]
                               └── Collaborator:[permissions required]
Campaign:Official Launch ── references Products + Stories + approved Brand content
```

## Launch QA checklist

- [ ] All public facts and founder story checked by Justin.
- [ ] No fictional community statistics, events or reviews.
- [ ] Real stock and checkout operational and tested.
- [ ] Collection navigation works with no orphan/blank products.
- [ ] Every product image is real-product accurate or explicitly labeled concept.
- [ ] Mobile editing/website layouts usable on narrow and wide screens.
- [ ] Image alt text, page titles, OG previews, sitemap and product schema checked.
- [ ] Policies, contact, fulfillment/support and global footer visible.
- [ ] Project and creator content has rights/consent before publication.
