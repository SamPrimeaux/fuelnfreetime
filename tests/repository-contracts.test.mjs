import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = new URL("../", import.meta.url).pathname;
const TOOL = join(ROOT, "apps/ecommerce-cms-agentsam/bin/repository-contracts.mjs");
const run = (...args) => execFileSync(process.execPath, ["--no-warnings", TOOL, ...args], { cwd: ROOT, encoding: "utf8" });

const CONTRACTS_TABLE = `CREATE TABLE agentsam_repository_contracts (id TEXT PRIMARY KEY DEFAULT ('rct_' || lower(hex(randomblob(8)))),account_id TEXT NOT NULL,repository_id TEXT NOT NULL,contract_key TEXT NOT NULL,contract_version TEXT NOT NULL,contract_type TEXT NOT NULL CHECK(contract_type IN ('api','schema','runtime','cli','event','receipt','package','data')),name TEXT NOT NULL,description TEXT,manifest_path TEXT,contract_hash TEXT,status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deprecated','retired')),metadata_json TEXT NOT NULL DEFAULT '{}',created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()),UNIQUE(repository_id,contract_key,contract_version))`;
const REPOS_TABLE = `CREATE TABLE code_repositories (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider TEXT NOT NULL, name TEXT NOT NULL)`;

function seedDb({ registered }) {
  const db = new DatabaseSync(":memory:");
  db.exec(REPOS_TABLE);
  db.exec(CONTRACTS_TABLE);
  if (registered) db.prepare("INSERT INTO code_repositories (id, account_id, provider, name) VALUES (?, ?, 'github', 'x')").run(registered.id, registered.account);
  return db;
}

test("no fabricated account ids or identity env vars anywhere in the contract path", () => {
  const files = [
    "package.json",
    "apps/ecommerce-cms-agentsam/bin/repository-contracts.mjs",
    // Historical 20260923 migrations legitimately mention the retired id they migrate away from.
    ...readdirSync(join(ROOT, "db")).filter((f) => f.startsWith("seed-") && f.endsWith(".sql")).map((f) => `db/${f}`),
  ];
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), "utf8");
    assert.doesNotMatch(text, /acct_fuelnfreetime/, `${f} hardcodes a fabricated account id`);
    assert.doesNotMatch(text, /AGENTSAM_REPOSITORY_(ACCOUNT_)?ID/, `${f} reads identity from env`);
  }
});

test("registry is valid and every pinned file exists and parses", () => {
  const result = JSON.parse(run("verify"));
  assert.equal(result.ok, true, result.problems.join("; "));
  assert.ok(result.contracts >= 11);
});

test("committed seed SQL matches the registry and the pinned files (drift gate)", () => {
  const committed = readFileSync(join(ROOT, "db/seed-agentsam-repository-contracts.generated.sql"), "utf8");
  const repositoryId = committed.match(/WHERE r\.id = '([^']+)'/)[1];
  const out = join(mkdtempSync(join(tmpdir(), "rc-")), "seed.sql");
  run("generate", "--repository-id", repositoryId, "--output", out);
  assert.equal(readFileSync(out, "utf8"), committed, "run: npm run agentsam:repository-contracts:generate");
});

test("generated SQL binds account_id from code_repositories, is idempotent, and seeds nothing for an unregistered repo", () => {
  const repositoryId = "github:acme/widgets";
  const out = join(mkdtempSync(join(tmpdir(), "rc-")), "seed.sql");
  const { contracts } = JSON.parse(run("generate", "--repository-id", repositoryId, "--output", out));
  const sql = readFileSync(out, "utf8");

  const db = seedDb({ registered: { id: repositoryId, account: "au_real" } });
  db.exec(sql);
  db.exec(sql);
  const rows = db.prepare("SELECT account_id, repository_id, contract_hash FROM agentsam_repository_contracts").all();
  assert.equal(rows.length, contracts);
  assert.ok(rows.every((r) => r.account_id === "au_real" && r.repository_id === repositoryId && /^[0-9a-f]{64}$/.test(r.contract_hash)));

  const empty = seedDb({ registered: null });
  empty.exec(sql);
  assert.equal(empty.prepare("SELECT count(*) AS n FROM agentsam_repository_contracts").get().n, 0);
});
