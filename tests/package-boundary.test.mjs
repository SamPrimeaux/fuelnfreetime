import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("no secret-header internal asset/compaction routes in Worker", () => {
  const index = read("apps/ecommerce-cms-agentsam/backend/index.js");
  assert.equal(index.includes("/api/internal/assets/jobs"), false);
  assert.equal(index.includes("/api/internal/agentsam/compaction"), false);
  assert.equal(index.includes("FNF_ASSET_JOB_SECRET"), false);
  assert.equal(index.includes("AGENTSAM_COMPACTION_SECRET"), false);
  assert.equal(index.includes("X-Fnf-Asset-Job-Secret"), false);
  assert.match(index, /async queue\(/);
  assert.match(index, /staleOnly:\s*true/);
});

test("admin ops expose retry + compaction under session routes", () => {
  const api = read("apps/ecommerce-cms-agentsam/backend/admin/api.js");
  assert.ok(api.includes("retryAssetJob"));
  assert.ok(api.includes("runAdminCompaction"));
  assert.ok(api.includes("maintenance/compact"));
  const ops = read("apps/ecommerce-cms-agentsam/backend/admin/ops.js");
  assert.ok(ops.includes("enqueueAssetJob"));
  assert.ok(ops.includes("runAgentsamCompaction"));
});

test("store.js has no Fuel customer fixtures", () => {
  const src = read("apps/ecommerce-cms-agentsam/backend/admin/store.js");
  assert.equal(/Fuel & Free Time|Lafayette|#ff4500|#E5A558|fnf-copy|Garage Dark|DRAFT_THEMES/.test(src), false);
  assert.equal(src.includes("storePassword = String"), false);
  assert.match(src, /storePasswordHash/);
  assert.match(src, /hashPassword/);
  assert.match(src, /store_settings_write_failed/);
  assert.match(src, /unavailable/);
});

test("site-nav package defaults are brand-neutral", () => {
  const src = read("apps/ecommerce-cms-agentsam/backend/lib/site-nav.js");
  assert.equal(/#ff4500|#E5A558|imagedelivery\.net/.test(src), false);
  assert.match(src, /DEFAULT_NAV_ITEMS/);
});

test("route redirects compile from route-manifest", () => {
  const routes = read("apps/ecommerce-cms-agentsam/backend/lib/routes.js");
  const admin = read("apps/ecommerce-cms-agentsam/backend/lib/admin-routes.js");
  assert.match(routes, /route-manifest/);
  assert.match(admin, /route-manifest/);
  assert.match(read("apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js"), /STORE_ROUTES|ADMIN_ROUTES/);
});

test("D1 is preferences SSOT — KV write-only after D1 success", async () => {
  const { loadStorePreferences, PACKAGE_STORE_DEFAULTS } = await import(
    "../apps/ecommerce-cms-agentsam/backend/admin/store.js"
  );
  assert.equal(PACKAGE_STORE_DEFAULTS.homeTitle, "");
  assert.equal(PACKAGE_STORE_DEFAULTS.navBrandAccent, "");

  let d1Writes = 0;
  let kvPuts = 0;
  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            return { settings_json: JSON.stringify({ homeTitle: "Acme" }) };
          },
          async run() {
            d1Writes += 1;
            return { success: true };
          },
        };
      },
    },
    CMS_CACHE: {
      async get() {
        return null;
      },
      async put() {
        kvPuts += 1;
      },
    },
  };
  const loaded = await loadStorePreferences(env);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.settings.homeTitle, "Acme");
  assert.ok(kvPuts >= 1);

  // Failed D1 must not fall back to KV as writable SSOT
  const failEnv = {
    DB: {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            throw new Error("no such table: store_settings");
          },
        };
      },
    },
    CMS_CACHE: {
      async get() {
        return { homeTitle: "from-kv-only" };
      },
      async put() {},
    },
  };
  const failed = await loadStorePreferences(failEnv, { allowCache: false });
  assert.equal(failed.ok, false);
  assert.equal(failed.error, "store_settings_not_configured");
});

test("CLI and compact scripts no longer require invented secrets", () => {
  const cli = read("apps/ecommerce-cms-agentsam/bin/assets.mjs");
  const compact = read("scripts/agentsam-compact.mjs");
  assert.equal(cli.includes("X-Fnf-Asset-Job-Secret"), false);
  assert.equal(compact.includes("X-Agentsam-Compaction-Secret"), false);
  assert.equal(cli.includes("/api/internal/assets"), false);
  assert.equal(compact.includes("/api/internal/agentsam/compaction"), false);
  assert.ok(cli.includes("FNF_ADMIN_SESSION_COOKIE"));
  assert.ok(compact.includes("maintenance/compact"));
});
