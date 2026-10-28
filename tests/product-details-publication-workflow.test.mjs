import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync("apps/ecommerce-cms-agentsam/frontend/static/product-edit.html", "utf8");
const start = html.indexOf("async function saveProduct() {");
const end = html.indexOf('document.getElementById("save-btn").addEventListener', start);
assert.ok(start >= 0 && end > start, "The tested save function must remain wired to Product Details");
const source = html.slice(start, end) + "\nthis.runProductSave = saveProduct;";

function setup({ failCreate = false, prelinked = false } = {}) {
  const actions = [];
  const notices = [];
  const status = { value: "active" };
  const saveButton = { textContent: "Publish" };
  let storedStatus = "draft";
  let linked = prelinked;
  let loadCount = 0;

  const snapshot = () => ({
    product: {
      title: "Hoodie", slug: "hoodie", description: null, seo_title: null,
      seo_description: null, collection: null, price_cents: 3999, status: storedStatus,
    },
    variants: linked ? Array.from({ length: 90 }, (_, i) => ({ id: i + 1 })) : [],
    collection_ids: [],
    selling_selection: { selected_count: 90 },
    fulfillment: linked ? { completeful_store_product_id: "provider-product" } : null,
    design_draft: { id: "draft-12", state: linked ? "created" : "prepared" },
  });

  const context = {
    isNew: false,
    productId: "12",
    dirty: true,
    saveInFlight: false,
    saveFailed: false,
    variantCount: 0,
    designContext: {
      draft: { id: "draft-12", state: "prepared", prepared_media_asset_id: 1 },
      fulfillment: prelinked ? { completeful_store_product_id: "provider-product" } : null,
    },
    document: {
      getElementById(id) {
        return id === "status-sidebar" ? status : id === "save-btn" ? saveButton : null;
      },
    },
    collectPayload() {
      return {
        title: "Hoodie", slug: "hoodie", description: "", seo_title: "",
        seo_description: "", collection: "", price_cents: 3999,
        status: status.value, variants: [], collection_ids: [],
      };
    },
    async adminFetch(url, options = {}) {
      const method = options.method || "GET";
      actions.push(method + " " + url);
      if (url === "/api/admin/products/12" && method === "PUT") {
        const input = JSON.parse(options.body);
        assert.equal(input.status, "draft", "never publish before Completeful linkage");
        storedStatus = input.status;
        return { ok: true };
      }
      if (url === "/api/admin/products/12" && method === "GET") return snapshot();
      if (url.endsWith("/create-product") && method === "POST") {
        if (failCreate) throw new Error("Supplier temporarily unavailable");
        const already_linked = linked;
        linked = true;
        return { ok: true, mapped_variants: 90, already_linked };
      }
      if (url.endsWith("/publish") && method === "POST") {
        assert.ok(linked, "Supplier product must exist before publication");
        storedStatus = "active";
        return { ok: true, status: "active" };
      }
      throw new Error("Unexpected API request: " + method + " " + url);
    },
    showNote(message, kind) { notices.push({ message, kind }); },
    setDirty(value) { context.dirty = value; },
    syncStatusUi() {},
    syncDockEdit() {},
    updateHeaderTitle() {},
    updateSeoPreview() {},
    renderStudioDesign() {},
    updateVariantOriginals() {},
    async loadProduct() { loadCount++; status.value = storedStatus; },
    console,
  };
  runInNewContext(source, context, { filename: "product-edit-save.js" });
  return { context, actions, notices, status, get loadCount() { return loadCount; } };
}

test("Publish saves draft then creates and maps 90 variants before publishing", async () => {
  const t = setup();
  await t.context.runProductSave();
  assert.deepEqual(t.actions, [
    "PUT /api/admin/products/12",
    "GET /api/admin/products/12",
    "POST /api/admin/product-studio/drafts/draft-12/create-product",
    "GET /api/admin/products/12",
    "POST /api/admin/product-studio/drafts/draft-12/publish",
    "GET /api/admin/products/12",
  ]);
  assert.equal(t.loadCount, 1);
  assert.equal(t.status.value, "active");
  assert.match(t.notices.at(-1).message, /Published successfully with 90 supplier variants/);
});

test("An upstream failure leaves saved details as Draft without false publication", async () => {
  const t = setup({ failCreate: true });
  await t.context.runProductSave();
  assert.equal(t.status.value, "draft");
  assert.ok(t.actions.some((item) => item.endsWith("/create-product")));
  assert.equal(t.actions.some((item) => item.endsWith("/publish")), false);
  assert.match(t.notices.at(-1).message, /Saved as Draft/);
  assert.match(t.notices.at(-1).message, /Supplier temporarily unavailable/);
});

test("A previously linked Completeful product is verified before publishing, without creating a duplicate", async () => {
  const t = setup({ prelinked: true });
  await t.context.runProductSave();
  assert.equal(t.actions.filter((item) => item.endsWith("/create-product")).length, 1);
  assert.equal(t.actions.some((item) => item.endsWith("/publish")), true);
  assert.equal(t.status.value, "active");
});
