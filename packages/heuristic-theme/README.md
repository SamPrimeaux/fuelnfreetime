# Heuristic

Heuristic is the reusable ecommerce theme engine. Fuel & Free Time is its first offered stock preset and the only brand preset owned by this repository.

The package contract is compositional:

- a preset owns scoped tokens, an asset namespace, global shell settings, and page manifests;
- a page is an ordered list of section instances;
- a section is an ordered list of block instances plus appearance, motion, responsive, and visibility settings;
- commerce data is referenced through bindings and is never duplicated into theme content.

`theme.json` points to `presets/fuel-free-time/preset.json`; it does not point to an HTML page. HTML files under `storefront/` are runtime hosts and renderers, not page-definition authority. The compiled asset build publishes the theme contracts and preset manifests under `/theme/`.

There are no cross-brand presets, assets, tokens, or silent content fallbacks in this package. A missing required preset, page, section, block, shell, or API contract is an explicit error.
