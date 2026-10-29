import test from "node:test";
import assert from "node:assert/strict";
import { loadCanonicalStoreOverview } from "../backend/admin/store.js";

function fixture(rowsByAccount) {
  const statements = [];
  const db = {
    prepare(sql) {
      statements.push(sql);
      if (/\\bFROM\\s+(?:pages|page_sections)\\b/i.test(sql)) {
        throw new Error("Legacy CMS table queried");
      }
      if (sql.includes("FROM cms_pages GROUP BY account_id")) {
        return { all: async () => ({ results: Object.keys(rowsByAccount).map(account_id => ({ account_id })) }) };
      }
      if (sql.includes("FROM cms_pages WHERE account_id = ?")) {
        return { bind: account => ({
          all: async () => ({ results: [...(rowsByAccount[account]?.pages || [])]
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }),
        }) };
      }
      if (sql.includes("FROM cms_page_sections WHERE account_id = ?")) {
        return { bind: account => ({
          first: async () => ({ last_saved: rowsByAccount[account]?.sectionLastSaved || null }),
        }) };
      }
      throw new Error("Unexpected SQL: " + sql);
    },
  };
  return { db, statements };
}

test("Online Store reads v2 pages and sections, excluding published globals from visibility", async () => {
  const { db, statements } = fixture({
    tenant_a: {
      pages: [
        { slug: "site", title: "Global settings", status: "published", page_type: "global", updated_at: "2026-10-24 12:00:00" },
        { slug: "shop", title: "Shop", status: "published", page_type: "standard", updated_at: "2026-10-26 12:00:00" },
        { slug: "home", title: "Home", status: "draft", page_type: "standard", updated_at: "2026-10-25 12:00:00" },
      ],
      sectionLastSaved: "2026-10-28 15:00:00",
    },
    tenant_b: {
      pages: [{ slug: "other", title: "Other", status: "published", page_type: "standard", updated_at: "2026-10-27 12:00:00" }],
      sectionLastSaved: "2026-10-29 12:00:00",
    },
  });
  const result = await loadCanonicalStoreOverview({ DB: db }, "tenant_a");
  assert.equal(result.accountId, "tenant_a");
  assert.equal(result.publishedCount, 1);
  assert.deepEqual(result.pages.map(p => p.slug), ["shop", "home", "site"]);
  assert.equal(result.lastSaved, "2026-10-28 15:00:00");
  assert.equal(statements.filter(s => s.includes("FROM cms_")).length, 2);
  assert.ok(statements.every(s => !/\\bFROM\\s+(?:pages|page_sections)\\b/i.test(s)));
});

test("Single-tenant Studio bridge can infer account from canonical pages", async () => {
  const { db } = fixture({ tenant_a: {
    pages: [{ slug: "home", title: "Home", status: "draft", page_type: "standard", updated_at: "2026-10-28 12:00:00" }],
  } });
  const result = await loadCanonicalStoreOverview({ DB: db });
  assert.equal(result.accountId, "tenant_a");
  assert.equal(result.publishedCount, 0);
  assert.equal(result.lastSaved, "2026-10-28 12:00:00");
});

test("Ambiguous or empty account scope fails closed without legacy fallback", async () => {
  for (const accounts of [{}, { a: {}, b: {} }]) {
    const { db } = fixture(accounts);
    await assert.rejects(() => loadCanonicalStoreOverview({ DB: db }), /store_overview_account_scope_required/);
  }
});
