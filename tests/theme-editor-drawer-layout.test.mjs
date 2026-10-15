import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(join(root, 'apps/ecommerce-cms-agentsam/frontend/static/css/theme-editor.css'), 'utf8');
const js = readFileSync(join(root, 'apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js'), 'utf8');

test('Sections button is a reversible toggle, not a replacement inspector view', () => {
  assert.match(js, /editorDrawer = editorDrawer === next \? null : next/);
  assert.match(js, /button\.addEventListener\('click', function\(\) \{ setEditorDrawer\(button\.dataset\.drawerMode\); \}\)/);
  assert.match(css, /\.theme-studio \.theme-studio-workspace > \.theme-studio-canvas\s*\{\s*grid-column:\s*2/);
  assert.match(css, /\.theme-studio \.theme-studio-workspace > \.theme-editor-panel\s*\{\s*grid-column:\s*3/);
});

const candidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = candidates.find(existsSync);

test('real browser: closing and reopening Sections preserves preview width and inspector placement', { skip: !chrome }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'fnf-editor-drawer-'));
  try {
    const html = `<!doctype html><meta charset="utf-8"><style>${css}</style>
      <style>body{margin:0}.theme-studio{height:auto!important;display:block!important}
      .theme-studio-workspace{width:1100px!important;height:240px!important}
      .theme-studio-canvas{background:#ddd}.theme-editor-panel{background:#eee}</style>
      <div class="theme-studio" data-editor-drawer="sections" data-inspector="open">
        <div class="theme-studio-workspace">
          <nav class="te-mobile-pane-switch"></nav>
          <aside class="theme-studio-tree">Sections tree</aside>
          <main class="theme-studio-canvas">Preview</main>
          <aside class="theme-editor-panel">Inspector</aside>
        </div>
      </div><pre id="result"></pre>
      <script>
        const studio = document.querySelector('.theme-studio');
        const canvas = document.querySelector('.theme-studio-canvas');
        const inspector = document.querySelector('.theme-editor-panel');
        const measure = () => {
          const a = canvas.getBoundingClientRect(), b = inspector.getBoundingClientRect();
          return {previewX:a.x, previewWidth:a.width, inspectorX:b.x, inspectorWidth:b.width};
        };
        const opened = measure();
        studio.dataset.editorDrawer = 'closed';
        const closed = measure();
        studio.dataset.editorDrawer = 'sections';
        const reopened = measure();
        document.getElementById('result').textContent =
          opened.previewWidth > 200 && closed.previewWidth > opened.previewWidth &&
          closed.inspectorX >= closed.previewX + closed.previewWidth - 1 &&
          closed.inspectorWidth > 200 && reopened.previewWidth === opened.previewWidth
          ? 'THEME_EDITOR_GRID_PASS' : 'THEME_EDITOR_GRID_FAIL ' +
            JSON.stringify({opened,closed,reopened});
      </script>`;
    const file = join(dir, 'fixture.html');
    writeFileSync(file, html);
    const run = spawnSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox',
      '--no-first-run', '--no-default-browser-check',
      '--user-data-dir=' + join(dir, 'profile'),
      '--virtual-time-budget=1800', '--dump-dom', pathToFileURL(file).href,
    ], { encoding: 'utf8', timeout: 20000, maxBuffer: 3_000_000 });
    assert.equal(run.error, undefined, run.error?.message);
    assert.match(run.stdout || '', /THEME_EDITOR_GRID_PASS/, (run.stdout || run.stderr || '').slice(-1000));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
