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
const rendererPath=path.join(sourceRoot,"packages/fnf-theme/src/editor/preview-adapter.js");
const registryPath=path.join(sourceRoot,"packages/theme-contract/runtime/theme-preview-registry.js");
const portablePath=path.join(sourceRoot,"packages/theme-contract/runtime/portable-sections.js");

test("all advertised theme section presets represent distinct renderer behavior", () => {
  for (const file of [portablePath,registryPath,rendererPath]) {
    assert.ok(fs.existsSync(file),"Canonical Theme Studio source must exist: "+file);
  }
  const context={window:{}};
  context.globalThis=context.window;
  for (const file of [portablePath,registryPath,rendererPath])
    vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
  const runtime=context.window.ThemeStudioPreview;
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
              themePreset:variant.id,
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
