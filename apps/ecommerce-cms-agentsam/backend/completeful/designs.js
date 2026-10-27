import {
  assertCompletefulMutationAllowed, completefulRequest,
} from "./client.js";

function requiredId(value, field) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) throw new TypeError(field + " required");
  return encodeURIComponent(id);
}

/** Completeful v1 design resource operations. Hosted callers must authorize the shop. */
export const completefulDesigns = Object.freeze({
  list(env, { shopId, search, limit = 50, cursor = null } = {}) {
    return completefulRequest(env, "GET", "/designs", {
      query: { shop_id: shopId, search, limit: Math.min(200, Math.max(1, limit)), cursor },
    });
  },
  get(env, designId) {
    return completefulRequest(env, "GET", "/designs/" + requiredId(designId, "designId"));
  },
  create(env, input, idempotencyKey) {
    assertCompletefulMutationAllowed(env);
    return completefulRequest(env, "POST", "/designs", { body: input, idempotencyKey });
  },
  update(env, designId, input, idempotencyKey) {
    assertCompletefulMutationAllowed(env);
    return completefulRequest(env, "PATCH", "/designs/" + requiredId(designId, "designId"), {
      body: input, idempotencyKey,
    });
  },
  remove(env, designId, idempotencyKey) {
    assertCompletefulMutationAllowed(env);
    return completefulRequest(env, "DELETE", "/designs/" + requiredId(designId, "designId"), { idempotencyKey });
  },
  export(env, designId, input, idempotencyKey) {
    assertCompletefulMutationAllowed(env);
    return completefulRequest(env, "POST",
      "/designs/" + requiredId(designId, "designId") + "/exports", {
        body: input, idempotencyKey,
      });
  },
  getExport(env, exportId) {
    return completefulRequest(env, "GET", "/designs/exports/" + requiredId(exportId, "exportId"));
  },
  validatePrintFile(env, { art_url, print_location_id, catalog_product_id }) {
    return completefulRequest(env, "POST", "/print-files/validate", {
      body: { art_url, print_location_id, catalog_product_id },
    });
  },
});
