/** FNF-only visual fixture. No database, fulfillment, or production writes. */
import http from "node:http";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../");
const storefront = path.join(repo, "packages/heuristic-theme/storefront");
const sizes = ["2XL","3XL","L","M","S","XL"];
const colors = ["Ash","Black","Bone","Charcoal","Forest","Navy","Moss","Clay","Sand","Stone","Slate","Wine","Olive","Steel","Heather"];
const variants = colors.flatMap((color, ci) => sizes.map((size, si) =>
  ({ id: ci*6+si+1, sku: `DEMO-${ci}-${si}`, color, size, inventory_qty: 0, price_cents: 3499 })));
const image = "/assets/presets/fuel-free-time/essentials.webp";
const instance = JSON.parse(readFileSync(path.join(repo, "site/fuelnfreetime/site.json"), "utf8"));
const nav = {
  logoUrl: instance.brand.logo.currentUrl,
  logoHeight: 58,
  brandAccent: "#ff4d00",
  brandAccentLight: "#d99142",
  items: instance.navigation.primary.map((item) => ({
    id: item.label.toLowerCase(), label: item.label, href: item.href,
    matchPrefixes: [item.href, ...(item.href === "/shop" ? ["/products/"] : [])],
  })),
  announcement: { enabled: false },
};
const product = { id: 12, slug: "review-hoodie", title: "Classic Hooded Sweatshirt",
  collection: "Earned Hours", price_cents: 3499,
  description: "Built for early starts, long builds, and everything after the clock. An everyday essential for the hours you make your own.",
  primary_image: image, image_url: image, images: [{ url: image, is_primary: 1 }] };
const reviewProducts = [
  { ...product, variant_count: 90, total_inventory: 0, sizes: "S,M,L,XL,2XL,3XL", collection: "essentials" },
  { id: 13, slug: "preview-tee", title: "Earned Hours Tee", price_cents: 2999,
    description: "A preview concept, not an approved or purchasable product.",
    collection: "masters", total_inventory: 0, variant_count: 0,
    primary_image: "/assets/presets/fuel-free-time/masters.webp", sizes: "S,M,L,XL" },
  { id: 14, slug: "preview-field", title: "High Octane Field Edition", price_cents: 3499,
    description: "A preview concept, not an approved or purchasable product.",
    collection: "high-octane-performance-gear", total_inventory: 0, variant_count: 0,
    primary_image: "/assets/presets/fuel-free-time/earned-hours-hero.webp", sizes: "" },
];
const contentType = (name) => name.endsWith(".html") ? "text/html; charset=utf-8" :
  name.endsWith(".css") ? "text/css; charset=utf-8" : /\.m?js$/.test(name) ?
    "text/javascript; charset=utf-8" : name.endsWith(".webp") ? "image/webp" : "application/octet-stream";
const server = http.createServer((req,res) => {
  const route = new URL(req.url || "/", "http://localhost").pathname;
  if (route.startsWith("/api/")) {
    const data = route === "/api/store/products/review-hoodie" ? { ok:true, product, variants }
      : route === "/api/store/nav" ? { ok:true, nav }
        : route === "/api/store/products" ? { ok:true, products: reviewProducts }
          : route === "/api/cms/pages/site"
            ? { ok: true, page: { sections: [
                { key: "footer", content: { logoUrl: instance.brand.logo.currentUrl } },
              ] } }
            : { ok:true, products:[], items:[] };
    res.writeHead(200, { "content-type":"application/json" }).end(JSON.stringify(data));
    return;
  }
  if (route === "/theme/contracts/header-presets.json") {
    const bytes = readFileSync(path.join(repo, "packages/heuristic-theme/contracts/header-presets.json"));
    res.writeHead(200, { "content-type":"application/json" }).end(bytes);
    return;
  }
  const filename = path.resolve(storefront, "." + (route === "/" || route.startsWith("/products/") ? "/product.html" : route === "/shop" ? "/shop.html" : route));
  if (!filename.startsWith(storefront + path.sep) || !existsSync(filename)) {
    res.writeHead(404).end("Not found"); return;
  }
  let bytes = readFileSync(filename);
  if (filename.endsWith("product.html")) {
    const probe = '<script>setTimeout(()=>{const result={width:innerWidth,colors:document.querySelectorAll(".pdp-color").length,sizes:document.querySelectorAll(".pdp-size").length,checkoutDisabled:document.getElementById("pdp-add")?.disabled,heading:document.querySelector(".pdp-buy h1")?.textContent,errors:document.querySelector(".pdp-error-wrap")?.textContent};const el=document.createElement("pre");el.id="browser-result";el.hidden=true;el.textContent=JSON.stringify(result);document.body.append(el)},1400)</script>';
    bytes = Buffer.from(bytes.toString("utf8").replace("</body>", probe + "</body>"));
  }
  res.writeHead(200, { "content-type":contentType(filename),"cache-control":"no-store" }).end(bytes);
});
const port = Number(process.env.FNF_REVIEW_PORT || 4324);
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`Preview: http://127.0.0.1:${port}/products/review-hoodie`);
console.log("90 fixture combinations; checkout intentionally disabled; NO production writes.");
