import fs from "node:fs";
import crypto from "node:crypto";

const fixture = JSON.parse(fs.readFileSync(new URL("../apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json", import.meta.url)));
const mediaMap = JSON.parse(fs.readFileSync(new URL("../apps/ecommerce-cms-agentsam/fixtures/fnf-revise-media-map.json", import.meta.url)));
const page = fixture.pages.find((candidate) => candidate.id === "campaigns");
if (!page) throw new Error("Missing campaigns fixture");

const q = (value) => "'" + String(value ?? "").replaceAll("'", "''") + "'";
const j = (value) => q(JSON.stringify(value));
const safe = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 72);
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const account = "(SELECT account_id FROM cms_pages ORDER BY created_at,id LIMIT 1)";
const lines = [];
const emit = (...parts) => lines.push(...parts);

const sectionLabels = {
  "editorial-grid": "Revise · Dark Promo Grid",
  "collection-split-media": "Revise · Pinned Media Grid",
  "before-after": "Revise · Before / After",
  "testimonials": "Revise · Testimonials"
};

const blockDefinitions = {
  group: {layout:{type:"text"},gap:{type:"text"},alignment:{type:"text"}},
  heading: {text:{type:"text"},level:{type:"number"}},
  text: {text:{type:"textarea"}},
  image: {asset_id:{type:"media"},alt:{type:"text"},link:{type:"link"}},
  button: {label:{type:"text"},href:{type:"link"},style:{type:"text"}}
};

function mediaForSection(section) {
  const found = {};
  const scan = (value) => {
    if (typeof value === "string" && mediaMap[value]) found[value] = mediaMap[value].url;
    else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === "object") Object.values(value).forEach(scan);
  };
  scan(section.data);
  scan(section.blocks);
  return found;
}

function portableContent(section) {
  const content = structuredClone(section.data || {});
  const blocks = (section.blocks || []).map((block) => ({
    id: block.id,
    templateKey: "item",
    enabled: true
  }));
  if (blocks.length) {
    delete content.items;
    for (const block of section.blocks || []) content[block.id] = structuredClone(block.data || {});
  }
  const presetSlug = String(section.preset || "").split("/")[1] || section.type;
  content.__editor = {
    templateKey: "portable",
    themePreset: "revise-atlas/" + presetSlug,
    sourcePreset: section.preset,
    sourceContract: "revise/site-section-v1",
    blocks,
    media: mediaForSection(section)
  };
  return content;
}

emit(
  "-- Generated from apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json",
  "-- Draft-only compatibility + canonical projection. Existing rows are never overwritten.",
  "PRAGMA foreign_keys = ON;",
  "",
  "INSERT INTO pages (slug,title,status) SELECT " + q(page.id) + "," + q(page.title) + ",'draft'",
  "WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug=" + q(page.id) + ");",
  "",
  "INSERT INTO cms_pages (id,account_id,legacy_page_id,slug,title,page_type,status,template_key,metadata_json)",
  "SELECT " + q("cmsp_revise_campaigns") + "," + account + ",p.id,p.slug,p.title,'standard','draft','revise'," +
    j({source:"fnf-revise-site",theme:"revise",path:page.path,description:page.description,import:"canonical-seed-v1"}),
  "FROM pages p WHERE p.slug=" + q(page.id) +
    " AND NOT EXISTS (SELECT 1 FROM cms_pages cp WHERE cp.account_id=" + account + " AND cp.slug=p.slug);",
  ""
);

for (const [key, schema] of Object.entries(blockDefinitions)) {
  emit(
    "INSERT INTO cms_definitions (account_id,definition_key,kind,label,category,origin,version,settings_schema_json,allowed_blocks_json,metadata_json,status)",
    "SELECT " + account + "," + q(key) + ",'block'," + q(key[0].toUpperCase() + key.slice(1)) +
      ",'basic','built_in','1'," + j(schema) + ",'[]'," + j({canonical:true,source:"cms-block-types"}) + ",'active'",
    "WHERE NOT EXISTS (SELECT 1 FROM cms_definitions d WHERE d.account_id=" + account +
      " AND d.kind='block' AND d.definition_key=" + q(key) + " AND d.version='1');",
    ""
  );
}

for (const section of page.sections) {
  const fields = Object.fromEntries(Object.keys(section.data || {}).filter((key) => key !== "items")
    .map((key) => [key, {type:/body|description/i.test(key) ? "textarea" : /mediaKey|beforeKey|afterKey/i.test(key) ? "media" : "text"}]));
  const hasBlocks = Boolean(section.blocks?.length);
  emit(
    "INSERT INTO cms_definitions (account_id,definition_key,kind,label,category,origin,version,settings_schema_json,allowed_blocks_json,max_blocks,metadata_json,status)",
    "SELECT " + account + "," + q(section.type) + ",'section'," + q(sectionLabels[section.type] || section.type) +
      ",'Revise','package','1'," + j(fields) + "," + j(hasBlocks ? ["group"] : []) + "," + (hasBlocks ? "100" : "0") + "," +
      j({theme:"revise",preset:"revise-atlas/" + section.preset.split("/")[1],source_preset:section.preset,source_contract:"revise/site-section-v1"}) + ",'active'",
    "WHERE NOT EXISTS (SELECT 1 FROM cms_definitions d WHERE d.account_id=" + account +
      " AND d.kind='section' AND d.definition_key=" + q(section.type) + " AND d.version='1');",
    ""
  );
}

function emitChild(section, block, field, value, parentId, order) {
  const blockKey = safe(block.id + "-" + field);
  const id = "cmsb_revise_" + safe(section.id + "_" + block.id + "_" + field);
  let type = "text";
  let content = {text:String(value)};
  if (field === "title") { type = "heading"; content = {text:String(value),level:3}; }
  if (field === "href") { type = "button"; content = {label:block.data.title || block.data.label || "Open",href:String(value),style:"link"}; }

  if (field === "mediaKey") {
    const media = mediaMap[value];
    if (!media) return;
    emit(
      "INSERT INTO cms_section_blocks (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,source_path,metadata_json)",
      "SELECT " + q(id) + ",s.account_id,s.id," + q(parentId) + "," + q(blockKey) + ",'image'," + order + ",'active'," +
        "json_object('asset_id',(SELECT id FROM media_assets WHERE r2_key=" + q(media.r2_key) + " LIMIT 1),'alt'," +
        q(block.data.title || section.data.mediaAlt || "") + ",'link'," + q(block.data.href || "") + ")," +
        q("$.blocks." + block.id + "." + field) + "," + j({source_theme:"revise",media_key:value,r2_key:media.r2_key}),
      "FROM cms_page_sections s JOIN cms_pages p ON p.id=s.page_id WHERE p.slug=" + q(page.id) +
        " AND s.section_key=" + q(section.id) +
        " AND NOT EXISTS (SELECT 1 FROM cms_section_blocks b WHERE b.section_id=s.id AND b.block_key=" + q(blockKey) + ");",
      ""
    );
    return;
  }

  emit(
    "INSERT INTO cms_section_blocks (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,source_path,metadata_json)",
    "SELECT " + q(id) + ",s.account_id,s.id," + q(parentId) + "," + q(blockKey) + "," + q(type) + "," + order +
      ",'active'," + j(content) + "," + q("$.blocks." + block.id + "." + field) + "," + j({source_theme:"revise",source_field:field}),
    "FROM cms_page_sections s JOIN cms_pages p ON p.id=s.page_id WHERE p.slug=" + q(page.id) +
      " AND s.section_key=" + q(section.id) +
      " AND NOT EXISTS (SELECT 1 FROM cms_section_blocks b WHERE b.section_id=s.id AND b.block_key=" + q(blockKey) + ");",
    ""
  );
}

page.sections.forEach((section, sectionIndex) => {
  const content = portableContent(section);
  const digest = hash(content);

  emit(
    "INSERT INTO page_sections (page_id,section_key,sort_order,content_json,status,content_version,content_hash)",
    "SELECT p.id," + q(section.id) + "," + (sectionIndex * 10) + "," + j(content) + ",'draft',1," + q(digest) +
      " FROM pages p WHERE p.slug=" + q(page.id) +
      " AND NOT EXISTS (SELECT 1 FROM page_sections ps WHERE ps.page_id=p.id AND ps.section_key=" + q(section.id) + ");",
    "",
    "INSERT INTO cms_page_sections (id,account_id,page_id,legacy_section_id,section_key,section_type,sort_order,status,inline_content_json,content_version,content_hash,metadata_json)",
    "SELECT " + q("cmss_revise_" + safe(section.id)) + ",cp.account_id,cp.id,ps.id,ps.section_key," + q(section.type) +
      ",ps.sort_order,'draft',ps.content_json,1,ps.content_hash," +
      j({source_theme:"revise",source_preset:section.preset,donor_section_id:section.id,canonical_blocks:true,inline_projection:"reviseAtlas"}) +
      " FROM page_sections ps JOIN pages p ON p.id=ps.page_id JOIN cms_pages cp ON cp.legacy_page_id=p.id" +
      " WHERE p.slug=" + q(page.id) + " AND ps.section_key=" + q(section.id) +
      " AND NOT EXISTS (SELECT 1 FROM cms_page_sections s WHERE s.page_id=cp.id AND s.section_key=ps.section_key);",
    ""
  );

  for (const [blockIndex, block] of (section.blocks || []).entries()) {
    const parentId = "cmsb_revise_" + safe(section.id + "_" + block.id);
    emit(
      "INSERT INTO cms_section_blocks (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,status,content_json,source_path,metadata_json)",
      "SELECT " + q(parentId) + ",s.account_id,s.id,NULL," + q(safe(block.id)) + ",'group'," + (blockIndex * 10) +
        ",'active'," + j({layout:"card",gap:"sm",alignment:"start"}) + "," + q("$.blocks." + block.id) + "," +
        j({source_theme:"revise",source_block_type:block.type || "item",source_data:block.data}),
      "FROM cms_page_sections s JOIN cms_pages p ON p.id=s.page_id WHERE p.slug=" + q(page.id) +
        " AND s.section_key=" + q(section.id) +
        " AND NOT EXISTS (SELECT 1 FROM cms_section_blocks b WHERE b.section_id=s.id AND b.block_key=" + q(safe(block.id)) + ");",
      ""
    );
    let order = 0;
    for (const [field, value] of Object.entries(block.data || {})) {
      if (value == null || typeof value === "object") continue;
      emitChild(section, block, field, value, parentId, order);
      order += 10;
    }
  }

  emit(
    "INSERT INTO cms_revisions (id,account_id,entity_type,entity_id,revision_number,revision_kind,content_hash,snapshot_json,metadata_json)",
    "SELECT " + q("cmsr_revise_" + safe(section.id) + "_v1") + ",s.account_id,'section',s.id,1,'imported',s.content_hash,s.inline_content_json," +
      j({source_theme:"revise",source_preset:section.preset,import:"canonical-seed-v1"}) +
      " FROM cms_page_sections s JOIN cms_pages p ON p.id=s.page_id WHERE p.slug=" + q(page.id) +
      " AND s.section_key=" + q(section.id) +
      " AND NOT EXISTS (SELECT 1 FROM cms_revisions r WHERE r.entity_type='section' AND r.entity_id=s.id AND r.revision_number=1 AND r.revision_kind='imported');",
    ""
  );
});

emit(
  "INSERT INTO cms_revisions (id,account_id,entity_type,entity_id,revision_number,revision_kind,snapshot_json,metadata_json)",
  "SELECT 'cmsr_revise_campaigns_v1',p.account_id,'page',p.id,1,'imported'," +
    j({slug:page.id,title:page.title,template_key:"revise",source_path:page.path}) + "," +
    j({source_theme:"revise",import:"canonical-seed-v1"}) +
    " FROM cms_pages p WHERE p.slug=" + q(page.id) +
    " AND NOT EXISTS (SELECT 1 FROM cms_revisions r WHERE r.entity_type='page' AND r.entity_id=p.id AND r.revision_number=1 AND r.revision_kind='imported');",
  ""
);

const output = lines.join("\n") + "\n";
const target = process.argv.find((arg) => arg.startsWith("--out="));
if (target) fs.writeFileSync(target.slice(6), output);
else process.stdout.write(output);
