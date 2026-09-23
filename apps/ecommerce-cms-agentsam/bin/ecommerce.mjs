#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(app, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(app, "agentsam.app.json"), "utf8"));
const missing = ["apps/ecommerce-cms-agentsam/backend/index.js", "public", "apps/ecommerce-cms-agentsam/frontend/package.json", "db/schema.sql", "wrangler.toml"].filter(f => !fs.existsSync(path.join(source, f)));
const [command = "info", ...args] = process.argv.slice(2);
function scaffold(destination) {
  if (!destination) throw new Error("Provide an empty destination directory.");
  if (missing.length) throw new Error("Source unavailable: " + missing.join(", "));
  const target = path.resolve(destination);
  if (target === source || target.startsWith(source + path.sep)) throw new Error("Use a destination outside the source checkout.");
  if (fs.existsSync(target) && fs.readdirSync(target).length) throw new Error("Destination must be empty.");
  fs.mkdirSync(target, { recursive: true });
  const filter = file => !/(^|[/\\])(node_modules|\.git|\.wrangler|\.env[^/\\]*|\.dev\.vars[^/\\]*|dist|seed-[^/\\]*)($|[/\\])/.test(file);
  for (const relative of ["public", "packages", "db", "apps/ecommerce-cms-agentsam", "docs", "package.json", "package-lock.json", "AGENTS.md", "ecommerce-cms-agentsam.md"]) {
    const from = path.join(source, relative);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(target, relative), { recursive: true, filter });
  }
  fs.mkdirSync(path.join(target, "scripts"), { recursive: true });
  for (const name of ["sync-app-frontend.mjs", "guard-boundaries.mjs"]) fs.copyFileSync(path.join(source, "scripts", name), path.join(target, "scripts", name));
  let config = fs.readFileSync(path.join(source, "wrangler.toml"), "utf8")
    .replace(/^name = .+$/m, 'name = "my-ecommerce"')
    .replace(/\[\[routes\]\][\s\S]*?(?=\[\[|\[[a-z]|$)/g, "")
    .replace(/^(database_id|id) = "[^"]*"/gm, '$1 = "REPLACE_WITH_YOUR_RESOURCE_ID"')
    .replace(/^database_name = .+$/m, 'database_name = "my-ecommerce"')
    .replace(/^bucket_name = .+$/m, 'bucket_name = "my-ecommerce"')
    .replace(/^APP_NAME = .+$/m, 'APP_NAME = "My Store"')
    .replace(/^APP_DOMAIN = .+$/m, 'APP_DOMAIN = "localhost"')
    .replace(/^ALLOWED_ORIGINS = .+$/m, 'ALLOWED_ORIGINS = "http://localhost:8787"')
    .replace(/^FNF_GITHUB_(REPO|CLIENT_ID) = .+$/gm, "")
    .replace(/^RESEND_FROM = .+$/m, 'RESEND_FROM = "Configure a verified sender"');
  fs.writeFileSync(path.join(target, "wrangler.toml"), config);
  fs.writeFileSync(path.join(target, ".gitignore"), "node_modules/\napps/ecommerce-cms-agentsam/frontend/node_modules/\n.wrangler/\n.env*\n.dev.vars*\n");
  const pkgPath = path.join(target, "package.json"), pkg = JSON.parse(fs.readFileSync(pkgPath));
  pkg.name = "my-ecommerce";
  pkg.scripts = {
    "app:frontend:sync": "node scripts/sync-app-frontend.mjs",
    "dev": "npm run build && wrangler dev",
    "build": "npm run build --prefix apps/ecommerce-cms-agentsam/frontend && npm run app:frontend:sync",
    "deploy": "npm run build && wrangler deploy",
    "ecommerce": "node apps/ecommerce-cms-agentsam/bin/ecommerce.mjs"
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  fs.writeFileSync(path.join(target, "SETUP.md"), "# Your ecommerce app\n\nThis scaffold uses Fuel & Free Time sample branding. Replace branding before launch.\n\n1. npm install && npm install --prefix apps/ecommerce-cms-agentsam/frontend\n2. Provision D1, R2, KV and Vectorize; update wrangler.toml.\n3. Apply schema and documented migrations to your local database; create your administrator. Never import reference-installation data.\n4. Configure Stripe, Completeful, Resend and AgentSam secrets through Wrangler. Keep live fulfillment writes disabled until tested.\n5. npm run build && npm run dev\n\nDoctor checks source presence, not credentials, schema readiness or payment/fulfillment. See product release gates.\n");
  console.log("Scaffold created: " + target + "\nRead SETUP.md before running or deploying.");
}
try {
  if (command === "info") console.log(JSON.stringify(manifest, null, 2));
  else if (command === "doctor") {
    console.log(JSON.stringify({ app: manifest.id, source, missing, source_ready: !missing.length, deployment_ready: false }, null, 2));
    if (missing.length) process.exitCode = 1;
  } else if (command === "scaffold") scaffold(args[0]);
  else if (command === "preview") {
    if (missing.length) throw new Error("Run doctor first.");
    const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev", "--", ...args], { cwd: source, stdio: "inherit" });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } else if (["help", "--help", "-h"].includes(command)) console.log("ecommerce info | doctor | preview | scaffold <empty-directory>");
  else throw new Error("Unknown ecommerce command: " + command);
} catch (error) { console.error(error.message); process.exitCode = 1; }
