import { adminFetch } from "../../lib/api";
import type { Collection, CollectionForm, Product, MediaAsset, SupplierBlank, CollectionStatus, MerchCollectionRules } from "./model";
import { serializeCollection } from "./model";

type Ok = { ok: boolean; error?: string };
function accepted<T extends Ok>(result: T): T {
  if (!result.ok) throw new Error(result.error || "Request was not completed");
  return result;
}
export const collectionsApi = {
  async list() {
    return accepted(await adminFetch<Ok & { collections: Collection[] }>("/api/admin/collections")).collections;
  },
  async products() {
    return accepted(await adminFetch<Ok & { products: Product[] }>("/api/admin/products")).products;
  },
  async get(id: number) {
    return accepted(await adminFetch<Ok & { collection: Collection; product_ids: number[]; rules?: MerchCollectionRules }>(
      `/api/admin/collections/${id}`));
  },
  async save(form: CollectionForm, id?: number, status?: CollectionStatus) {
    const path = id ? `/api/admin/collections/${id}` : "/api/admin/collections";
    return accepted(await adminFetch<Ok & { collection: Collection }>(path, {
      method: id ? "PUT" : "POST", body: JSON.stringify(serializeCollection(form, status)),
    })).collection;
  },
  async saveRules(id: number, rules: MerchCollectionRules) {
    return accepted(await adminFetch<Ok & {rules:MerchCollectionRules}>(`/api/admin/collections/${id}/rules`, {
      method: "PUT", body: JSON.stringify(rules),
    }));
  },
  async assign(id: number, productIds: number[]) {
    return accepted(await adminFetch<Ok & { product_ids: number[] }>(`/api/admin/collections/${id}/products`, {
      method: "PUT", body: JSON.stringify({ product_ids: productIds }),
    }));
  },
  async media(q = "") {
    const params = new URLSearchParams({ view: "images", page_size: "60", page: "1", ...(q ? { q } : {}) });
    return accepted(await adminFetch<Ok & { assets: MediaAsset[] }>(`/api/admin/media?${params}`)).assets;
  },
  async supplier(search: string) {
    const params = new URLSearchParams({ search, limit: "12", offset: "0" });
    const data = await adminFetch<Ok & { items?: SupplierBlank[] }>(`/api/admin/completeful/catalog?${params}`);
    if (!Array.isArray(data.items)) throw new Error(data.error || "Supplier catalog unavailable");
    return data.items;
  },
};
