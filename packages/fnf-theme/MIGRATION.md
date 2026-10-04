# Home index remaster decisions

## Hard-coded asset removals

### GLB
Legacy:
`https://cdn.shopify.com/3d/models/a86e19579a1c90eb/Emblem_of_Elegance_0822010524_texture.glb`

Actual Fuel & Free Time site config:
`https://assets.fuelnfreetime.com/3d-models/emblem-of-elegance.glb`

The section itself references `home.hero.model`; it does not know the URL.

### Logo
Legacy markup referenced Shopify CDN.

Actual Fuel & Free Time site config currently resolves the provided Cloudflare Images record:
- image id: `ad23b2d9-e2e4-4ad6-eb81-9e4c983df000`
- provided delivery variant: `thumbnail`
- delivery URL is stored only in `src/sites/fuelnfreetime.json`

Create/use a dedicated logo delivery variant when available rather than scattering `thumbnail` through markup.

## Countdown
Legacy code hard-coded `November 3, 2025 00:00:00`.
The remastered `countdown-banner` takes an ISO-8601 `targetAt` value and an expired-state message. Date changes are content/config updates, not code edits.

## CMS/page model
Header/footer are global components.
Home is a page-template composition referencing reusable sections.
Section data, theme values, navigation, assets, and routes are editable independently.
No customer should need to understand build/compile machinery to update a logo, timer, section copy, collection, or color token.
