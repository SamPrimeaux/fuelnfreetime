import storage from "../../site/fuelnfreetime/storage.json" with { type: "json" };

/**
 * Asset-storage config. Deployment values (account, bucket, hostnames, CORS) live in
 * one file, site/fuelnfreetime/storage.json; this module only validates and derives.
 * Pipeline defaults below are code, not customer identity.
 */
const REQUIRED = ["accountId", "bucket", "binding", "publicBaseUrl", "workerMediaBaseUrl"];
for (const key of REQUIRED) {
  if (!storage?.[key]) throw new Error(`site storage config is missing "${key}"`);
}

export const ASSET_STORAGE = Object.freeze({
  accountId: storage.accountId,
  bucket: storage.bucket,
  binding: storage.binding,
  location: storage.location || "",
  s3Api: `https://${storage.accountId}.r2.cloudflarestorage.com/${storage.bucket}`,
  /** Preferred public hostname (custom domain). May 404 until CDN path proven. */
  publicBaseUrl: storage.publicBaseUrl,
  /** Verified Worker serve path. */
  workerMediaBaseUrl: storage.workerMediaBaseUrl,
  corsOrigins: Object.freeze([...(storage.corsOrigins || [])]),
  /** Canonical product folder root used by classify.js key layout (products/<collection>/...). */
  productRoot: "products/",
  /** Transient intake prefix — safe to delete after successful promote. */
  intakePrefix: "intake/",
  stage: Object.freeze({
    // Legacy paths retained for report compatibility; new promote path uses canonical keys.
    optimized: "uploads/staging/images/optimized",
    preview: "uploads/staging/images/preview",
    products: "uploads/staging/products",
    reports: "agentsam/asset-pipelines/reports",
  }),
  defaults: Object.freeze({
    maxWidth: 1600,
    previewWidth: 480,
    quality: 82,
    productMaxWidth: 1400,
    productQuality: 80,
  }),
});

/** @deprecated Deployment compatibility alias. New reusable code uses ASSET_STORAGE. */
export const FNF_R2 = ASSET_STORAGE;

/** Derive public URLs from durable r2_key — never persist signed URLs. */
export function publicUrlsForKey(r2Key) {
  const key = String(r2Key || "").replace(/^\/+/, "");
  return {
    key,
    worker: `${ASSET_STORAGE.workerMediaBaseUrl}/${key}`,
    cdn: `${ASSET_STORAGE.publicBaseUrl}/${key}`,
  };
}

/**
 * Preferred delivery URL for app UIs.
 * CDN custom domain is canonical when healthy; Worker /media is the verified fallback.
 * Pass preferWorker=true when CDN is known unhealthy (current: assets.* often 404).
 */
export function deliveryUrlForKey(r2Key, { preferWorker = true } = {}) {
  const urls = publicUrlsForKey(r2Key);
  return preferWorker ? urls.worker : urls.cdn;
}

/** Persistable relative compatibility path. */
export function mediaPathForKey(r2Key) {
  const key = String(r2Key || "").replace(/^\/+/, "");
  return `/media/${key}`;
}
