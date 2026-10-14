import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { inviteTeamMember, canGrantRole } from "../apps/ecommerce-cms-agentsam/backend/admin/team.js";

// An invite creates a new person. It must never rewrite an existing login or mint a role above the inviter's.
function fakeEnv({ existingUser = null } = {}) {
  const batches = [];
  const writes = [];
  return {
    batches,
    writes,
    DB: {
      prepare(sql) {
        return {
          sql,
          args: [],
          bind(...a) { this.args = a; return this; },
          async first() {
            if (/FROM accounts WHERE id = \?/.test(sql)) return { id: "acct_test" };
            if (/FROM auth_users WHERE email/.test(sql)) return existingUser;
            return null;
          },
          async run() { writes.push(sql); return {}; },
        };
      },
      async batch(stmts) { batches.push(stmts); return []; },
    },
  };
}
const post = (body) => new Request("https://store.test/api/admin/team/invite", { method: "POST", body: JSON.stringify(body) });
const base = { email: "teammate@store.test", password: "longenough", display_name: "Teammate" };

test("an admin cannot grant owner, and an unknown role is rejected", async () => {
  const env = fakeEnv();
  const admin = { role: "admin", account_id: "acct_test" };
  assert.equal((await inviteTeamMember(post({ ...base, role: "owner" }), env, admin)).status, 403);
  assert.equal((await inviteTeamMember(post({ ...base, role: "superuser" }), env, admin)).status, 400);
  assert.equal(env.batches.length + env.writes.length, 0);
});

test("inviting an existing email is a 409 and writes nothing", async () => {
  const env = fakeEnv({ existingUser: { id: "au_existing" } });
  const res = await inviteTeamMember(post(base), env, { role: "admin", account_id: "acct_test" });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "user_already_exists");
  assert.equal(env.batches.length + env.writes.length, 0);
});

test("role grants never exceed the inviter's own role", () => {
  assert.equal(canGrantRole("admin", "member"), true);
  assert.equal(canGrantRole("admin", "admin"), true);
  assert.equal(canGrantRole("admin", "owner"), false);
  assert.equal(canGrantRole("member", "viewer"), true);
  assert.equal(canGrantRole("owner", "owner"), true);
  assert.equal(canGrantRole("owner", "root"), false);
});

test("team.js has no upsert that can overwrite an existing login", () => {
  const src = fs.readFileSync(new URL("../apps/ecommerce-cms-agentsam/backend/admin/team.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /ON CONFLICT\(email\)/);
});
