# @inneranimalmedia/fnf-theme

FNF is a dark, industrial streetwear theme: tokens, layout contract, section presets, a global shell, and a home page template. It ships with a neutral demo site so you can run it as-is, then swap in your own brand.

## What's inside

- `tokens.css`, `layout.css`, `theme.json`: color, type, spacing, motion, and the layout contract
- `sections/*`: `scene-hero` (3D model aware), `countdown-banner`, `manifesto-split`, `collection-list`, `feature-card-grid` (values, community), `newsletter-cta`
- `shell/*`: global site header and footer
- `templates/home`: the home page as a composition of sections
- `sites/demo`: a stock site config (no real brand, no URLs)

## Make it yours

Sections never contain URLs. They refer to logical asset keys such as `brand.logo` and `home.hero.model`; a site config maps those keys to your real files. Copy `sites/demo.json` into your own project, fill it in, and keep it there. Do not edit the package.

## Layout contract

Mobile first. Outer ceiling 1440px (1320 wide, 1200 content, 760 reading). Fluid gutters. Touch targets are 44px or larger, form text is 16px or larger on compact screens, and safe-area and reduced-motion behavior are expected.

## Boundaries

This package owns visual character only. Generic renderers belong in a reusable section library. Customer data (real logos, model URLs, copy, navigation, store IDs) belongs in the customer's own repository.
