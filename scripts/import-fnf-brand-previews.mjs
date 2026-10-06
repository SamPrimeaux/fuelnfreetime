#!/usr/bin/env node
/**
 * FNF identity review-pack importer. Dry-run by default, idempotent with --apply.
 * Source masters remain versioned in docs; only transparent PNG previews are
 * uploaded to the existing FNF R2/D1 media library and grouped into one album.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = "docs/brand/fnf/identity/artwork/v1/extracted/FNF_Logo_Masters_v1/02_Transparent_PNG";
const directory = path.join(root, sourceRelative);
const albumSlug = "fnf-identity-review-v1";
const albumName = "FNF Identity — Review v1";
const variantNames = [
  ["01_Heritage_White_Red_3000px.png", "Heritage white/red"],
  ["02_Heritage_One_Ink_White_3000px.png", "Heritage one-ink white"],
  ["03_Outline_Racing_Red_3000px.png", "Outline racing red"],
  ["04_Clean_Shield_White_3000px.png", "Clean shield white"],
  ["05_Clean_Shield_Black_3000px.png", "Clean shield black"],
  ["06_Clean_Shield_Gold_3000px.png", "Clean shield gold"],
];
const assets = variantNames.map(([filename, name], position) => {
  const source = path.join(directory, filename);
  const bytes = fs.readFileSync(source);
  return {
    filename, name, source, position,
    r2Key: `intake/brand/fnf/identity/v1/${filename}`,
    size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});
const apply = process.argv.includes("--apply");
const quote = (value) => "'" + String(value).replace(/'/g, "''") + "'";
const execute = (...args) => {
  const r = spawnSync(path.join(root, "scripts/with-cf-admin-env.sh"), ["npx", "wrangler", ...args], {
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) {
    // Do not print environment or credentials; Wrangler's command errors only.
    throw new Error(`Wrangler ${args[0]} ${args[1] || ""} failed (exit ${r.status}): ${(r.stderr || r.stdout || "").slice(-1200)}`);
  }
  return r.stdout;
};

console.log(`${apply ? "APPLY" : "DRY RUN"} — ${albumName}`);
assets.forEach((a) => console.log(`${a.r2Key} | ${a.size} bytes | SHA256 ${a.sha256.slice(0, 12)}…`));
if (!apply) {
  console.log("No remote writes. Pass --apply to upload originals as review-only gallery previews.");
  process.exit(0);
}

for (const a of assets) {
  console.log(`Uploading ${a.filename} to FNF R2…`);
  execute("r2", "object", "put", `fuelnfreetime/${a.r2Key}`, "--remote", "--file", a.source, "--content-type", "image/png");
}

const sql = [];
sql.push("INSERT OR IGNORE INTO media_albums(slug,name,description,meta_json) VALUES (" +
  [albumSlug, albumName, "Working FNF brand logo reconstruction previews. Not approved for production or publication.", JSON.stringify({kind:"album", brand:"FNF", approval_status:"review", source:"versioned-brand-artwork-v1"})].map(quote).join(",") + ");");
for (const a of assets) {
  const meta = {brand:"FNF", approval_status:"review", asset_role:"identity-preview", master_source:`${sourceRelative}/${a.filename}`, source_sha256:a.sha256, production_approved:false};
  sql.push("INSERT OR IGNORE INTO media_assets(r2_key,url,filename,content_type,size_bytes,category,folder,display_order,alt_text,meta_json) VALUES (" +
    [a.r2Key, `/media/${a.r2Key}`, a.filename, "image/png", a.size, "FNF identity — review", "images", a.position, `${a.name} — FNF identity review artwork, not approved for production`, JSON.stringify(meta)].map((value,i)=> i===4 || i===7 ? Number(value) : quote(value)).join(",") + ");");
  sql.push("INSERT OR IGNORE INTO media_album_assets(album_id,media_asset_id,position) SELECT a.id,m.id," + a.position +
    " FROM media_albums a JOIN media_assets m ON m.r2_key=" + quote(a.r2Key) + " WHERE a.slug=" + quote(albumSlug) + ";");
}
sql.push("UPDATE media_albums SET cover_media_asset_id=COALESCE(cover_media_asset_id,(SELECT id FROM media_assets WHERE r2_key=" + quote(assets[0].r2Key) + ")) WHERE slug=" + quote(albumSlug) + ";");
const sqlFile = path.join(root, ".fnf-brand-import-temp.sql");
try {
  fs.writeFileSync(sqlFile, sql.join("\n")+"\n", {mode:0o600});
  console.log("Registering previews and album with FNF D1…");
  execute("d1", "execute", "fuelnfreetime", "--remote", "--file", sqlFile);
} finally {
  fs.rmSync(sqlFile, {force:true});
}
console.log("Registered " + assets.length + " previews in album " + albumSlug + ". Verify in /admin/content before publishing.");
