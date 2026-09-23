import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/assets');
const frontend = path.join(root, 'apps/ecommerce-cms-agentsam/frontend');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, 'public'), output, { recursive: true, filter: p => !p.includes('/public/admin') && !['.DS_Store','.gitkeep'].includes(path.basename(p)) });
await cp(path.join(root, 'packages/heuristic-theme/storefront'), output, { recursive: true });
await cp(path.join(frontend, 'static'), path.join(output, 'admin'), { recursive: true });
await cp(path.join(frontend, 'dist'), path.join(output, 'admin/_spa'), { recursive: true });
await cp(path.join(root, 'packages/agentsam-workbench/src'), path.join(output, 'admin/workbench'), { recursive: true });
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
console.log('Assembled Heuristic + commerce dashboard into dist/assets');
