/**
 * The catalog must not advertise multiple distinct visual presets that the
 * renderer collapses to the same visual output for identical merchant content.
 * The user must see actual distinct component layouts, not renamed variants.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourceRoot=path.resolve(process.env.FNF_THEME_SOURCE_ROOT || path.join(here,"../.."));
const runtimePath=path.join(sourceRoot,"apps/ecommerce-cms-agentsam/frontend/static/js/theme-preview-runtime.js");

test("all advertised theme section presets represent distinct renderer behavior", () => {
  assert.ok(fs.existsSync(runtimePath),"Theme Studio runtime must exist for visual theme proof");
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(runtimePath,"utf8"),context,{filename:runtimePath});
  const runtime=context.window.FNF_THEME_PREVIEW;
  assert.ok(runtime?.render && runtime?.catalog);

  const collisions=[];
  for (const theme of ["revise","fnf"]) {
    const groupByTemplate=new Map();
    for (const preset of runtime.catalog[theme] || []) {
      const group=groupByTemplate.get(preset.templateKey) || [];
      group.push(preset);
      groupByTemplate.set(preset.templateKey,group);
    }
    for (const [templateKey, variants] of groupByTemplate) {
      if (variants.length < 2) continue;
      const rendered=variants.map((variant) => runtime.render(theme,{
        slug:"shop",
        title:"Shop",
        sections:[{
          key:templateKey,
          sort_order:0,
          content:{
            headline:"Merchant headline",
            title:"Merchant title",
            body:"Merchant content shared across visual variants.",
            imageUrl:"/media/example.webp",
            card1:{name:"Collection one",href:"/shop"},
            __editor:{
              templateKey,
              themePreset:variant.preset,
              visibility:{enabled:true},
              blocks:[{id:"card1",templateKey:"collection-card",enabled:true}],
            },
          },
        }],
      },{sections:[]}));
      const distinct=new Set(rendered);
      if (distinct.size !== variants.length) {
        collisions.push(theme+"/"+templateKey+": "+variants.length+
          " advertised presets collapse to "+distinct.size+" distinct rendered outputs");
      }
    }
  }
  assert.deepEqual(collisions, [], collisions.join("; "));
});
