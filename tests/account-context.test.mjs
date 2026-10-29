import test from "node:test";
import assert from "node:assert/strict";
import { resolveApplicationAccountId } from "../apps/ecommerce-cms-agentsam/backend/lib/account-context.js";

function envWithAccounts(rows) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                if (!sql.includes("WHERE id = ?")) return null;
                return rows.find((row) => row.id === args[0] && row.status === "active") || null;
              },
            };
          },
          async all() {
            if (sql.includes("meta_json") && rows.noMetaJson) {
              throw new Error("no such column: meta_json");
            }
            return {
              results: rows
                .filter((row) => row.status === "active")
                .filter((row) => !sql.includes("app_owner") || row.app_owner === true)
                .slice(0, 2)
                .map((row) => ({ id: row.id })),
            };
          },
        };
      },
    },
  };
}

test("implicit account resolution returns the sole active application account", async () => {
  const id = await resolveApplicationAccountId(
    envWithAccounts([{ id: "acct_real", status: "active" }]),
  );
  assert.equal(id, "acct_real");
});

test("implicit account resolution fails closed when multiple accounts are active", async () => {
  await assert.rejects(
    resolveApplicationAccountId(
      envWithAccounts([
        { id: "acct_a", status: "active" },
        { id: "acct_b", status: "active" },
      ]),
    ),
    /application_account_ambiguous/,
  );
});

test("implicit resolution picks the app_owner account among many active people accounts", async () => {
  const id = await resolveApplicationAccountId(
    envWithAccounts([
      { id: "au_staff", status: "active" },
      { id: "au_owner", status: "active", app_owner: true },
      { id: "au_dev", status: "active" },
    ]),
  );
  assert.equal(id, "au_owner");
});

test("implicit resolution fails closed when more than one account is flagged app_owner", async () => {
  await assert.rejects(
    resolveApplicationAccountId(
      envWithAccounts([
        { id: "au_a", status: "active", app_owner: true },
        { id: "au_b", status: "active", app_owner: true },
      ]),
    ),
    /application_account_ambiguous/,
  );
});

test("implicit resolution falls back to the sole active account on a schema without meta_json", async () => {
  const rows = [{ id: "acct_real", status: "active" }];
  rows.noMetaJson = true;
  assert.equal(await resolveApplicationAccountId(envWithAccounts(rows)), "acct_real");
});

test("explicit account resolution verifies the requested active account", async () => {
  const env = envWithAccounts([
    { id: "acct_a", status: "active" },
    { id: "acct_b", status: "active" },
  ]);
  assert.equal(await resolveApplicationAccountId(env, "acct_b"), "acct_b");
  assert.equal(await resolveApplicationAccountId(env, "missing"), null);
});
