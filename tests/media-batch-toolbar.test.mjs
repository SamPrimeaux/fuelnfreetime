import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/css/media-library.css', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.notEqual(start, -1, 'Missing ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Could not find function end: ' + name);
}

function render({ count = 5, albums = [], canMaterialize = false, activeAlbumId = null } = {}) {
  const bar = { hidden: true, innerHTML: '' };
  const sandbox = {
    els: { batchBar: bar },
    selectedIds: new Set(Array.from({ length: count }, (_, index) => index + 1)),
    albums,
    mediaCapabilities: { can_materialize_derivatives: canMaterialize },
    activeAlbumId,
    escapeHtml: (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;'),
  };
  vm.runInNewContext(extractFunction('renderBatchBar') + '\nrenderBatchBar()', sandbox);
  return bar;
}

test('selected media shows count, one primary action, a usable album destination, and a menu', () => {
  const bar = render({ albums: [{ id: 12, name: 'Campaign assets', asset_count: 4 }] });
  assert.equal(bar.hidden, false);
  assert.match(bar.innerHTML, /5<\/strong> assets selected/);
  assert.match(bar.innerHTML, /data-media-batch="gallery"/);
  assert.match(bar.innerHTML, /data-media-batch-album/);
  assert.match(bar.innerHTML, /Campaign assets/);
  assert.match(bar.innerHTML, /<details class="media-batch-more">/);
  assert.match(bar.innerHTML, /data-media-batch="page"/);
  assert.match(bar.innerHTML, /data-media-batch="clear"/);
  assert.doesNotMatch(bar.innerHTML, /data-media-batch="optimize"/);
});

test('capability-gated optimization and current album controls are not faked', () => {
  const bar = render({ count: 1, canMaterialize: true, activeAlbumId: 19 });
  assert.match(bar.innerHTML, /1<\/strong> asset selected/);
  assert.match(bar.innerHTML, /data-media-batch="optimize"/);
  assert.match(bar.innerHTML, /data-media-batch="remove-album"/);
});

test('no-selection state is hidden and emptied', () => {
  const bar = render({ count: 0 });
  assert.equal(bar.hidden, true);
  assert.equal(bar.innerHTML, '');
});

test('command bar replaces invisible horizontal scrolling and supports narrow viewport', () => {
  assert.match(css, /#content-view-library \.media-batch-actions\s*\{[^}]*flex-wrap: wrap;[^}]*overflow: visible;/s);
  assert.match(css, /#content-view-library \.media-batch-menu\s*\{[^}]*position: absolute;/s);
  assert.match(css, /#content-view-library \.media-batch-more > summary:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{/);
});
