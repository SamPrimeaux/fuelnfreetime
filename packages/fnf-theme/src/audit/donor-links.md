# Donor link inventory

Every discovered external URL from the old index should be either resolved by site config, a content/catalog adapter, or an intentional runtime dependency.

- **font** — `https://fonts.googleapis.com` — external dependency; keep only through typography loader policy
- **font** — `https://fonts.gstatic.com` — external dependency
- **font-css** — `https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap` — source typography evidence
- **runtime** — `https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js` — remove hardcoded CDN runtime; host/runtime adapter should supply model-viewer
- **model** — `https://cdn.shopify.com/3d/models/a86e19579a1c90eb/Emblem_of_Elegance_0822010524_texture.glb` — REPLACE; current FNF site config points to R2/custom-domain GLB
- **image** — `https://cdn.shopify.com/s/files/1/0666/4060/9411/files/fandft-clear-background.png?v=1755572638` — REPLACE in actual FNF site config with Cloudflare Images logo
- **image** — `https://cdn.shopify.com/s/files/1/0666/4060/9411/files/50C9CEB5-3EA4-4A67-9CB3-9D25FFDA72BF.png?v=1756307782` — legacy donor asset; migrate/resolve via site asset registry
- **image** — `https://cdn.shopify.com/s/files/1/0666/4060/9411/files/high_octane.jpg?v=1756307558` — legacy donor collection asset; resolve from catalog/media registry
- **image** — `https://cdn.shopify.com/s/files/1/0666/4060/9411/files/Masters.png?v=1756307485` — legacy donor collection asset; resolve from catalog/media registry
- **image** — `https://cdn.shopify.com/s/files/1/0666/4060/9411/files/Gone_Fishing.png?v=1756307634` — legacy donor collection asset; resolve from catalog/media registry
- **route** — `https://fuelnfreetime.com/collections/high-octane-performance-gear` — convert to collection route/data binding
- **route** — `https://fuelnfreetime.com/collections/masters` — convert to collection route/data binding
- **route** — `https://fuelnfreetime.com/collections/essentials` — convert to collection route/data binding
- **route** — `https://fuelnfreetime.com/pages/shop` — normalize to site route config
- **route** — `https://fuelnfreetime.com/pages/community` — normalize to site route config
- **route** — `https://fuelnfreetime.com/pages/collab` — normalize to site route config
- **route** — `https://fuelnfreetime.com/pages/contact` — normalize to site route config
- **route** — `https://fuelnfreetime.com/pages/data-sharing-opt-out` — normalize to site route config
