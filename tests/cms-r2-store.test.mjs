import assert from "node:assert/strict";
import test from "node:test";

import { loadSectionsFromR2 } from "../apps/ecommerce-cms-agentsam/backend/cms/r2-store.js";

function jsonObject(value) {
  return {
    async text() {
      return JSON.stringify(value);
    },
  };
}

test("published CMS reads ignore the editable draft pointer", async () => {
  const reads = [];
  const env = {
    WEBSITE_ASSETS: {
      async get(key) {
        reads.push(key);
        if (key === "cms/pages/home/published/hero.json") {
          return jsonObject({
            status: "published",
            version: 2,
            content: { headline: "Published headline" },
          });
        }
        if (key === "cms/pages/home/draft/hero.json") {
          return jsonObject({
            status: "draft",
            version: 3,
            content: { headline: "Unpublished headline" },
          });
        }
        return null;
      },
    },
  };

  const sections = await loadSectionsFromR2(
    env,
    "home",
    [
      {
        section_key: "hero",
        sort_order: 0,
        status: "published",
        content_r2_key: "cms/pages/home/draft/hero.json",
        content_version: 3,
        content_json: "{}",
      },
    ],
    { publishedOnly: true },
  );

  assert.deepEqual(reads, ["cms/pages/home/published/hero.json"]);
  assert.equal(sections[0].content.headline, "Published headline");
  assert.equal(sections[0].status, "published");
});
