import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE_REGISTRY } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

const paths = {
  about: "packages/heuristic-theme/storefront/about.html",
  community: "packages/heuristic-theme/storefront/community.html",
};
const expected = {
  about: ["hero", "moment", "video", "collections", "against", "lafayette", "origins", "lifestyle", "cta"],
  community: ["hero", "events", "gallery", "join", "stories", "social"],
};
const allRoutes = ["site", "home", "shop", "about", "community", "collaborate", "policies", "terms"];
function sourceSections(html) {
  const result = new Map();
  for (const m of html.matchAll(/<section\b[^>]*\bdata-cms-section="([^"]+)"[^>]*>/g)) {
    const end = html.indexOf("</section>", m.index);
    assert(end !== -1, "Unclosed CMS section " + m[1]);
    assert(!result.has(m[1]), "Duplicate section ID " + m[1]);
    result.set(m[1], html.slice(m.index, end + "</section>".length));
  }
  return result;
}
function fieldsInRegistry(section) {
  const ids = new Set(section.fields.map(f=>f.key));
  for (const b of section.defaultContent.__editor?.blocks || []) {
    const type = section.blocks?.find(t=>t.key===b.templateKey);
    assert(type, "Block has no installed template: " + b.templateKey);
    for (const field of type.fields) ids.add(b.id + "." + field.key);
  }
  return ids;
}

test("canonical FNF registry retains all unrelated storefronts and original sections", () => {
  assert.deepEqual(Object.keys(PAGE_REGISTRY), allRoutes);
  assert.deepEqual(Object.keys(PAGE_REGISTRY.home.sections),
    ["hero", "manifesto", "collections", "values", "community", "newsletter"]);
  assert.deepEqual(Object.keys(PAGE_REGISTRY.shop.sections),
    ["hero", "collections", "stories", "newsletter"]);
});
for(const slug of Object.keys(paths)){
  test(slug + ": actual source has every section and no imaginary editor rows", () => {
    const html=readFileSync(paths[slug], "utf8");
    const sections=sourceSections(html);
    assert.deepEqual([...sections.keys()],expected[slug]);
    assert.deepEqual(Object.keys(PAGE_REGISTRY[slug].sections),expected[slug]);
    for(const [key,fragment] of sections) {
      const def=PAGE_REGISTRY[slug].sections[key];
      assert(def, slug+"."+key+" not registered");
      assert.equal(def.sourceSection,"fnf."+slug+"."+key);
      const expectedFields=fieldsInRegistry(def);
      const actualFields=[...fragment.matchAll(/\bdata-cms="([^"]+)"/g)].map(x=>x[1]);
      assert(actualFields.length>0,slug+"."+key+" has no actual editable source content");
      const encountered = new Set();
      for(const marker of actualFields) {
        assert(marker.startsWith(key+"."),slug+"."+key+" has bad scope "+marker);
        const field=marker.slice(key.length+1);
        assert(expectedFields.has(field),"Source field not editable in inspector: "+slug+"."+key+"."+field);
        assert(!encountered.has(marker),"Duplicated source marker "+slug+"."+marker);
        encountered.add(marker);
      }
      assert.equal(encountered.size,expectedFields.size,
        "Every schema field must correspond to real markup: "+slug+"."+key+
        " fields="+[...expectedFields].filter(x=>!encountered.has(key+"."+x)).join(","));
      for(const block of def.defaultContent.__editor?.blocks || []) {
        assert(fragment.includes('data-cms-block="'+block.id+'"'),
          "Block lacks source DOM identity "+slug+"."+key+"."+block.id);
        assert(fragment.includes('data-cms-block-template="'+block.templateKey+'"'),
          "Block missing compatible template "+slug+"."+block.templateKey);
      }
    }
  });
}
test("About remains a readable original editorial layout with truthful scoped provenance", () => {
 const html=readFileSync(paths.about,"utf8");
 assert.match(html,/\.full-story-section \.story-content p \{[\s\S]*?color:\s*#292723/);
 assert.match(html,/From apparel and artwork to repairs, rides, and the helicopter restoration/);
 assert.doesNotMatch(html,/Every thread is sewn with purpose in Lafayette/);
 assert.doesNotMatch(html,/Every piece is designed, cut, sewn, and shipped from Lafayette/);
});
test("Community never represents 2025 proposals as upcoming real 2026 events", () => {
 const html=readFileSync(paths.community,"utf8");
 assert.doesNotMatch(html,/March (?:9|15), 2025|April 2025|5K\+|150\+ Members|Reserve Your Spot/);
 assert.match(html,/These are gathering ideas, not confirmed events/);
 assert.equal((html.match(/class="gallery-media"/g)||[]).length,6);
 assert.equal((html.match(/class="event-media"/g)||[]).length,4);
 assert(!html.includes('href="#" class="social-cta"'),"Social CTA must lead somewhere");
});
test("Editor stages missing source sections without automatic publishing",()=>{
 const api=readFileSync("apps/ecommerce-cms-agentsam/backend/cms/api.js","utf8");
 const editor=readFileSync("apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js","utf8");
 assert.match(api,/missing_source_sections:\s*missingSourceSections/);
 assert.match(editor,/async function stageMissingSourceSections\(\)/);
 assert.match(editor,/templateKey: key, toIndex: ordering\.indexOf\(key\)/);
 assert.doesNotMatch(editor.slice(editor.indexOf("async function stageMissingSourceSections"),editor.indexOf("async function importLiveSource")),
   /\/publish|publishPage\(/);
 assert.match(editor,/value === field\.key \|\| value === section\.key \+ '\.' \+ field\.key/);
});
