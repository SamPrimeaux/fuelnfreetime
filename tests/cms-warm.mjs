import assert from "node:assert/strict";
import { warmAllCmsPages } from "../apps/ecommerce-cms-agentsam/backend/cms/deploy.js";

const statuses = {
  site: "published",
  home: "published",
  shop: "draft",
  about: "published",
  community: "published",
};
const written = [];
const result = await warmAllCmsPages({}, {
  readStatus: async (_env, slug) => ({ status: statuses[slug] }),
  writeSnapshot: async (_env, slug) => {
    written.push(slug);
    return { slug, sections: [{}] };
  },
});

assert.equal(result.ok, true);
assert.equal(result.warmed_count, 4);
assert.equal(result.skipped_count, 1);
assert.equal(result.error_count, 0);
assert.deepEqual(written.sort(), ["about", "community", "home", "site"]);
assert.deepEqual(
  result.warmed.find((row) => row.slug === "shop"),
  { slug: "shop", ok: true, skipped: true, reason: "status:draft" }
);

const missing = await warmAllCmsPages({}, {
  readStatus: async (_env, slug) => (slug === "shop" ? null : { status: "published" }),
  writeSnapshot: async (_env, slug) => ({ slug, sections: [{}] }),
});
assert.equal(missing.ok, false);
assert.equal(missing.error_count, 1);
assert.equal(missing.warmed.find((row) => row.slug === "shop").error, "Page not found");

console.log("CMS warm status handling passed");
