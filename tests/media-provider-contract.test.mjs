import assert from "node:assert/strict";
import test from "node:test";

import {
  createMediaProviderRegistry,
  mediaSourceFromRow,
  normalizeMediaProviderAdapter,
} from "../apps/ecommerce-cms-agentsam/backend/media/provider-contract.js";

test("media provider registry has no mandatory vendor", () => {
  const registry = createMediaProviderRegistry([
    {
      id: "local",
      roles: ["source", "delivery"],
      capabilities: ["list", "read", "write", "delete"],
    },
  ]);

  assert.equal(registry.resolve({ role: "source" })?.id, "local");
  assert.equal(registry.resolve({ role: "transform" }), null);
  assert.equal(registry.resolve({ capability: "transform" }), null);
});

test("storage and transform providers can be composed independently", () => {
  const registry = createMediaProviderRegistry([
    {
      id: "google_drive",
      roles: ["source"],
      capabilities: ["list", "read", "write"],
    },
    {
      id: "cf_images",
      roles: ["transform", "delivery"],
      capabilities: ["transform", "variants", "public_url"],
    },
  ]);

  assert.equal(registry.resolve({ role: "source" })?.id, "google_drive");
  assert.equal(registry.resolve({ role: "transform", capability: "transform" })?.id, "cf_images");
  assert.equal(registry.resolve({ id: "google_drive", capability: "transform" }), null);
});

test("R2-only deployments remain valid without Cloudflare Images", () => {
  const registry = createMediaProviderRegistry([
    {
      id: "r2",
      roles: ["source", "delivery"],
      capabilities: ["list", "read", "write", "delete", "public_url"],
    },
  ]);

  assert.equal(registry.resolve({ role: "source" })?.id, "r2");
  assert.equal(registry.resolve({ role: "delivery", capability: "public_url" })?.id, "r2");
  assert.equal(registry.resolve({ role: "transform" }), null);
});

test("legacy rows expose a provider-neutral source descriptor", () => {
  assert.deepEqual(
    mediaSourceFromRow({ r2_key: "images/a.webp", url: "/media/images/a.webp" }),
    {
      provider: "r2",
      key: "images/a.webp",
      asset_id: null,
      url: "/media/images/a.webp",
    }
  );

  assert.deepEqual(
    mediaSourceFromRow({
      r2_key: "legacy-placeholder",
      url: "https://example.test/image",
      meta_json: JSON.stringify({
        storage: {
          provider: "google_drive",
          asset_id: "drive-file-123",
        },
      }),
    }),
    {
      provider: "google_drive",
      key: null,
      asset_id: "drive-file-123",
      url: "https://example.test/image",
    }
  );
});

test("provider adapters reject unknown-only roles", () => {
  assert.throws(
    () => normalizeMediaProviderAdapter({ id: "bad", roles: ["magic"], capabilities: [] }),
    /at least one role/
  );
});
