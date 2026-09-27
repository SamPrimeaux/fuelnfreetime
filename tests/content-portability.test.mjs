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

test("portable assistant and integration seams contain no customer-specific account or OAuth contract", async () => {
  const files = [
    "../apps/ecommerce-cms-agentsam/backend/lib/account-context.js",
    "../apps/ecommerce-cms-agentsam/backend/lib/integration-config.js",
    "../apps/ecommerce-cms-agentsam/backend/agentsam/mcp-client.js",
    "../apps/ecommerce-cms-agentsam/backend/admin/agentsam.js",
    "../apps/ecommerce-cms-agentsam/frontend/static/js/agentsam-page.js",
    "../apps/ecommerce-cms-agentsam/frontend/static/js/agentsam.js",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.equal(/FNF_ACCOUNT_ID|FNF_GITHUB_REPO|fnf_github_oauth|Fuel & Free Time|fuelnfreetime repo only/i.test(source), false, file);
  }
});

test("auth and team implementation do not embed customer account identity", async () => {
  const files = [
    "../apps/ecommerce-cms-agentsam/backend/lib/auth.js",
    "../apps/ecommerce-cms-agentsam/backend/admin/team.js",
  ];
  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.equal(/FNF_ACCOUNT_ID|au_fnf_/i.test(source), false, file);
  }
});
