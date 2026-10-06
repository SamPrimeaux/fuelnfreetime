# FNF Creative Asset Library — Operating Rules

This is **an index and review workflow, not a new media backend**. It organizes ideas and production masters without duplicating the FNF Content library or creating another dashboard.

## Categories

| Category | Purpose | Storage |
|---|---|---|
| [Inbox](inbox/README.md) | Unsorted images, voice notes, screenshots, concept links | Intake notes here; original files in durable storage/media library |
| [Identity](../identity/artwork/v1/README.md) | Logos, marks, source vectors, vendor proofs | Existing versioned Git artwork masters |
| [Collection concepts](../collections/concepts/README.md) | Draft art, alternate colorways, mockups and inspiration | Concept metadata here; original/high-volume imagery in media library |
| [Product photography](../products/photography/README.md) | Photos of physical samples, faithful retouches and approved listings | Content library; link product IDs only when they exist |
| [Campaign creative](../campaigns/creative/README.md) | Video shots, covers, bike-build chapters and launch visuals | Content library / campaign records |
| [Approved register](approved/README.md) | Written record of which exact version is approved for which use | Approval record here; source master remains in original location |

## Asset stages

Use these explicit states instead of an ambiguous `final` folder:

- `inbox`: newly received, unclassified;
- `reference`: external inspiration; **not** owned production art;
- `concept`: original proposal / mockup, not yet approved;
- `review`: awaiting Justin, designer or manufacturer feedback;
- `approved-creative`: approved style or campaign direction **for a stated use**;
- `approved-production`: exact print/etch/embroidery treatment vendor-proofed and approved;
- `published`: actually published or attached to a verified live product/campaign;
- `retired`: superseded but preserved.

Never infer stage from filename, vector extension, or a nice-looking mockup. An asset can have one approval for web editorial and no approval for merchandise.

## Minimum record

Copy [ASSET_RECORD.md](templates/ASSET_RECORD.md). Capture: stable ID, category, creator/source, ownership/usage rights, original location, derivatives, visual fidelity, version, review stage, reviewer/date/scope, and references to FNF media/product/campaign IDs when actually known.

The curated machine-readable [registry](asset-registry.json) currently indexes the **existing** F&FT logo pack only. Do not pretend it is an inventory of all R2 media.

## Hard rules

1. Keep untouched originals; remasters are derivatives.
2. AI concepts are marked as concepts. AI-remastered images must be compared to real products, especially lettering, color, stitching, fit and print placement.
3. Do not create purchasable products from an image alone; check original artwork, permissions, stock, manufacturing, pricing and variants.
4. Store only genuinely appropriate small/master assets in Git; no unbounded photo/video dumping. Use the existing media library for bulk assets.
5. Record permissions before publishing third-party creator footage, collaborations or likenesses.
6. Avoid fabricated community claims, creator endorsements or prize-promotion promises.
7. No second media database, album implementation, asset storage API or theme editor is authorized by this documentation.

## Weekly async routine

Justin: review 2–5 links, mark KEEP / CHANGE / PASS and add a quick voice note. Sam: log decisions and prepare the next clearly labeled concepts. Only move an asset to an approved state with reviewer, date, file version and intended use.
