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
const start = js.indexOf('  function setEditorDrawer(next, showMobileSheet = true) {');
const end = js.indexOf('\n  let editorLeaving', start);
const actualDrawerFunction = start >= 0 && end > start ? js.slice(start, end) : '';

test('editor has three consistent, accessible toolbar icons and a real full-preview transition', () => {
  for (const name of ['sections', 'settings', 'embeds']) {
    const line = js.split('\n').find(value => value.startsWith('    ' + name + ':'));
    assert.ok(line, 'Missing ' + name + ' icon');
    assert.match(line, /width="19" height="19" viewBox="0 0 24 24"/);
    assert.match(line, /stroke="currentColor" stroke-width="1\.8"/);
    assert.match(line, /aria-hidden="true"/);
  }
  assert.ok(actualDrawerFunction.includes('setInspectorVisible(false)'),
    'Closing the left rail must close the right inspector');
  assert.ok(actualDrawerFunction.includes('setInspectorVisible(inspectorBeforeFullPreview)'),
    'Reopening must restore the prior inspector preference');
  assert.match(js, /button\.addEventListener\('click', function\(\) \{ setEditorDrawer\(button\.dataset\.drawerMode\); \}\)/);
});

const candidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = candidates.find(existsSync);

test('Chrome: clicking Sections, Theme Settings and App Embeds twice gives full-width preview and restores controls', { skip: !chrome }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'fnf-full-preview-'));
  try {
    const html = [
      '<!doctype html><meta charset="utf-8">',
      '<style>' + css + '</style>',
      '<style>body{margin:0}.theme-studio{display:block!important;height:auto!important;min-height:0!important}' +
        '.theme-studio-workspace{width:1100px!important;height:360px!important}' +
        '.theme-studio-canvas{height:100%!important;background:#ddd}' +
        '.theme-studio-tree,.theme-editor-panel{height:100%!important}' +
        '.te-mobile-pane-switch,.te-mobile-selection-bar{display:none!important}</style>',
      '<div class="theme-studio" data-editor-drawer="sections" data-inspector="open">',
      '<header>',
      '<button data-drawer-mode="sections" aria-pressed="true">Sections</button>',
      '<button data-drawer-mode="theme-settings" aria-pressed="false">Theme Settings</button>',
      '<button data-drawer-mode="app-embeds" aria-pressed="false">App Embeds</button>',
      '</header><div class="theme-studio-workspace">',
      '<nav class="te-mobile-pane-switch"></nav>',
      '<aside class="theme-studio-tree" id="te-editor-drawer">',
      '<section data-drawer-panel="sections">Sections</section>',
      '<section data-drawer-panel="theme-settings" hidden>Theme Settings</section>',
      '<section data-drawer-panel="app-embeds" hidden>App Embeds</section></aside>',
      '<main class="theme-studio-canvas"><div class="te-preview-device" data-device="desktop">Actual preview canvas</div></main>',
      '<div class="te-mobile-selection-bar"></div>',
      '<aside class="theme-editor-panel">Inspector</aside>',
      '</div></div><pre id="result"></pre>',
      '<script>',
      "const studio = document.querySelector('.theme-studio');",
      'const byId = id => document.getElementById(id);',
      'let editorDrawer = "sections", inspectorVisible = true, inspectorBeforeFullPreview = true;',
      "const drawerScroll = { sections: 0, 'theme-settings': 0, 'app-embeds': 0 };",
      'const closeMiniAgentSam = () => {};',
      'const isPhoneEditor = () => matchMedia("(max-width: 900px)").matches;',
      'const setMobileSheetSize = () => {}, setMobilePane = () => {};',
      'const setInspectorVisible = value => { inspectorVisible = Boolean(value); studio.dataset.inspector = inspectorVisible ? "open" : "closed"; };',
      actualDrawerFunction,
      "document.querySelectorAll('[data-drawer-mode]').forEach(function(button) { button.addEventListener('click', function() { setEditorDrawer(button.dataset.drawerMode); }); });",
      "const ws = document.querySelector('.theme-studio-workspace');",
      "const canvas = document.querySelector('.theme-studio-canvas');",
      "const tree = document.querySelector('.theme-studio-tree');",
      "const panel = document.querySelector('.theme-editor-panel');",
      'function measure() { const a=canvas.getBoundingClientRect(),w=ws.getBoundingClientRect();' +
        ' return { canvasWidth:a.width, workspaceWidth:w.width, canvasX:a.left-w.left,' +
        ' treeDisplay:getComputedStyle(tree).display, panelDisplay:getComputedStyle(panel).display,' +
        ' drawer:studio.dataset.editorDrawer, inspector:studio.dataset.inspector,' +
        ' columns:getComputedStyle(ws).gridTemplateColumns }; }',
      "const button = name => document.querySelector('[data-drawer-mode=\"'+name+'\"]');",
      'const measurements = [];',
      "measurements.push(['initial',measure()]);",
      "for(const name of ['sections','theme-settings','app-embeds']) {",
      '  if (studio.dataset.editorDrawer !== name) button(name).click();',
      "  measurements.push([name+'-opened',measure()]);",
      '  button(name).click();',
      "  measurements.push([name+'-closed',measure()]);",
      '  button(name).click();',
      "  measurements.push([name+'-reopened',measure()]);",
      '}',
      "const closed = measurements.filter(([name])=>name.endsWith('-closed')).every(([,m])=>",
      '  m.drawer==="closed" && m.inspector==="closed" && m.treeDisplay==="none" && m.panelDisplay==="none" &&',
      '  m.canvasWidth>=m.workspaceWidth-3 && Math.abs(m.canvasX)<3);',
      "const opened = measurements.filter(([name])=>name.endsWith('-opened')||name.endsWith('-reopened')).every(([,m])=>",
      '  m.drawer!=="closed" && m.inspector==="open" && m.canvasWidth>200 && m.canvasWidth<m.workspaceWidth-450 &&',
      '  m.treeDisplay!=="none" && m.panelDisplay!=="none");',
      "const buttonState = [...document.querySelectorAll('[data-drawer-mode]')].filter(b=>b.getAttribute('aria-pressed')==='true').length===1;",
      'setInspectorVisible(false); button("app-embeds").click(); button("app-embeds").click();',
      'const preferenceKept = studio.dataset.inspector==="closed";',
      "document.getElementById('result').textContent = closed && opened && buttonState && preferenceKept",
      '  ? "FULL_PREVIEW_TOGGLE_PASS" : "FULL_PREVIEW_TOGGLE_FAIL " + JSON.stringify({closed,opened,buttonState,preferenceKept,measurements});',
      '</script>',
    ].join('\n');
    const file = join(dir, 'fixture.html');
    writeFileSync(file, html);
    const run = spawnSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
      '--no-default-browser-check', '--window-size=1440,900',
      '--user-data-dir=' + join(dir, 'profile'), '--virtual-time-budget=2000',
      '--dump-dom', pathToFileURL(file).href,
    ], { encoding: 'utf8', timeout: 20000, maxBuffer: 3_000_000 });
    assert.equal(run.error, undefined, run.error?.message);
    assert.match(run.stdout || '', /FULL_PREVIEW_TOGGLE_PASS/,
      (run.stdout || run.stderr || '').slice(-4500));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
