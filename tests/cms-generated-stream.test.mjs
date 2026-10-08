import test from "node:test";
import assert from "node:assert/strict";
import { createGenerationSession } from "../apps/ecommerce-cms-agentsam/frontend/static/js/generation-stream.mjs";
import { inspectGeneratedSection } from "../apps/ecommerce-cms-agentsam/backend/cms/generated-section.mjs";
const code=['<<<definition>>>{"kind":"section","type":"featured-story","label":"Featured story"}',
  '<<<markup>>><section data-agentsam-block="__UID__" class="__UID__"><h2 data-cms="headline">Story</h2></section>',
  '<<<css>>>[data-agentsam-block="__UID__"] h2 { color: #fff; }',
  '<<<js>>>','<<<settings>>>headline=Story'].join("");
const lock={run:async(_id,work)=>work()};
test("stream generates a valid review candidate with portable UID tokens but no implicit persistence",async()=>{
  const text=code;
  const chunks=[];
  for(let i=0;i<text.length;i+=19)chunks.push(text.slice(i,i+19));
  const session=createGenerationSession({
    id:"test",blockId:"featured-story-ab12cd34",namespace:"agentsam",lock,
    prompt:"Generate a story",transport:async()=>({chunks,provenance:{provider:"test",model:"fixture"}}),
  });
  const result=await session.run();
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.saved,false,"Generation is never persisted until merchant acceptance");
  assert.equal(result.record.definition.type,"featured-story");
  assert.equal(result.record.settings.headline,"Story");
  assert.match(result.record.canonical.html,/data-agentsam-block="__UID__"/);
  assert.match(result.record.canonical.css,/data-agentsam-block="__UID__"/);
  assert.equal(inspectGeneratedSection(result.record,"featured-story-ab12cd34").ok,true);
});
test("generated JS remains disallowed at install even if the model returns it",()=>{
  const record={definition:{kind:"section",type:"feature-demo"},settings:{headline:"A"},
    canonical:{html:'<section data-agentsam-block="__UID__"><h2 data-cms="headline">A</h2></section>',
      css:'[data-agentsam-block="__UID__"] h2 { color:#fff; }',js:'(function(){alert("unsafe")})()'}};
  assert.equal(inspectGeneratedSection(record,"feature-demo-aabbccdd").status,422);
});
