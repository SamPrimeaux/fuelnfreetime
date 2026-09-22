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

    const sql = `INSERT INTO completeful_webhook_subscriptions (completeful_shop_id, completeful_webhook_id, topic, target_url, status, secret_last4) VALUES ('${shopId}', '${wh.id}', '${topic}', '${TARGET_URL}', '${wh.status}', '${wh.secret_last4}');`;
    execFileSync("npx", ["wrangler", "d1", "execute", "fuelnfreetime", "--remote", "--command", sql], { stdio: "inherit" });

    const envName = `COMPLETEFUL_WEBHOOK_SECRET_${topicToEnvSuffix(topic)}`;
    execFileSync("npx", ["wrangler", "secret", "put", envName], { input: wh.secret, stdio: ["pipe", "inherit", "inherit"] });
  }
}
main();
