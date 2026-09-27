import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { newAuthUserId } from "../apps/ecommerce-cms-agentsam/backend/lib/auth.js";

test("new auth user ids are deployment-neutral", () => {
  const id = newAuthUserId();
  assert.match(id, /^au_[0-9a-f]{16}$/);
  assert.equal(id.startsWith("au_fnf_"), false);
});

test("auth session and team provisioning use application account authority", async () => {
  const auth = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/backend/lib/auth.js", import.meta.url),
    "utf8",
  );
  const team = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/backend/admin/team.js", import.meta.url),
    "utf8",
  );

  assert.match(auth, /resolveApplicationAccountId\(env, explicitAccountId\)/);
  assert.equal(auth.includes("FNF_ACCOUNT_ID"), false);

  assert.match(team, /FROM account_memberships m/);
  assert.match(team, /WHERE m\.account_id = \?/);
  assert.equal(team.includes("FNF_ACCOUNT_ID"), false);
});

test("legacy cookie is retained only as an explicit compatibility contract", async () => {
  const auth = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/backend/lib/auth.js", import.meta.url),
    "utf8",
  );
  assert.match(auth, /const COOKIE_NAME = "fnf_admin_session"/);
});
