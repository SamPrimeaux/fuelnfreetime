import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  inspectGeneratedSection,
  materializeGeneratedImplementation,
} from "../backend/cms/generated-section.mjs";
import {
  normalizeSettingFields,
  SETTING_TYPES,
} from "../frontend/static/js/generated-settings-schema.mjs";
import {
  lintGeneratedBlock,
  nsForms,
  provenanceRecord,
  resolveUidToken,
} from "../frontend/static/js/generation-namespace.mjs";
import {
  createGeneratedBlockRepository,
  createMemoryObjectStore,
  createSqlStore,
} from "../backend/cms/generated-block-repository.mjs";

const definition = {
  kind:"section",
  type:"feature-product-grid",
  label:"Product story",
  implementation_class:"artifact_static",
  settings:{
    headline:{type:"text",label:"Headline"},
    cta:{type:"link",label:"CTA"},
    columns:{type:"range",label:"Columns",min:1,max:6,step:1,binding:"style"},
    layout:{type:"select",label:"Layout",binding:"style",options:[
      {value:"split",label:"Split"},
      {value:"stacked",label:"Stacked"},
    ]},
    background:{type:"color",label:"Background",binding:"style"},
    fontRole:{type:"font_role",label:"Font role",binding:"style"},
    heroMedia:{type:"media",label:"Media asset"},
  },
};

const settings = {
  headline:"High Octane",
  cta:"/shop",
  columns:4,
  layout:"split",
  background:"#121212",
  fontRole:"display",
  heroMedia:"media_687",
};

const canonical = {
  html:'<section data-agentsam-block="__UID__"><h2 data-cms="headline">Fallback</h2><a href="/shop" data-cms="cta" data-cms-attr="href">Shop</a><img src="/media/placeholder.png" data-cms="heroMedia" data-cms-attr="src" alt="concept"></section>',
  css:'[data-agentsam-block="__UID__"] { grid-template-columns:repeat(var(--__UID__-setting-columns),1fr);background:var(--__UID__-setting-background);font-family:var(--__UID__-setting-fontRole);--__UID__-layout-selection:var(--__UID__-setting-layout) } [data-agentsam-block="__UID__"] h2 { color:inherit }',
  js:"",
};

function inspect(def = definition, values = settings, code = canonical, key = "cmss_demo_123") {
  return inspectGeneratedSection({definition:def,settings:values,canonical:code},key);
}

test("generated field vocabulary is implemented and declared schema survives acceptance", () => {
  for (const type of [
    "text","textarea","rich_text","number","range","boolean","select","color",
    "media","video","link","font_role","typography_preset","product","collection",
    "variant","alignment","spacing",
  ]) assert.ok(SETTING_TYPES.includes(type), "missing " + type);

  const checked = inspect();
  assert.equal(checked.ok,true,checked.error);
  assert.equal(checked.fields.columns.type,"range");
  assert.equal(checked.fields.columns.max,6);
  assert.equal(checked.fields.layout.options[1].value,"stacked");
  assert.equal(checked.fields.background.binding,"style");
  assert.equal(checked.fields.fontRole.type,"font_role");
  assert.equal(checked.fields.heroMedia.type,"media");
  assert.equal(checked.settings.heroMedia,"media_687");
});

test("initial values cannot invent public schema or override declared types", () => {
  assert.throws(() => normalizeSettingFields(definition.settings,{...settings,unknown:"x"}),/Undeclared/);
  assert.throws(() => normalizeSettingFields(definition.settings,{...settings,columns:"4"}),/Invalid instance value/);
  assert.throws(() => normalizeSettingFields(definition.settings,{...settings,columns:7}),/Invalid instance value/);
  const unsupported = structuredClone(definition.settings);
  unsupported.headline.type = "mystery";
  assert.throws(() => normalizeSettingFields(unsupported,settings),/Unsupported generated setting type/);
});

test("content and visual settings require their declared bindings", () => {
  assert.equal(inspect().ok,true);
  const noContent = inspect(definition,settings,{
    ...canonical,
    html:canonical.html.replace(' data-cms="headline"',""),
  });
  assert.match(noContent.error,/editable markup binding: headline/);

  const noVisual = inspect(definition,settings,{
    ...canonical,
    css:canonical.css.replace("var(--__UID__-setting-background)","#000"),
  });
  assert.match(noVisual.error,/CSS variable binding: background/);
});

test("materialization binds visual settings to the placed instance namespace", () => {
  const checked = inspect();
  assert.equal(checked.ok,true,checked.error);
  const first = materializeGeneratedImplementation(canonical,"cmss_first",checked.fields,checked.settings);
  const second = materializeGeneratedImplementation(canonical,"cmss_second",checked.fields,checked.settings);
  assert.match(first.css,/--agentsam-gen-cmss-first-setting-columns:4/);
  assert.match(first.css,/--agentsam-gen-cmss-first-setting-background:#121212/);
  assert.match(first.html,/data-agentsam-block="cmss-first"/);
  assert.match(second.html,/data-agentsam-block="cmss-second"/);
  assert.notEqual(first.html,second.html);
  assert.equal(first.css.includes("__UID__"),false);
});

test("static acceptance rejects interactive and native artifact classes", () => {
  assert.match(inspect({...definition,implementation_class:"artifact_interactive"}).error,/not wired/);
  assert.match(inspect({...definition,implementation_class:"native"}).error,/Only artifact_static/);
  assert.match(inspect(definition,settings,{...canonical,js:"window.foo=1"}).error,/script-free/);
});

test("shared CSS linter requires every selector to root in the placed instance", () => {
  const forms = nsForms("cmsb_unique");
  const html = '<div data-agentsam-block="' + forms.blockId + '"></div>';
  assert.equal(lintGeneratedBlock({html,css:forms.scope + " h2{color:red}",js:""},forms).ok,true);
  for (const extra of [
    ".agentsam-gen-cmsb-unique:hover{color:blue}",
    "body{opacity:0}",
    forms.scope + "evil{color:red}",
  ]) {
    const lint = lintGeneratedBlock({html,css:forms.scope + " h2{color:red}" + extra,js:""},forms);
    assert.equal(lint.ok,false,extra);
  }
});

test("multi-agent provenance never changes the AgentSam implementation namespace", () => {
  const record = provenanceRecord({
    namespace:"claude",
    provider:"anthropic",
    model:"claude",
    source_agent:"worker-3",
    generation_id:"gen123",
    source_ref:"donor/revise",
    normalized_by:"agentsam-intake",
  });
  assert.equal(record.namespace,"agentsam");
  assert.equal(record.provider,"anthropic");
  assert.equal(record.source_agent,"worker-3");
  assert.equal(record.generation_id,"gen123");
  assert.equal(record.source_ref,"donor/revise");
});

function database() {
  const db = new DatabaseSync(":memory:");
  const root = new URL("../db/schema/",import.meta.url);
  db.exec(readFileSync(new URL("accounts.stub.sql",root),"utf8") + "\n" +
    readFileSync(new URL("cms.sql",root),"utf8"));
  db.prepare("INSERT INTO accounts(id) VALUES ('acct-z')").run();
  db.prepare("INSERT INTO cms_pages(id,account_id,slug,title) VALUES ('page-z','acct-z','mine','Mine')").run();
  db.prepare("INSERT INTO cms_page_sections(id,account_id,page_id,section_key,section_type) VALUES ('section-a','acct-z','page-z','first','group'),('section-b','acct-z','page-z','second','group')").run();
  return db;
}

test("the same semantic block key in different sections shares code but never an instance namespace", async () => {
  const db = database();
  try {
    const objects = createMemoryObjectStore();
    const repo = createGeneratedBlockRepository(createSqlStore(db),objects);
    const manifest = {
      definition:{kind:"block",type:"button"},
      canonical:{
        html:'<div data-agentsam-block="__UID__" class="__UID__"><a href="/shop">Shop</a></div>',
        css:'[data-agentsam-block="__UID__"] .__UID__ {color:var(--__UID__-ink)}',
        js:"",
      },
    };
    const first = await repo.saveGenerated({accountId:"acct-z",sectionId:"section-a",blockKey:"button",manifest});
    const second = await repo.saveGenerated({accountId:"acct-z",sectionId:"section-b",blockKey:"button",manifest});
    assert.equal(first.ok,true,first.error);
    assert.equal(second.ok,true,second.error);
    assert.notEqual(first.instanceId,second.instanceId);
    assert.equal(first.artifactId,second.artifactId);

    const left = await repo.releaseBuild("acct-z","section-a");
    const right = await repo.releaseBuild("acct-z","section-b");
    assert.equal(left.ok,true,left.error);
    assert.equal(right.ok,true,right.error);
    assert.notEqual(left.output[0].html,right.output[0].html);
    assert.equal(left.output[0].html.includes("__UID__"),false);
    assert.equal(right.output[0].css.includes("__UID__"),false);
  } finally {
    db.close();
  }
});
