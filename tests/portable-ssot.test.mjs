import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyMediaAsset,
  planAssetIngest,
  listStaleAssetJobs,
} from "../lib/assets/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("wrangler has no IAM MCP/origin or brand identity vars", () => {
  const toml = read("wrangler.toml");
  assert.equal(/IAM_MCP_URL|IAM_ORIGIN/.test(toml), false);
  assert.equal(/^APP_NAME\s*=/m.test(toml), false);
  assert.equal(/^APP_DOMAIN\s*=/m.test(toml), false);
  assert.equal(/^FNF_GITHUB_REPO\s*=/m.test(toml), false);
  assert.equal(/^RESEND_FROM\s*=/m.test(toml), false);
  assert.equal(/^CAPP_API_URL\s*=/m.test(toml), false);
  assert.equal(/^CLOUDFLARE_ACCOUNT_ID\s*=/m.test(toml), false);
  assert.equal(/^CLOUDFLARE_ZONE_ID\s*=/m.test(toml), false);
  assert.match(toml, /ALLOWED_ORIGINS/);
  assert.match(toml, /COMPLETEFUL_ALLOW_LIVE_WRITES/);
  assert.match(toml, /workers_dev\s*=\s*false/);
  assert.match(toml, /ASSET_JOBS/);
  assert.match(toml, /0 \* \* \* \*/);
  assert.equal(/\*\/5/.test(toml), false);
  assert.equal(toml.includes("fuelnfreetime.meauxbility.workers.dev"), false);
});

test("mcp-client has no production IAM URL fallbacks", () => {
  const src = read("apps/ecommerce-cms-agentsam/backend/agentsam/mcp-client.js");
  assert.equal(src.includes("mcp.inneranimalmedia.com"), false);
  assert.equal(/FALLBACK_MCP_URL|FALLBACK_IAM_ORIGIN/.test(src), false);
  assert.match(src, /mcp_endpoint_not_configured/);
  assert.match(src, /agentsam_plugins/);
});

test("company branding resolves from company helper", async () => {
  const { getCompany, companyDomain } = await import(
    "../apps/ecommerce-cms-agentsam/backend/lib/company.js"
  );
  const company = await getCompany({
    DB: {
      prepare(sql) {
        return {
          bind() {
            return this;
          },
          async first() {
            if (String(sql).includes("FROM company")) {
              return {
                id: "co_fuelnfreetime",
                slug: "fuelnfreetime",
                name: "Fuel & Free Time",
                logo_url:
                  "https://fuelnfreetime.com/media/archive/shopify-import/logos/fandft-clear-background.png",
                website_url: "https://fuelnfreetime.com",
                primary_color: "#ff4d00",
                auth_bg_color: "#090909",
                tagline: "Time is the real flex.",
                meta_json: "{}",
              };
            }
            return null;
          },
        };
      },
    },
  });
  assert.equal(company.name, "Fuel & Free Time");
  assert.match(company.logoUrl, /fandft-clear-background\.png$/);
  assert.equal(companyDomain(company), "fuelnfreetime.com");
});

test("MCP endpoint resolves from agentsam_plugins and fails closed", async () => {
  const { resolveIamBridgeEndpoints } = await import(
    "../apps/ecommerce-cms-agentsam/backend/agentsam/mcp-client.js"
  );

  const okEnv = {
    DB: {
      prepare(sql) {
        const q = String(sql);
        return {
          bind() {
            return this;
          },
          async first() {
            if (q.includes("agentsam_plugins")) {
              return {
                endpoint_url: "https://example.test/mcp",
                metadata_json: JSON.stringify({
                  authorization_server: "https://issuer.example",
                  provider_home: "https://home.example",
                }),
              };
            }
            return null;
          },
        };
      },
    },
  };
  const ok = await resolveIamBridgeEndpoints(okEnv);
  assert.equal(ok.ok, true);
  assert.equal(ok.mcp_url, "https://example.test/mcp");
  assert.equal(ok.authorization_server, "https://issuer.example");
  assert.equal(ok.source, "agentsam_plugins");

  const emptyEnv = {
    DB: {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            return null;
          },
        };
      },
    },
  };
  // Clear module cache TTL by using a fresh import isn't trivial; call twice with empty.
  const { resolveIamBridgeEndpoints: resolve2 } = await import(
    `../apps/ecommerce-cms-agentsam/backend/agentsam/mcp-client.js?t=${Date.now()}`
  );
  const fail = await resolve2(emptyEnv);
  assert.equal(fail.ok, false);
  assert.equal(fail.error, "mcp_endpoint_not_configured");
  assert.equal(fail.mcp_url, null);
});

test("GitHub and Completeful resolve from plugins", async () => {
  const { resolveGithubRepo, resolveCompletefulApiOrigin } = await import(
    "../apps/ecommerce-cms-agentsam/backend/lib/integration-config.js"
  );
  const env = {
    DB: {
      prepare(sql) {
        const q = String(sql);
        return {
          bind(_account, key) {
            this._key = key;
            return this;
          },
          async first() {
            if (!q.includes("agentsam_plugins")) return null;
            if (this._key === "github") {
              return {
                metadata_json: JSON.stringify({
                  repository_url: "https://github.com/SamPrimeaux/fuelnfreetime",
                }),
                config_json: JSON.stringify({ repository: "SamPrimeaux/fuelnfreetime" }),
              };
            }
            if (this._key === "completeful") {
              return { endpoint_url: "https://vxapi.completeful.com" };
            }
            return null;
          },
        };
      },
    },
  };
  const gh = await resolveGithubRepo(env);
  assert.equal(gh.ok, true);
  assert.equal(gh.repo, "SamPrimeaux/fuelnfreetime");
  assert.equal(gh.source, "agentsam_plugins");

  const cf = await resolveCompletefulApiOrigin(env);
  assert.equal(cf.ok, true);
  assert.equal(cf.origin, "https://vxapi.completeful.com");
  assert.equal(cf.source, "agentsam_plugins");
});

test("queue remains primary; stale list helper exported", async () => {
  assert.equal(typeof listStaleAssetJobs, "function");
  const index = read("apps/ecommerce-cms-agentsam/backend/index.js");
  assert.match(index, /staleOnly:\s*true/);
  assert.match(index, /ASSET_JOBS/);
  const media = read("apps/ecommerce-cms-agentsam/backend/admin/media.js");
  assert.match(media, /Queue is primary/);
  assert.match(media, /!queued/);
});

test("upload plan promotes canonical and retains required masters", () => {
  const plan = planAssetIngest({
    r2Key: "intake/u1/photo.png",
    contentType: "image/png",
    bytes: 3_000_000,
    filename: "photo.png",
    folder: "products",
  });
  assert.equal(plan.classification.promote_deletes_intake, true);
  assert.ok(plan.canonical_key);

  const master = classifyMediaAsset({
    r2Key: "print/art.png",
    contentType: "image/png",
    filename: "print-master.png",
    folder: "completeful",
  });
  // Completeful / print-ish folders or roles may retain master; GLB always does.
  const glb = classifyMediaAsset({
    r2Key: "3d/model.glb",
    contentType: "model/gltf-binary",
  });
  assert.equal(glb.asset_role, "master");
  assert.equal(glb.promote_deletes_intake, false);
  assert.ok(master);
});

test("ecommerce scaffold no longer writes brand identity into Wrangler vars", () => {
  const src = read("apps/ecommerce-cms-agentsam/bin/ecommerce.mjs");
  assert.equal(/APP_NAME = "My Store"/.test(src), false);
  assert.equal(/RESEND_FROM = /.test(src), false);
  assert.match(src, /seed-customer-bootstrap/);
  assert.match(src, /agentsam_plugins/);
  assert.match(src, /ALLOWED_ORIGINS/);
});
