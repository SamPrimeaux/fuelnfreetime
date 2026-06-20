import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "analytics-3pt-dashboard-buildin.html");
const outAssets = path.join(root, "public/admin/analytics/assets");
const outCss = path.join(root, "public/admin/analytics/analytics.css");

const html = fs.readFileSync(src, "utf8");
const manifest = JSON.parse(html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)[1]);
let template = JSON.parse(html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/)[1]);

fs.mkdirSync(outAssets, { recursive: true });

for (const [uuid, entry] of Object.entries(manifest)) {
  const buf = Buffer.from(entry.data, "base64");
  const bytes = entry.compressed ? zlib.gunzipSync(buf) : buf;
  const ext = entry.mime.includes("woff") ? ".woff2" : entry.mime.includes("javascript") ? ".js" : ".bin";
  fs.writeFileSync(path.join(outAssets, uuid + ext), bytes);
  template = template.split(uuid).join(`/admin/analytics/assets/${uuid}${ext}`);
}

const styleBlocks = [...template.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (!styleBlocks.length) throw new Error("Missing analytics styles");
let css = styleBlocks.join("\n\n");
css = css.replace(/url\("\/admin\/analytics\/assets\/([^"]+)"\)/g, 'url("/admin/analytics/assets/$1")');
fs.writeFileSync(outCss, css);

// Patch app entry for route-aware views (minimal — preserves embed UI)
const appPath = path.join(outAssets, "111a6d5a-856b-4c9b-bfea-2d42462e1948.js");
let appJs = fs.readFileSync(appPath, "utf8");
const routeMap = `{ overview: '/admin/dashboard/overview.html', finance: '/admin/dashboard/finance.html', health: '/admin/dashboard/analytics.html' }`;
appJs = appJs.replace(
  "const [view, setView] = useState('overview');",
  `const ROUTES = ${routeMap};
  const initial = window.__FNF_INITIAL_VIEW || 'overview';
  const [view, setView] = useState(initial);`
);
appJs = appJs.replace(
  "onClick={() => setView(t.id)}",
  `onClick={() => { if (view !== t.id && ROUTES[t.id]) { if (window.parent !== window) { window.parent.postMessage({ type: 'fnf-analytics-nav', view: t.id }, '*'); } else { window.location.href = ROUTES[t.id]; } } else setView(t.id); }}`
);
fs.writeFileSync(appPath, appJs);

// Standalone embed page — scripts in initial HTML so Babel runs (dynamic injection fails)
const viewBootstrap = `<script>window.__FNF_INITIAL_VIEW = new URLSearchParams(location.search).get('view') || 'overview';</script>`;
let embedHtml = template.replace(/<\/head>/i, `${viewBootstrap}\n</head>`);
embedHtml = embedHtml.replace(/\s+integrity="[^"]*"/gi, "").replace(/\s+crossorigin="[^"]*"/gi, "");
fs.writeFileSync(path.join(root, "public/admin/analytics/embed.html"), embedHtml);

console.log("Unpacked", Object.keys(manifest).length, "assets to", outAssets);
console.log("Wrote", outCss);
console.log("Wrote embed.html");
