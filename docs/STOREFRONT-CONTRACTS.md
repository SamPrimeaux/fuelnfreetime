# Heuristic storefront contracts

This document separates reusable theme presentation from commerce authority so the storefront can be installed for another brand without copying Fuel & Free Time behavior into backend code.

## Ownership

| Boundary | Owns | Must not own |
| --- | --- | --- |
| `packages/heuristic-theme` | Page compositions, semantic CSS tokens, preset assets, section markup, browser presentation | Provider credentials, inventory writes, order state, fulfillment behavior |
| `backend/store` | Public catalog reads, collection reads, checkout validation, inventory and order transitions | Brand-specific copy, layout, visual tokens |
| `backend/cms` | Editable section content and edge hydration | Product price, inventory, provider products |
| D1 commerce tables | Product, variant, collection, order, and mapping truth | Rendered HTML and CSS |
| Completeful provider package | Provider catalog and fulfillment synchronization | Storefront collection presentation |

## Route contract

| Route | Authority | Notes |
| --- | --- | --- |
| `GET /shop` | Heuristic shop composition + CMS content | Catalog cards hydrate from the Store API |
| `GET /shop/collections` | Heuristic collection index | Reads `GET /api/store/collections` |
| `GET /shop/collections/:slug` | Heuristic collection detail | Reads `GET /api/store/collections/:slug` |
| `GET /collections/:slug` | Compatibility redirect | Permanent redirect to the `/shop/collections/:slug` canonical URL |
| `GET /products/:slug` | Product detail composition | Reads product and live variants from Store API |
| `GET /cart` | Cart composition | Local cart is a draft; server revalidates every checkout line |

## Data contract

`products` and `product_variants` remain commerce truth. `store_collections` owns collection identity and presentation metadata. `store_collection_products` owns explicit membership and merchandising order. The legacy `products.collection` string remains a temporary compatibility input: collection reads synthesize the three stock presets when the migration has not been applied, but new writes should target the mapping table.

The collection API returns:

```json
{
  "ok": true,
  "collection": {
    "slug": "essentials",
    "title": "Essentials",
    "description": "...",
    "eyebrow": "Repeat wear",
    "image_url": "/media/...",
    "accent_color": "#22adae",
    "product_count": 2
  },
  "products": []
}
```

## Theme portability

`theme.json` is the installable manifest. A preset may supply brand tokens and replaceable media, but sections consume semantic variables from `heuristic-theme.css`; section CSS must not read FNF-specific variable names. Runtime URLs are declared in the manifest and no preset contains provider secrets. A new brand should be able to add a `data-theme-preset`, token mapping, and asset folder without forking collection, product, cart, or checkout logic.

## CMS direction

The existing editor can keep editing the current `hero`, `collections`, and `stories` content objects. The next editor sprint should derive controls from a versioned section schema rather than grow another hard-coded form. Layout, motion, visibility, repeaters, and commerce bindings belong to the section schema; price and inventory remain read-only commerce bindings.
