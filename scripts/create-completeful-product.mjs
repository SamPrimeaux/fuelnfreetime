// scripts/create-completeful-product.mjs
// Run: source ~/.agentsam/load-agent-env.sh completeful && node scripts/create-completeful-product.mjs <local_product_id> [--catalog-product-id=<uuid>]
import { execFileSync } from "node:child_process";

const API_BASE = "https://vxapi.completeful.com/v1";
const SITE_ORIGIN = "https://fuelnfreetime.com";
const SHOP_ID = "b28c50f8-3a81-4d1c-b9f8-3754ca50d136";
const CAPP_KEY = process.env.CAPP_KEY;
if (!CAPP_KEY) { console.error("Set CAPP_KEY first (source ~/.agentsam/load-agent-env.sh completeful)."); process.exit(1); }

const [, , productIdArg, ...rest] = process.argv;
if (!productIdArg) { console.error("Usage: node scripts/create-completeful-product.mjs <local_product_id> [--catalog-product-id=<uuid>]"); process.exit(1); }
const overrideCatalogId = rest.find(a => a.startsWith("--catalog-product-id="))?.split("=")[1];

const authHeaders = { Authorization: `Bearer ${CAPP_KEY}`, "Content-Type": "application/json" };

function d1Query(sql) {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "fuelnfreetime", "--remote", "--json", "--command", sql], { encoding: "utf8" });
  return JSON.parse(out)[0].results;
}

async function main() {
  const rows = d1Query(`SELECT id, slug, title, description, price_cents, status FROM products WHERE id = ${Number(productIdArg)}`.replace(/\s+/g, " ").trim());
  const product = rows[0];
  if (!product) { console.error(`No local product with id ${productIdArg}`); process.exit(1); }
  if (!product.price_cents) { console.error(`[${product.title}] has no price set — fix that in D1 first, not scripting around it.`); process.exit(1); }

  const images = d1Query(`SELECT m.url FROM product_images pi JOIN media_assets m ON m.id = pi.media_asset_id WHERE pi.product_id = ${product.id} ORDER BY pi.is_primary DESC LIMIT 1`);
  const relUrl = images[0]?.url;
  if (!relUrl) { console.error(`[${product.title}] has no image — nothing to send as artfile_url.`); process.exit(1); }
  const artfileUrl = relUrl.startsWith("http") ? relUrl : `${SITE_ORIGIN}${relUrl}`;
  console.log(`[${product.title}] artfile_url = ${artfileUrl}`);

  let catalogProductId = overrideCatalogId;
  if (!catalogProductId) {
    const searchRes = await fetch(`${API_BASE}/catalog/products/semantic?${new URLSearchParams({ q: product.title, limit: "5" })}`, { headers: authHeaders });
    if (!searchRes.ok) { console.error("catalog semantic search failed:", await searchRes.text()); process.exit(1); }
    const { items } = await searchRes.json();
    if (!items?.length) { console.error("No catalog matches — pass --catalog-product-id explicitly."); process.exit(1); }
    console.log("Top catalog matches:");
    items.slice(0, 5).forEach((it, i) => console.log(`  ${i + 1}. ${it.name} (${it.catalog_product_id}) score=${it.relevance?.score?.toFixed(1)}`));
    catalogProductId = items[0].catalog_product_id;
    console.log(`Using top match: ${items[0].name}`);
  }

  const body = {
    catalog_product_id: catalogProductId,
    title: product.title,
    description: product.description || null,
    retail_price: product.price_cents / 100,
    sku: product.slug,
    artfile_url: artfileUrl,
    // variants intentionally omitted — Completeful will offer the catalog product's
    // default sellable set; refine with an explicit ProductVariantSelection once you
    // want to restrict sizes/colors to match your local product_variants exactly.
  };

  const res = await fetch(`${API_BASE}/shops/${SHOP_ID}/products`, {
    method: "POST",
    headers: { ...authHeaders, "Idempotency-Key": `create-product-${product.id}` },
    body: JSON.stringify(body),
  });

  console.log(`X-Capp-Mode: ${res.headers.get("x-capp-mode")}  X-Capp-Dry-Run: ${res.headers.get("x-capp-dry-run")}`);
  const data = await res.json();
  if (!res.ok) { console.error("FAILED", res.status, JSON.stringify(data, null, 2)); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));

  const sp = data.store_product ?? data.product ?? data;
  if (sp?.id) {
    const sql = `INSERT INTO completeful_product_links
      (product_id, completeful_shop_id, completeful_store_product_id, completeful_catalog_product_id, sync_status)
      VALUES (${product.id}, '${SHOP_ID}', '${sp.id}', '${catalogProductId}', 'linked')
      ON CONFLICT(product_id, completeful_shop_id) DO UPDATE SET
        completeful_store_product_id = excluded.completeful_store_product_id,
        completeful_catalog_product_id = excluded.completeful_catalog_product_id,
        sync_status = 'linked', updated_at = datetime('now');`;
    execFileSync("npx", ["wrangler", "d1", "execute", "fuelnfreetime", "--remote", "--command", sql], { stdio: "inherit" });
  } else {
    console.log("Response shape didn't match store_product/product — inspect the JSON above before I guess at the D1 insert.");
  }
}
main();
