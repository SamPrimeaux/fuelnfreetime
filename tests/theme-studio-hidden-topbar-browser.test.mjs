import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Render the real CSS and the same shell classes emitted by frontend/shell.js.
// The normal dashboard has an admin topbar; Theme Studio deliberately doesn't.
// A topbar-height deduction in the editor's full-bleed main is a regression.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (p) => readFileSync(path.join(root, p), 'utf8');
const consoleCss = source('apps/ecommerce-cms-agentsam/frontend/static/css/console.css');
const editorCss = source('apps/ecommerce-cms-agentsam/frontend/static/css/theme-editor.css');
assert.match(consoleCss,
  /body\.console-theme\.console-body-bleed\.shell-mode-theme-editor \.console-main--bleed\s*\{\s*height:\s*100%/,
  'An editor-specific shell rule must cancel the hidden topbar reservation');
const chrome = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(existsSync);
assert.ok(chrome, 'Headless Chrome required for rendered shell geometry acceptance');

const dir = mkdtempSync(path.join(os.tmpdir(), 'te-shell-'));
const html = (editor) => `<!doctype html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>${consoleCss}\n${editorCss}</style></head>
<body class="console-theme console-body-bleed ${editor ? 'shell-mode-theme-editor' : ''}">
<div class="console-shell admin-shell ${editor ? 'is-editor-mode' : ''}">
${editor ? '' : '<header class="console-topbar"></header>'}
<div class="console-body"><div class="console-workspace">
<main class="console-main admin-main console-main--bleed admin-main--bleed">
${editor ? `<div class="theme-studio" data-mobile-pane="preview"><div class="theme-studio-toolbar"></div>
<div class="theme-studio-workspace"><main class="theme-studio-canvas"><div class="te-preview-bar"></div>
<div class="te-preview-stage"></div></main><nav class="te-mobile-pane-switch" id="te-mobile-pane-switch">
<button type="button">Sections</button><button type="button">Preview</button>
<button type="button">Edit</button></nav></div></div>` : '<article>Dashboard content</article>'}
</main><aside class="agentsam-dock"></aside></div></div></div>
<script>
const box = selector => { const el=document.querySelector(selector); if(!el)return null;
 const r=el.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,height:r.height}; };
const p=document.createElement('pre');p.id='layout-metrics';
p.textContent=JSON.stringify({width:innerWidth,viewport:innerHeight,
 shell:box('.console-shell'),body:box('.console-body'),
 main:box('.console-main--bleed'),studio:box('.theme-studio'),
 tabs:box('.te-mobile-pane-switch'),
 horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2});
document.body.append(p);
</script></body></html>`;

try {
  for (const [label, editor] of [['editor', true], ['dashboard', false]]) {
    const testPath = path.join(dir, label + '.html');
    writeFileSync(testPath, html(editor));
    for (const width of [390, 430, 768, 1440]) {
      const stdout = execFileSync(chrome, [
        '--headless=new', '--no-sandbox', '--disable-gpu',
        '--disable-dev-shm-usage', '--hide-scrollbars',
        '--window-size=' + width + ',900',
        '--virtual-time-budget=1000', '--dump-dom',
        pathToFileURL(testPath).href,
      ], { encoding:'utf8', maxBuffer:8*1024*1024, timeout:45000 });
      const match = stdout.match(/<pre id="layout-metrics">([^<]+)<\/pre>/);
      assert.ok(match, label+' rendered geometry missing at '+width);
      const result = JSON.parse(match[1].replaceAll('&quot;', '"')
        .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));
      const gap = Math.round(result.shell.bottom - result.main.bottom);
      assert.ok(Math.abs(gap) <= 2,
        label+' main must reach its available shell bottom at '+width+'px: '+JSON.stringify(result));
      if (editor && width <= 900) {
        assert.ok(result.tabs, 'Three-tab mobile navigation must be rendered');
        assert.ok(Math.abs(result.tabs.bottom - result.shell.bottom) <= 2,
          'Theme Studio mobile tab bar must reach the shell bottom: '+JSON.stringify(result));
      }
      if (editor) assert.equal(result.horizontalOverflow,false,'No editor horizontal overflow');
      console.log('PASS '+label+' '+width+'px: shell/main gap='+gap+'px');
    }
  }
} finally { rmSync(dir, { recursive:true, force:true }); }
