import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { build as bundle } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/assets');
const frontend = path.join(root, 'apps/ecommerce-cms-agentsam/frontend');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'public'), output, { recursive: true, filter: p => !p.includes('/public/admin') && !['.DS_Store','.gitkeep'].includes(path.basename(p)) });
await cp(path.join(root, 'packages/heuristic-theme/storefront'), output, { recursive: true });
await cp(path.join(root, 'packages/heuristic-theme/contracts'), path.join(output, 'theme/contracts'), { recursive: true });
await cp(path.join(root, 'packages/heuristic-theme/presets'), path.join(output, 'theme/presets'), { recursive: true });
await cp(path.join(root, 'packages/heuristic-theme/theme.json'), path.join(output, 'theme/theme.json'));
await cp(path.join(root, 'node_modules/@inneranimalmedia/revise-theme/dist'), path.join(output, 'admin/theme-previews/revise'), { recursive: true });
await cp(path.join(root, 'node_modules/@inneranimalmedia/section-library/dist/layout.css'), path.join(output, 'admin/theme-previews/revise/layout.css'));
await cp(path.join(root, 'node_modules/@inneranimalmedia/revise-theme/dist'), path.join(output, 'theme-assets/revise'), { recursive: true });
await cp(path.join(root, 'node_modules/@inneranimalmedia/section-library/dist/layout.css'), path.join(output, 'theme-assets/revise/layout.css'));
await mkdir(path.join(output, 'admin/theme-previews/fnf'), { recursive: true });
await cp(path.join(root, 'packages/fnf-theme/src/theme/tokens.css'), path.join(output, 'admin/theme-previews/fnf/tokens.css'));
await cp(path.join(root, 'packages/fnf-theme/src/layout/layout.css'), path.join(output, 'admin/theme-previews/fnf/layout.css'));
await cp(path.join(root, 'packages/fnf-theme/src/sections/scene-hero/scene-hero.css'), path.join(output, 'admin/theme-previews/fnf/scene-hero.css'));
await cp(path.join(frontend, 'static'), path.join(output, 'admin'), { recursive: true });
await mkdir(path.join(output, 'admin/fixtures'), { recursive: true });
await cp(path.join(root, 'apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json'),
  path.join(output, 'admin/fixtures/fnf-revise-site.json'));
// One section renderer and stylesheet are shipped to BOTH the live site and
// editor. Preview-only renderer copies are not allowed for portable sections.
for (const ext of ['js', 'css']) {
  const src = path.join(root, `packages/theme-contract/runtime/portable-sections.${ext}`);
  await cp(src, path.join(output, `js/portable-sections.${ext}`));
  await cp(src, path.join(output, `admin/js/portable-sections.${ext}`));
}
// Build ONE renderer-backed section runtime from the published Revise/section
// packages. The same semantic source is imported directly by the Worker.
const atlasBundle = await bundle({
  entryPoints: [path.join(root, 'packages/theme-contract/runtime/revise-atlas-browser.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  write: false,
  minify: false,
});
const atlasJs = atlasBundle.outputFiles[0].contents;
for (const dest of ['js/revise-atlas.js', 'admin/js/revise-atlas.js']) {
  await writeFile(path.join(output, dest), atlasJs);
}
// Real donor layout and theme CSS. @scope prevents header/nav/body token
// pollution of the consuming Heuristic, FNF, or other merchant theme.
const layoutCss = await readFile(path.join(root, 'node_modules/@inneranimalmedia/section-library/dist/layout.css'), 'utf8');
const reviseCss = await readFile(path.join(root, 'node_modules/@inneranimalmedia/revise-theme/dist/theme.css'), 'utf8');
const atlasCss = [
  '/* Original Revise CSS, scoped to the selected section only. */',
  '.ps-revise-atlas { min-width: 0; isolation: isolate; }',
  '@scope (.ps-revise-atlas) {',
  layoutCss,
  reviseCss,
  '}',
].join('\n');
for (const dest of ['js/revise-atlas.css', 'admin/css/revise-atlas.css']) {
  await writeFile(path.join(output, dest), atlasCss);
}
await cp(path.join(root, 'packages/theme-contract/runtime/theme-preview-registry.js'), path.join(output, 'admin/js/theme-preview-registry.js'));
await cp(path.join(root, 'packages/fnf-theme/src/editor/preview-adapter.js'), path.join(output, 'admin/js/theme-preview-runtime.js'));
await cp(path.join(frontend, 'dist'), path.join(output, 'admin/_spa'), { recursive: true });
await cp(path.join(root, 'packages/agentsam-workbench/src'), path.join(output, 'admin/workbench'), { recursive: true });
await cp(path.join(root, 'packages/admin-profile-popup/src'), path.join(output, 'admin/profile-popup'), { recursive: true });
await cp(path.join(root, 'packages/admin-dock/src'), path.join(output, 'admin/dock'), { recursive: true });
// Dock config has one source: the app manifest's `dock` block. No env vars, no copies to keep in step.
const manifest = JSON.parse(await readFile(path.join(root, 'apps/ecommerce-cms-agentsam/agentsam.app.json'), 'utf8'));
if (!manifest.dock) throw new Error('agentsam.app.json is missing the "dock" block');
await writeFile(path.join(output, 'admin/dock/dock.config.json'), JSON.stringify(manifest.dock, null, 2) + '\n');
await cp(path.join(root, 'packages/media-kit/src'), path.join(output, 'admin/media-kit'), { recursive: true });
for (const file of ['shell.js', 'inspector.js']) {
  await cp(path.join(frontend, file), path.join(output, 'admin/js', file));
}
const partial = await readFile(path.join(output, 'admin/partials/mail-app.html'), 'utf8');
const emailPath = path.join(output, 'admin/dashboard/email.html');
const email = await readFile(emailPath, 'utf8');
const template = `<template id="mail-app-template">\n${partial}\n</template>\n`;
await writeFile(emailPath, email.includes('id="mail-app-template"')
  ? email.replace(/<template id="mail-app-template">[\s\S]*?<\/template>\n?/, template)
  : email.replace('<body>', `<body>\n${template}`));
console.log('Assembled Heuristic + Revise/FNF previews + package theme workspace + commerce dashboard into dist/assets');
