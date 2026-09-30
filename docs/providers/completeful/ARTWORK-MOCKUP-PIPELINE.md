# Completeful artwork → design → mockup pipeline

**Status:** design/implementation contract for Fuel & Free Time  
**Last reviewed:** 2026-09-30  
**Related:** `../../RUNTIME-CONTRACTS-COMPLETEFUL.md`, `openapi.json`

## Goal

Fuel & Free Time should be able to start from an idea, logo, illustration, photograph, or generated concept and reliably turn it into:

1. a preserved source/master asset,
2. a product-specific print/engraving rendition,
3. a Completeful design,
4. one or more catalog mockup renders,
5. an approved merchandising asset set, and
6. a provider-linked product ready for later publication/fulfillment.

Do **not** treat one uploaded logo file as universally production-ready. Apparel, drinkware, wrap products, photo products, and metal/engraving-capable products can have different print geometry and production constraints.

The product + print location must determine the final artwork contract.

---

## Provider capabilities we can build around

The pinned Partner API exposes the pieces needed for an automated pipeline.

### 1. Discover the product and its production geometry

Use catalog product detail, including all related resources:

```http
GET /v1/catalog/products/by-sku/{sku}?include=variants,print_locations,images,mockups,shipping
```

Relevant provider fields include:

- product `print_type`
- variants and variant attributes
- print-location `id`
- `x`, `y`, `width`, `height`
- `artboard_width`, `artboard_height`
- `file_width`, `file_height`
- `unit`
- `dpi`
- `shape_type`
- `artboard_image_url`
- catalog mockup `id`
- catalog mockup `print_location_id`

These values should become the input to a local `ArtworkSpec`; they should not merely be drawn as visual hints in the browser.

### 2. Give Completeful a stable artwork URL

Completeful can ingest artwork from inline bytes or a public URL:

```http
POST /v1/assets
POST /v1/assets/from-url
GET  /v1/assets/{assetId}
```

Fuel & Free Time already has durable media storage. Prefer preserving the original/master in our storage first, then import or upload the chosen provider rendition. Record the provider asset id/url as a derived artifact, not as the source of truth for the original.

### 3. Create a reusable Completeful design

```http
POST /v1/designs
GET  /v1/designs/{designId}
PATCH /v1/designs/{designId}
GET  /v1/designs
```

A design may be created from a public `artfile_url` / `image_url` or from richer `canvas_json`.

For simple logo placement, a single normalized artwork rendition may be enough. For multi-element layouts, personalization, or repeatable placement rules, prefer a structured design document instead of baking everything irreversibly into one bitmap.

### 4. Export design renditions

```http
POST /v1/designs/{designId}/exports
GET  /v1/designs/exports/{exportId}
```

The provider exposes `json`, `png`, `jpeg`, and `svg` export formats with `max_size` from 128–4096.

Treat an export as a derived artifact. Do not overwrite the source/master with it.

### 5. Render catalog mockups

```http
POST /v1/mockups/renders
GET  /v1/mockups/renders/{renderId}
```

Render input:

- `mockup_id` from catalog mockup discovery
- public `art_url`
- output format / max size
- `clip_to_print_area` (defaults to clipping)

A render can finish immediately with HTTP 200 or return HTTP 202 with a `render_id`. Poll until `succeeded` or `failed`.

Use an `Idempotency-Key` so retries do not create ambiguous duplicate work.

The mockup render is a merchandising/QA output. It is **not by itself proof that the artwork is production-safe**.

---

## Verified Completeful artwork defaults

Completeful public artwork guidance, checked 2026-09-30:

- Aim for **300 DPI at final print size** for raster artwork.
- Use **sRGB/RGB** for predictable compatibility.
- Keep important content inside the product safe zone and allow room for bleed / production shift where applicable.
- Remove unintended backgrounds. Anything visibly present in the file can print.
- For most isolated logos/text/graphics, **transparent PNG is the safest general-purpose format**.
- **PNG**: recommended for most designs and transparency; Completeful lists 20 MB max.
- **JPEG**: useful for photographs/full-background designs; no transparency; Completeful lists 20 MB max.
- **SVG**: preferred for scalable logos/icons/simple vector art; Completeful lists 5 MB max and recommends converting complex SVG designs when necessary.
- **PDF**: suitable for print-ready professional/vector documents; fonts should be embedded or outlined; Completeful lists 50 MB max.
- Completeful notes that color appearance varies with the physical surface/material; screen color is not a guarantee of cotton, ceramic, stainless steel, etc. matching identically.
- Order physical samples when color/material accuracy matters.

Provider references:

- https://completeful.com/help-center/design-printing/artwork-guidelines
- https://completeful.com/help-center/design-printing/file-formats
- https://completeful.com/help-center/design-printing/color-accuracy
- https://completeful.com/help-center/design-printing/product-specs
- https://completeful.com/help-center/design-printing/mockup-generator

### Current F&FT mismatch to decide

The current Product Studio contract limits uploads to 20 MB. Completeful's public file guide currently lists PDF up to 50 MB.

That is not necessarily a bug—the F&FT UI may intentionally be stricter—but the limit should be an explicit application policy rather than an accidental assumption that all provider formats have a 20 MB ceiling.

---

## Source asset policy

Every design begins with an immutable source/master plus derived renditions.

Suggested logical model:

```text
Source / master
  logo.svg
  logo.pdf
  illustration.psd-export.png
  photo-original.jpg
        |
        v
ArtworkSpec(product + variant + print location)
        |
        +--> transparent-png@required-pixels
        +--> opaque-photo-jpeg@required-pixels
        +--> normalized-svg
        +--> print-ready-pdf
        +--> engraving-candidate
        |
        v
Completeful asset
        |
        v
Completeful design
        |
        +--> design export(s)
        |
        v
catalog mockup render(s)
        |
        v
operator approval
        |
        v
product linkage / publish workflow
```

Never destructively resize, flatten, recolor, remove a background from, or rasterize the only master copy.

Keep content hash + provenance for every derived file so a mockup can be traced back to the exact source and transformation.

---

## `ArtworkSpec` we should compute

Before an asset is eligible for Completeful product creation, build a normalized contract similar to:

```json
{
  "catalog_product_id": "...",
  "catalog_variant_id": "...",
  "print_location_id": "...",
  "print_type": "...",
  "shape_type": "...",
  "unit": "...",
  "dpi": 300,
  "physical_width": null,
  "physical_height": null,
  "file_width": null,
  "file_height": null,
  "artboard_width": null,
  "artboard_height": null,
  "background_policy": "transparent|opaque|provider-specific",
  "color_space": "sRGB",
  "preferred_format": "png|jpeg|svg|pdf|provider-specific",
  "bleed": null,
  "safe_zone": null,
  "minimum_line_width": null,
  "minimum_text_size": null,
  "production_notes": []
}
```

Values returned by Completeful should populate this directly.

Values that Completeful does **not** expose must remain unknown/null until documented. Do not invent a bleed, safe zone, engraving line width, or color-production rule.

A missing critical production constraint should block "production ready" while still allowing draft mockup experimentation.

---

## Default format selection

These are safe orchestration defaults, not replacements for per-product Completeful requirements.

| Artwork intent | Default candidate | Why |
| --- | --- | --- |
| Isolated logo / lettering / graphic on apparel | transparent PNG; preserve SVG/PDF master | avoids unwanted background rectangle; 300-DPI raster rendition can be generated to exact print size |
| Simple vector logo on products where vector is accepted | SVG master/rendition | scales without raster loss |
| Photograph or full-coverage rectangular art | JPEG or PNG | preserves intended background/full image |
| Professional vector print file | PDF | preserves vector/text information when provider workflow supports it |
| Product with engraving / marking process | **provider-specific until confirmed** | color, grayscale, stroke/filled-shape behavior can differ from ordinary print |

For a dark shirt, do not "helpfully" add a black/white rectangle behind a logo merely to make the browser preview look good. Preview background and printable artwork background are separate concepts.

For a metal product, do not assume that a color PNG is equivalent to an engraving-ready vector or monochrome file just because a mockup can render it.

---

## Questions we still need answered by Completeful

These are the important unknowns to resolve with Completeful support/docs/API before we mark the pipeline production-complete.

### A. Per-product / per-print-location geometry

1. What do `x/y/width/height` represent relative to `artboard_width/artboard_height`?
2. Are `file_width/file_height` the exact recommended production-file dimensions?
3. Which units can `unit` return?
4. Is provider `dpi` authoritative for the print location when present?
5. How is coordinate origin defined?
6. Are rotations/orientations represented anywhere?
7. Where are **safe-zone** and **bleed** dimensions exposed? They are not obvious in the current schema.
8. For wrap products, how are seams, overlap, no-print zones, and edge bleed represented?
9. Is `shape_type` sufficient to describe non-rectangular clipping, or is there a mask/vector path available?
10. Is `artboard_image_url` merely a guide image, or does it carry an exact production mask/template?

### B. Print process

For each catalog product / print location, we need a machine-readable production method, not only a human label:

- DTG
- DTF
- sublimation
- UV / direct print
- laser engraving
- embroidery
- transfer
- other provider-specific process

Ask whether `print_type` is canonical and whether it has a documented enum.

### C. Apparel and transparent artwork

1. Is transparent PNG the preferred production input for DTG/DTF garments?
2. Does Completeful automatically generate a white underbase on dark garments?
3. Are semi-transparent pixels supported predictably?
4. Are there minimum opacity thresholds?
5. What minimum line width and minimum text size should we enforce?
6. Are there garment-color-specific warnings that can be exposed via the API?
7. Are pure white pixels treated as printable white or transparency only when alpha=0?

### D. Metal, engraving, and non-ink processes

Do **not** guess these.

Ask Completeful, per relevant product:

1. Is the process actually laser engraving, UV printing, sublimation, or another method?
2. Which source format is preferred: SVG, PDF, PNG, or another format?
3. If engraving, how does artwork map to output?
   - black = engraved?
   - white = untouched?
   - grayscale/depth supported?
   - filled shapes vs strokes?
4. Must strokes be expanded/outlines converted?
5. Minimum stroke/line width?
6. Minimum gap/negative-space width?
7. Minimum text size?
8. Are gradients supported, converted, or rejected?
9. Does color information matter or is it ignored?
10. Are there finish/material-specific restrictions for stainless steel, coated metal, anodized metal, etc.?

Until these are answered, label engraving transformations `provider-specific` and require operator review.

### E. Color management

1. Completeful's public guidance recommends sRGB. Are embedded ICC profiles preserved, ignored, or converted?
2. Are CMYK PDFs accepted and converted, or should we normalize them to sRGB first?
3. Are spot/Pantone colors supported anywhere?
4. Is there a documented gamut / white-ink behavior per print method?
5. Are there provider-generated color warnings we can surface before ordering?

### F. API asset/design semantics

1. Do `POST /assets` and `POST /assets/from-url` enforce the same file-format/size limits as the web designer?
2. Does the provider preserve SVG/PDF vector data after asset import?
3. Does `POST /designs` accept all supported file formats through `artfile_url`, or only raster image URLs?
4. Is a `design export` intended as a production file, a preview file, or both?
5. Does PNG/JPEG export carry physical-size/DPI metadata, or only pixel dimensions?
6. Can a design explicitly bind to a catalog product/print location before product creation?
7. Is there a formal schema for `canvas_json` we can validate locally?

### G. Mockup rendering

1. Does `clip_to_print_area=true` use the exact production mask or only a visual approximation?
2. Are mockup renders color-managed or intentionally approximate?
3. Are all catalog mockups valid for every child variant/color?
4. Can a render response identify the variant/color actually used?
5. Is there a provider guarantee that a successful mockup render implies the artwork is acceptable for production? We should assume **no** until explicitly documented.

---

## Recommended F&FT orchestration

### Stage 1 — ingest

Accept:

- uploaded artwork
- existing Media Library asset
- BrandPack logo
- AgentSam-generated concept
- imported public URL

Persist the original once.

### Stage 2 — inspect

Deterministically inspect:

- MIME/format
- width/height
- alpha/transparency
- color profile if available
- file size
- vector vs raster
- raster effective DPI once target physical dimensions are known
- obvious empty/oversized canvas
- content hash

Do not rely on an LLM to determine basic file suitability.

### Stage 3 — select product + print location

Load Completeful catalog detail and build `ArtworkSpec`.

The chosen print location, not the generic product card, is the production target.

### Stage 4 — derive

Generate only the rendition(s) required by `ArtworkSpec`.

Examples:

- transparent PNG resized to exact pixel target without upscaling a low-resolution source
- normalized SVG retaining vector geometry
- PDF with fonts outlined/embedded
- opaque JPEG for full-photo print
- provider-approved engraving rendition once engraving rules are confirmed

### Stage 5 — provider ingest + design

Import/upload the derived rendition to Completeful and create/update a design.

Store provider ids beside the local asset relation; do not make provider ids the local media identity.

### Stage 6 — mockup

Render all useful catalog mockups through `POST /mockups/renders`.

Persist returned image URLs/metadata into the existing media/product workflow so Product Studio can pick hero, detail, and lifestyle imagery without manual downloads.

### Stage 7 — QA gate

Before allowing provider product creation/publish, show:

- source thumbnail
- production rendition
- target print location
- effective DPI
- file format
- background policy
- unresolved provider warnings
- mockup render(s)
- operator approval state

### Stage 8 — product link

Only after approval should the selected design/rendition become the Completeful product's durable artwork relationship.

Use the existing `completeful_product_links`, `completeful_variant_links`, and `completeful_operations` direction from the runtime contract rather than inventing a competing product authority.

---

## Suggested readiness states

```text
source_only
  -> inspected
  -> target_selected
  -> rendition_ready
  -> provider_asset_ready
  -> design_ready
  -> mockup_pending
  -> mockup_ready
  -> needs_review
  -> approved
  -> linked
  -> published
```

A failed transformation or provider call should preserve the previous valid stage and structured error/remediation. Do not silently fall back to publishing the source master.

---

## Key product principle

**Mockup generation and print-file preparation are one workflow, but they are not the same artifact.**

Fuel & Free Time should make it feel seamless:

> choose/create art → choose product → automatically prepare target-safe rendition → preview real Completeful mockups → approve → create/link product

Under the hood we preserve enough geometry, format, provenance, and provider constraints that the operator can trust what is being sent to production.
