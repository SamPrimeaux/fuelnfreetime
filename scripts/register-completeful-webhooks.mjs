// scripts/register-completeful-webhooks.mjs
// Run: source ~/.agentsam/load-agent-env.sh completeful && node scripts/register-completeful-webhooks.mjs
import { execFileSync } from "node:child_process";

const API_BASE = "https://vxapi.completeful.com/v1";
const TARGET_URL = "https://fuelnfreetime.com/api/webhooks/completeful";
const CAPP_KEY = process.env.CAPP_KEY;
if (!CAPP_KEY) { console.error("Set CAPP_KEY first (source ~/.agentsam/load-agent-env.sh completeful)."); process.exit(1); }

const TOPICS = [
  "order:cancelled","order:refunded","order:shipment:created",
  "catalog:product:created","catalog:product:updated",
  "catalog:product:price_changed","catalog:product:availability_changed",
  "product:created","product:updated","product:deleted",
  "product:publish:started","product:publish:succeeded","product:publish:failed",
  "shop:disconnected",
]; // 'ping', order:created, order:updated, order:sent-to-production already registered+backfilled

const topicToEnvSuffix = (t) => t.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const authHeaders = { Authorization: `Bearer ${CAPP_KEY}`, "Content-Type": "application/json" };

async function main() {
  const shopsRes = await fetch(`${API_BASE}/shops`, { headers: authHeaders });
  if (!shopsRes.ok) {
    console.error(`GET /shops failed ${shopsRes.status}:`, await shopsRes.text());
    process.exit(1);
  }
  const shopsJson = await shopsRes.json();
  const shopsList = Array.isArray(shopsJson) ? shopsJson : (shopsJson.shops ?? shopsJson.data ?? []);
  const shop = shopsList.find(s => s.kind === "primary" || s.is_primary) ?? shopsList[0];
  if (!shop) { console.error("No shop found via GET /shops"); process.exit(1); }
  const shopId = shop.id;
  console.log(`Using shop ${shopId}`);

  for (const topic of TOPICS) {
    const res = await fetch(`${API_BASE}/shops/${shopId}/webhooks`, {
      method: "POST",
      headers: { ...authHeaders, "Idempotency-Key": `setup-${topic}` },
      body: JSON.stringify({ url: TARGET_URL, topic }),
    });

    if (!res.ok) { console.error(`[${topic}] FAILED ${res.status}:`, await res.text()); continue; }
    const { webhook: wh } = await res.json();
    console.log(`[${topic}] id=${wh.id} secret_last4=${wh.secret_last4}`);

    const envName = `COMPLETEFUL_WEBHOOK_SECRET_${topicToEnvSuffix(topic)}`;
    const sqlEscape = (value) => String(value ?? "").replaceAll("'", "''");
    const registryId = `awh_completeful_${String(wh.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 18)}`;
    const slug = `completeful-${topic.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase()}-${String(shopId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
    const status = String(wh.status || "").toLowerCase() === "active" ? "active" : "pending";
    const metadata = JSON.stringify({
      secret_last4: wh.secret_last4 || null,
      source: "register-completeful-webhooks.mjs",
    });
    const sql = `INSERT INTO agentsam_webhooks (
      id, account_id, user_id, provider, provider_webhook_id,
      provider_resource_type, provider_resource_id,
      name, slug, status, endpoint_url, events_json,
      signature_header, signature_algo, secret_ref, metadata_json,
      created_at_unix, updated_at_unix
    ) VALUES (
      '${sqlEscape(registryId)}',
      'ede6590ac0d2fb7daf155b35653457b2',
      'au_fnf_system',
      'completeful',
      '${sqlEscape(wh.id)}',
      'shop',
      '${sqlEscape(shopId)}',
      '${sqlEscape(`Completeful ${topic}`)}',
      '${sqlEscape(slug)}',
      '${sqlEscape(status)}',
      '${sqlEscape(TARGET_URL)}',
      '${sqlEscape(JSON.stringify([topic]))}',
      'X-Capp-Signature',
      'sha256',
      '${sqlEscape(envName)}',
      '${sqlEscape(metadata)}',
      unixepoch(),
      unixepoch()
    )
    ON CONFLICT(account_id, provider, provider_webhook_id) DO UPDATE SET
      provider_resource_type = excluded.provider_resource_type,
      provider_resource_id = excluded.provider_resource_id,
      name = excluded.name,
      slug = excluded.slug,
      status = excluded.status,
      endpoint_url = excluded.endpoint_url,
      events_json = excluded.events_json,
      signature_header = excluded.signature_header,
      signature_algo = excluded.signature_algo,
      secret_ref = excluded.secret_ref,
      metadata_json = excluded.metadata_json,
      updated_at_unix = unixepoch();`;
    execFileSync("npx", ["wrangler", "d1", "execute", "fuelnfreetime", "--remote", "--command", sql], { stdio: "inherit" });

    execFileSync("npx", ["wrangler", "secret", "put", envName], { input: wh.secret, stdio: ["pipe", "inherit", "inherit"] });
  }
}
main();
