#!/usr/bin/env node
/**
 * Create or update an admin user in remote D1.
 * Usage: node scripts/create-admin.mjs <email> <password>
 * Or:    ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create-admin.mjs
 */
import { webcrypto as crypto } from "node:crypto";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ITERATIONS = 100000;

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

const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || "";

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const { hash, salt } = await hashPassword(password);
const sql = `-- generated admin user (do not commit)
INSERT INTO admin_users (email, password_hash, password_salt)
VALUES ('${sqlEscape(email)}', '${sqlEscape(hash)}', '${sqlEscape(salt)}')
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;
`;

const root = dirname(fileURLToPath(import.meta.url));
const tmp = join(root, "..", "db", ".seed-admin-tmp.sql");
writeFileSync(tmp, sql);

try {
  execSync(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=${tmp}`, {
    stdio: "inherit",
    cwd: join(root, ".."),
  });
  console.log(`Admin user ready: ${email}`);
} finally {
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}
