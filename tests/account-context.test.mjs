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
            return {
              results: rows
                .filter((row) => row.status === "active")
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

test("explicit account resolution verifies the requested active account", async () => {
  const env = envWithAccounts([
    { id: "acct_a", status: "active" },
    { id: "acct_b", status: "active" },
  ]);
  assert.equal(await resolveApplicationAccountId(env, "acct_b"), "acct_b");
  assert.equal(await resolveApplicationAccountId(env, "missing"), null);
});
