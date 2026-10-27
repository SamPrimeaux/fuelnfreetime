import { completefulApi } from "./api.js";

function requiredId(value, field) {
  const id = String(value || "").trim();
  if (!id || id.length > 256) throw new TypeError(field + " required");
  return id;
}

/** Named compatibility facade for existing FNF Designs / Studio callers. */
export const completefulDesigns = Object.freeze({
  list(env, { shopId, search, limit = 50, cursor = null } = {}) {
    return completefulApi.designs.list(env, {
      query: { shop_id: shopId, search, limit: Math.min(200, Math.max(1, limit)), cursor },
    });
  },
  get(env, designId) {
    return completefulApi.designs.get(env, { path: { designId: requiredId(designId, "designId") } });
  },
  create(env, input, idempotencyKey) {
    return completefulApi.designs.create(env, { body: input, idempotencyKey });
  },
  update(env, designId, input, idempotencyKey) {
    return completefulApi.designs.update(env, {
      path: { designId: requiredId(designId, "designId") }, body: input, idempotencyKey,
    });
  },
  remove(env, designId, idempotencyKey) {
    return completefulApi.designs.delete(env, {
      path: { designId: requiredId(designId, "designId") }, idempotencyKey,
    });
  },
  export(env, designId, input, idempotencyKey) {
    return completefulApi.designs.createExport(env, {
      path: { designId: requiredId(designId, "designId") }, body: input, idempotencyKey,
    });
  },
  getExport(env, exportId) {
    return completefulApi.designs.getExport(env, { path: { exportId: requiredId(exportId, "exportId") } });
  },
  validatePrintFile(env, { art_url, print_location_id, catalog_product_id }) {
    return completefulApi.printFiles.validate(env, {
      body: { art_url, print_location_id, catalog_product_id },
    });
  },
});
