# Heuristic

The current Fuel & Free Time storefront, extracted without a redesign. This package owns its HTML, styles, header/drawer, footer, catalog presentation and browser behavior. The commerce application supplies the API and CMS adapter. Root `public/` contains only supplementary public assets; deployment output is `dist/assets`.

Install a locally packed tarball and copy `storefront/` into the host's asset build. Provide the endpoints in `theme.json`. The Fuel & Free Time build consumes this source directly. This package has not been published to npm.

This first extraction retains Fuel & Free Time branding and media references. Replace those in a consumer before launch; it is not yet a brand-neutral visual editor theme. Source repository ownership remains Fuel & Free Time until the canonical files actually move elsewhere.
