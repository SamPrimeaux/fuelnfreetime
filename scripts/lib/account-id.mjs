import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The Cloudflare account id for this deployment: the CLOUDFLARE_ACCOUNT_ID environment variable, otherwise the
 * [vars] entry in this deployment's own wrangler.toml. There is deliberately no baked-in default.
 */
function wranglerToml() {
  try {
    return fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../wrangler.toml"), "utf8");
  } catch {
    return "";
  }
}

export function cloudflareAccountId() {
  const fromEnv = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  if (fromEnv) return fromEnv;
  const match = /^CLOUDFLARE_ACCOUNT_ID\s*=\s*"([^"]+)"/m.exec(wranglerToml());
  if (match) return match[1];
  throw new Error("CLOUDFLARE_ACCOUNT_ID is not set. Export it, or add it to [vars] in this deployment's wrangler.toml.");
}

/** The zone for this deployment's domain. Environment only; it is never committed. */
export function cloudflareZoneId() {
  const id = String(process.env.CLOUDFLARE_ZONE_ID || "").trim();
  if (!id) throw new Error("CLOUDFLARE_ZONE_ID is not set. Export it (see .env.cloudflare.example).");
  return id;
}

/** A KV namespace id: CMS_KV_NAMESPACE_ID, otherwise the id bound to `binding` in this deployment's wrangler.toml. */
export function kvNamespaceId(binding) {
  const fromEnv = String(process.env.CMS_KV_NAMESPACE_ID || "").trim();
  if (fromEnv) return fromEnv;
  for (const block of wranglerToml().split(/^\[\[kv_namespaces\]\]/m).slice(1)) {
    const own = block.split(/^\[/m)[0];
    const b = /binding\s*=\s*"([^"]+)"/.exec(own);
    const id = /\bid\s*=\s*"([^"]+)"/.exec(own);
    if (b && id && b[1] === binding) return id[1];
  }
  throw new Error("No KV namespace id for " + binding + ". Set CMS_KV_NAMESPACE_ID or bind it in wrangler.toml.");
}
