import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogImageSource,
  serveCatalogImage,
} from "../apps/ecommerce-cms-agentsam/backend/completeful/images.js";

const PROVIDER_IMAGE =
  "https://jvkydnvdajcfnqysmuwt.supabase.co/storage/v1/object/public/product-images/sample.jpg";

test("catalog image proxy rejects arbitrary external origins", () => {
  assert.equal(catalogImageSource("https://example.com/image.jpg"), null);
});

test("catalog image proxy requests a physical derivative and format-safe cache key", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousCaches = globalThis.caches;
  let requestOptions = null;
  let cachedRequest = null;

  globalThis.caches = {
    default: {
      match: async (request) => {
        cachedRequest = request;
        return undefined;
      },
      put: async () => {},
    },
  };

  globalThis.fetch = async (_url, options) => {
    requestOptions = options;
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/avif" },
    });
  };

  t.after(() => {
    globalThis.fetch = previousFetch;
    globalThis.caches = previousCaches;
  });

  const request = new Request(
    "https://fuelnfreetime.com/catalog-image?w=320&src=" + encodeURIComponent(PROVIDER_IMAGE),
    { headers: { accept: "image/avif,image/webp,image/*" } },
  );
  const pending = [];
  const response = await serveCatalogImage(request, {}, {
    waitUntil(promise) {
      pending.push(promise);
    },
  });
  await Promise.all(pending);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-catalog-image"), "optimized");
  assert.equal(response.headers.get("x-catalog-width"), "320");
  assert.equal(response.headers.get("vary"), "Accept");
  assert.equal(requestOptions.cf.image.width, 320);
  assert.equal(requestOptions.cf.image.fit, "scale-down");
  assert.equal(requestOptions.cf.image.format, "avif");
  assert.match(cachedRequest.url, /[?&]w=320(?:&|$)/);
  assert.match(cachedRequest.url, /[?&]fmt=avif(?:&|$)/);
});
