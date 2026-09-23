import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'apps/ecommerce-cms-agentsam/frontend/package.json'));
const ts = require('typescript');
const failures = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    ['node_modules', '.git', 'dist', '.wrangler', '.DS_Store'].includes(e.name) ? [] :
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
for (const retired of ['src', 'app/backend', 'app/frontend', 'admin-ui', 'public/admin']) {
  const files = walk(path.join(root, retired));
  if (files.length) failures.push(`Retired source has files: ${retired}`);
}
for (const base of ['apps/ecommerce-cms-agentsam', 'packages']) {
  for (const file of walk(path.join(root, base)).filter(f => /\.(m?js|tsx?)$/.test(f))) {
    const text = fs.readFileSync(file, 'utf8');
    const imports = [];
    const syntax = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(syntax);
    for (const spec of imports.filter(s => s.startsWith('.'))) {
      const target = path.resolve(path.dirname(file), spec);
      if (file.includes('/frontend/') && target.includes('/backend/')) failures.push(`Browser imports backend: ${file}`);
      if (!fs.existsSync(target) && !['.ts','.tsx','.js'].some(ext => fs.existsSync(target+ext))) failures.push(`Missing import: ${file} → ${spec}`);
    }
  }
}
const config = fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8');
if (!config.includes('directory = "./dist/assets"') || !config.includes('main = "apps/ecommerce-cms-agentsam/backend/index.js"')) failures.push('Worker build ownership drift');

// The SPA must render directly inside the shell-owned content mount. A separate
// viewport-sized #root created a blank screen above every React admin route.
const spaIndex = fs.readFileSync(path.join(root, 'apps/ecommerce-cms-agentsam/frontend/index.html'), 'utf8');
const spaMain = fs.readFileSync(path.join(root, 'apps/ecommerce-cms-agentsam/frontend/src/main.tsx'), 'utf8');
const spaCss = fs.readFileSync(path.join(root, 'apps/ecommerce-cms-agentsam/frontend/src/index.css'), 'utf8');
if (/id=["']root["']/.test(spaIndex) || /#root\s*\{/.test(spaCss)) failures.push('SPA viewport root drift: React must mount inside the admin shell');
if (!spaMain.includes('getElementById("ecommerce-react-content")') || !spaMain.includes('createRoot(host)')) failures.push('SPA shell mount drift: expected ecommerce-react-content root');
for (const entry of ['index.html','admin/login.html','admin/_spa/index.html','admin/js/shell.js','admin/js/inspector.js']) {
  if (!fs.existsSync(path.join(root, 'dist/assets', entry))) failures.push(`Missing assembled asset: ${entry}`);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('Ownership/import/deployment boundary checks passed');
