import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const reusableFiles = [
  "../apps/ecommerce-cms-agentsam/backend/lib/company.js",
  "../apps/ecommerce-cms-agentsam/backend/admin/brand.js",
  "../apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js",
];

test("portable company and Brand implementation contains no customer identity constants", async () => {
  for (const file of reusableFiles) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.equal(/fuelnfreetime|fuel\s*&\s*free\s*time|\bFNF_/i.test(source), false, file);
  }
});
