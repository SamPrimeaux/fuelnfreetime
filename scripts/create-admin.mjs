#!/usr/bin/env node
/**
 * Create or update an auth_users row in remote D1.
 * Usage: node scripts/create-admin.mjs <email> <password> [role] [display_name]
 * Or:    ADMIN_EMAIL=... ADMIN_PASSWORD=... AUTH_DISPLAY_NAME=... node scripts/create-admin.mjs
 */
import { webcrypto as crypto } from "node:crypto";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ITERATIONS = 100000;
const TENANT_ID = "tenant_fuelnfreetime";
const WORKSPACE_ID = "ws_fuelnfreetime";

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function pbkdf2(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(bits);
}

async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toHex(saltBytes);
  const hash = await pbkdf2(password, saltBytes);
  return { hash, salt };
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function newAuthUserId() {
  return `au_fnf_${toHex(crypto.getRandomValues(new Uint8Array(8)))}`;
}

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";
const role = (process.argv[4] || process.env.AUTH_ROLE || "admin").trim().toLowerCase();
const displayName = (process.argv[5] || process.env.AUTH_DISPLAY_NAME || "").trim();

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [role] [display_name]");
  process.exit(1);
}

const { hash, salt } = await hashPassword(password);
const id = newAuthUserId();
const resolvedDisplayName = displayName || email.split("@")[0];

const sql = `-- generated auth user (do not commit)
INSERT INTO auth_users (
  id, email, name, password_hash, salt, tenant_id, role, display_name,
  active_tenant_id, active_workspace_id, default_workspace_id,
  is_verified, verified_at, status, timezone, account_type, updated_at
) VALUES (
  '${sqlEscape(id)}',
  '${sqlEscape(email)}',
  '${sqlEscape(resolvedDisplayName)}',
  '${sqlEscape(hash)}',
  '${sqlEscape(salt)}',
  '${TENANT_ID}',
  '${sqlEscape(role)}',
  '${sqlEscape(resolvedDisplayName)}',
  '${TENANT_ID}',
  '${WORKSPACE_ID}',
  '${WORKSPACE_ID}',
  1,
  unixepoch(),
  'active',
  'America/Chicago',
  'human',
  datetime('now')
)
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  salt = excluded.salt,
  role = excluded.role,
  name = excluded.name,
  display_name = excluded.display_name,
  updated_at = datetime('now');
`;

const root = dirname(fileURLToPath(import.meta.url));
const tmp = join(root, "..", "db", ".seed-admin-tmp.sql");
writeFileSync(tmp, sql);

try {
  execSync(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=${tmp}`, {
    stdio: "inherit",
    cwd: join(root, ".."),
  });
  console.log(`Auth user ready: ${email} (role=${role}, display_name=${resolvedDisplayName})`);
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
