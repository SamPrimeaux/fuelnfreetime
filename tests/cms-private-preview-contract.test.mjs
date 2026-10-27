import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { adminRouteForPath } from '../apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js';
import { isAdminPublicPath } from '../apps/ecommerce-cms-agentsam/backend/lib/admin-routes.js';

const source = readFileSync('apps/ecommerce-cms-agentsam/frontend/static/js/cms-private-preview.js','utf8');
const editor = readFileSync('apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js','utf8');
const shell = readFileSync('apps/ecommerce-cms-agentsam/frontend/shell.js','utf8');
const style = readFileSync('apps/ecommerce-cms-agentsam/frontend/static/css/console.css','utf8');

test('private drafts have a session-only clean route, not a new editor or a public CMS page', () => {
  assert.equal(adminRouteForPath('/admin/cms-preview').context,'cms.private-preview');
  assert.equal(isAdminPublicPath('/admin/cms-preview'),false);
  assert.match(source,/\/api\/admin\/cms\/pages\//);
  assert.doesNotMatch(source,/fetch\([\s\S]{0,400}method:\s*["'](?:POST|PUT|DELETE)/);
  assert.match(editor,/function privatePreviewUrl\(/);
  assert.match(editor,/href = privatePreviewUrl\(\)/);
  assert.match(editor,/theme-previews\/heuristic/);
});

test('the existing single sidebar has its own inline navigation search', () => {
  assert.match(shell,/data-console-nav-search/);
  assert.match(shell,/function installSidenavSearch\(/);
  assert.match(shell,/installSidenavSearch\(\);/);
  assert.match(style,/\.console-sidenav-search/);
  assert.match(shell,/hideAdminNav: true/); // Theme Studio owns its own toolbar.
});

test('private Revise/FNF draft viewer consumes account CMS read endpoints and keeps the actual theme renderer', async () => {
  for (const theme of ['revise','fnf']) {
    const requests = [];
    const elements = new Map([
      ['page-name',{textContent:''}],['draft-frame',{srcdoc:'',replaceWith(){}}],
      ['editor-link',{href:''}],['theme-name',{textContent:''}],
    ]);
    const window = { ThemeStudioPreview: {
      getTheme: id => id===theme ? {id} : null,
      render: (id,page) => '<!doctype html><html><body><main><h1>' +
        page.title + ' / ' + id + '</h1></main></body></html>',
    }};
    const document = { getElementById:id=>elements.get(id) };
    const fetch = async url => {
      requests.push(url);
      return {ok:true,json: async()=>({page:url.endsWith('/site')
        ? {slug:'site',sections:[]} : {slug:'products',title:'The Shop',sections:[]}})};
    };
    const sandbox = {
      window,document,fetch,URLSearchParams,DOMParser:class {},
      location:{search:'?slug=products&theme='+theme},
    };
    runInNewContext(source,sandbox);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(requests,[
      '/api/admin/cms/pages/products',
      '/api/admin/cms/pages/site',
    ]);
    assert.match(elements.get('draft-frame').srcdoc,new RegExp('The Shop / '+theme));
    assert.equal(elements.get('editor-link').href,'/admin/theme-editor?slug=products&theme='+theme);
  }
});
