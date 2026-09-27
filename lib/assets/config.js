/**
 * FNF R2 asset pipeline config — SSOT for bin/ + Worker hooks.
 * Bucket: fuelnfreetime (WEBSITE_ASSETS), WNAM
 */
export const FNF_R2 = Object.freeze({
  accountId: "ede6590ac0d2fb7daf155b35653457b2",
  bucket: "fuelnfreetime",
  binding: "WEBSITE_ASSETS",
  location: "WNAM",
  s3Api: "https://ede6590ac0d2fb7daf155b35653457b2.r2.cloudflarestorage.com/fuelnfreetime",
  /** Preferred public hostname (Active custom domain). May 404 until CDN path proven. */
  publicBaseUrl: "https://assets.fuelnfreetime.com",
  /** Verified Worker serve path. */
  workerMediaBaseUrl: "https://fuelnfreetime.com/media",
  corsOrigins: Object.freeze([
    "https://fuelnfreetime.com",
    "https://www.fuelnfreetime.com",
    "https://fuelnfreetime.meauxbility.workers.dev",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
  ]),
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

/** Derive public URLs from durable r2_key — never persist signed URLs. */
export function publicUrlsForKey(r2Key) {
  const key = String(r2Key || "").replace(/^\/+/, "");
  return {
    key,
    worker: `${FNF_R2.workerMediaBaseUrl}/${key}`,
    cdn: `${FNF_R2.publicBaseUrl}/${key}`,
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
