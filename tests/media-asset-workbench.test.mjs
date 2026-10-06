import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canEditRaster, validateImageDimensions } from '../packages/agentsam-workbench/src/media-asset-workbench.js';
import { addMediaReviewComment } from '../apps/ecommerce-cms-agentsam/backend/admin/media.js';

test('only browser-editable raster formats expose working-copy tools', () => {
  for (const content_type of ['image/png', 'image/jpeg', 'image/webp']) assert.equal(canEditRaster({ content_type }), true);
  for (const content_type of ['image/svg+xml', 'image/gif', 'image/avif', 'video/mp4']) assert.equal(canEditRaster({ content_type }), false);
  assert.equal(canEditRaster(null), false);
});
test('image dimensions respect browser edit limits', () => {
  assert.equal(validateImageDimensions(400, 400), true);
  assert.equal(validateImageDimensions(8192, 1000), true);
  for (const [w,h] of [[0,100],[-1,12],[1.4,20],[9000,1],[8192,8192],[NaN,100]]) {
    assert.equal(validateImageDimensions(w,h), false);
  }
});
const request = (body) => new Request('https://example.test/comments', {
  method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body)
});
function mockDb() {
  let row = { id:1, filename:'source.png', r2_key:'originals/source.png', url:'/media/originals/source.png',
    content_type:'image/png', folder:'images', meta_json:JSON.stringify({title:'Original',review_notes:[]}) };
  let reads=0;
  return {
    get row(){return row;}, get reads(){return reads;},
    prepare(sql) { return { bind(...args) { return {
      async first() { reads++; return /^SELECT/.test(sql) && String(args[0])==='1' ? {...row}:null; },
      async run() {
        assert.match(sql,/WHERE id = \? AND COALESCE\(meta_json/);
        if (String(args[1]) !== '1' || args[2] !== row.meta_json) return {meta:{changes:0}};
        row={...row,meta_json:args[0]};
        return {meta:{changes:1}};
      }
    }; } }; }
  };
}
test('comments persist and append without overwriting other metadata', async () => {
  const db=mockDb();
  const first=await addMediaReviewComment(request({text:'Check logo edge',x:.25,y:.75}),{DB:db},1);
  assert.equal(first.status,200);
  const data=await first.json();
  assert.equal(data.ok,true);
  assert.equal(data.asset.meta.title,'Original');
  assert.equal(data.comment.x,.25);
  assert.ok(data.comment.id);
  const second=await addMediaReviewComment(request({text:'Increase contrast',x:1,y:0}),{DB:db},1);
  assert.equal(second.status,200);
  const notes=JSON.parse(db.row.meta_json).review_notes;
  assert.deepEqual(notes.map((n)=>n.text),['Check logo edge','Increase contrast']);
});
test('invalid comments never touch stored assets', async () => {
  const db=mockDb();
  for(const body of [{text:' ',x:.5,y:.5},{text:'x',x:1.2,y:0},{text:'a'.repeat(1201),x:.5,y:.5}]) {
    assert.equal((await addMediaReviewComment(request(body),{DB:db},1)).status,400);
  }
  assert.equal(db.reads,0);
});
test('media editor mounts shared workbench and stores derivative provenance', () => {
  const html=readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/content.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js',import.meta.url),'utf8');
  const server=readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/admin/media.js',import.meta.url),'utf8');
  assert.match(html,/id="media-agent-workbench"/);
  assert.match(js,/createMediaAssetWorkbench/);
  assert.match(js,/surface: "content-library"/);
  assert.match(js,/source_media_asset_id/);
  assert.match(server,/source_media_asset_id: Number\(editedSource.id\)/);
});
