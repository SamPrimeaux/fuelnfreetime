# @inneranimalmedia/fnf-theme — remaster candidate

This package is a normalized harvest of the historical Fuel & Free Time site design.

## Boundaries

- `@inneranimalmedia/fnf-theme` owns **visual character**: tokens, surfaces, gradients, section presets, motion presets, and FNF page compositions.
- Generic renderers/contracts should live in a reusable section/theme library instead of being duplicated here.
- `fuelnfreetime` remains the **customer/site implementation**. Site-specific URLs, current logo delivery, current GLB URLs, collection IDs, newsletter actions, and other deployment data live under `src/sites/`, not in renderer source.
- Header and footer are **global shell components**. Pages are compositions of sections/blocks/groups; pages are not monolithic `index.html` files.

## Layout contract

Mobile first. Default outer ceiling is 1440px, with 1320px wide, 1200px content, and 760px reading widths. Gutters are fluid. Full-bleed backgrounds are distinct from full-bleed media/content. Touch targets are >=44px; form text is >=16px on compact screens; safe-area and reduced-motion behavior are expected.

## Home composition extracted from the donor

1. `scene-hero` — remastered GLB-aware hero; model URL comes from site config.
2. `manifesto-split`
3. `collection-list` (`grid` presentation)
4. `feature-card-grid` (`values` preset)
5. `feature-card-grid` (`community` preset)
6. `countdown-banner` — standalone reusable launch/drop timer; target date is data, never source code.
7. `newsletter-cta`
8. Global `site-header` / `site-footer`

See `src/templates/home.json`.

## Asset rule

Renderers refer to logical asset keys such as `brand.logo` and `home.hero.model`. A site resolver/config maps those keys to Cloudflare Images, R2/custom-domain URLs, or another provider. This prevents future asset replacements from requiring a 1,500-line source hunt.
