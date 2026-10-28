/**
 * Completeful catalog query contract — category, method, holiday and occasion
 * are OR within each group and AND across groups. All filtering happens on
 * server-loaded mirror rows; callers receive facet counts excluding each
 * facet's own active selection. No fabricated supplier product variants.
 */
export const CATALOG_FACETS = Object.freeze({
  category: Object.freeze([
    {value:"apparel",label:"Apparel"}, {value:"drinkware",label:"Drinkware"},
    {value:"barware",label:"Barware"}, {value:"home",label:"Home & decor"},
    {value:"hats",label:"Hats"}, {value:"bags",label:"Bags"},
    {value:"accessories",label:"Accessories"},
  ]),
  printType: Object.freeze([
    {value:"dtg",label:"DTG"}, {value:"sublimation",label:"Sublimation"},
    {value:"engraving",label:"Engraving"}, {value:"etching",label:"Etching"},
    {value:"embroidery",label:"Embroidery"}, {value:"uv",label:"UV"},
    {value:"predefined",label:"Predefined"},
  ]),
  holiday: Object.freeze([
    {value:"christmas",label:"Christmas"}, {value:"valentines-day",label:"Valentine's Day"},
    {value:"mothers-day",label:"Mother's Day"}, {value:"fathers-day",label:"Father's Day"},
    {value:"halloween",label:"Halloween"},
  ]),
  occasion: Object.freeze([
    {value:"groomsmen-gift",label:"Groomsmen"}, {value:"bridesmaid-gift",label:"Bridesmaid"},
    {value:"retirement",label:"Retirement"}, {value:"housewarming",label:"Housewarming"},
    {value:"birthday",label:"Birthday"}, {value:"wedding",label:"Wedding"},
  ]),
});
export const CATALOG_SORT_KEYS = Object.freeze(["catalog","name","newest","popular","mockups","price-low","price-high"]);
const GROUPS = Object.freeze(["category","printType","holiday","occasion"]);
const ALLOWED = Object.fromEntries(GROUPS.map(g => [g, new Set(CATALOG_FACETS[g].map(o => o.value))]));
const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
};
const values = (value, group) => [...new Set(String(value || "").split(",").map(x => x.trim().toLowerCase()).filter(x => ALLOWED[group].has(x)))].slice(0,16);
const bool = value => value === "1" || value === "true";
export function readCatalogQuery(input) {
  const p = input instanceof URLSearchParams ? input : new URLSearchParams(input || "");
  const sort = p.get("sort") || "catalog";
  const priceMin = clamp(p.get("price_min") || 0,0,10000000,0);
  const priceMax = p.has("price_max") ? clamp(p.get("price_max"),0,10000000,10000000) : null;
  const categories = values(p.get("category"),"category");
  const legacyCategory = p.get("category");
  return {
    q: String(p.get("q") || p.get("search") || "").slice(0,160).trim(),
    sort: CATALOG_SORT_KEYS.includes(sort) ? sort : "catalog",
    category: categories,
    printType: values(p.get("print"),"printType"),
    holiday: values(p.get("holiday"),"holiday"),
    occasion: values(p.get("occasion"),"occasion"),
    hasMockups: bool(p.get("has_mockups")),
    available: bool(p.get("available")),
    recent: legacyCategory === "recent" || bool(p.get("recent")),
    favorite: bool(p.get("favorite")),
    priceMin, priceMax,
    page: clamp(p.get("page") || (p.has("offset")?1+Math.floor(Number(p.get("offset"))/clamp(p.get("limit")||24,1,200,24)):1),1,10000,1),
  };
}
export function writeCatalogQuery(q) {
  const p = new URLSearchParams();
  if (q.q) p.set("q",q.q);
  if (q.sort && q.sort !== "catalog") p.set("sort",q.sort);
  for (const [field,key] of [["category","category"],["printType","print"],["holiday","holiday"],["occasion","occasion"]]) {
    if (q[field]?.length) p.set(key,q[field].join(","));
  }
  if (q.hasMockups) p.set("has_mockups","1");
  if (q.available) p.set("available","1");
  if (q.recent) p.set("recent","1");
  if (q.favorite) p.set("favorite","1");
  if (q.priceMin) p.set("price_min",String(q.priceMin));
  if (q.priceMax !== null && q.priceMax !== undefined) p.set("price_max",String(q.priceMax));
  if ((q.page||1)>1) p.set("page",String(q.page));
  return p;
}
export function catalogActiveFilterCount(q) {
  return GROUPS.reduce((n,k)=>n+(q[k]?.length||0),0)+
    Number(Boolean(q.q))+Number(q.sort!=="catalog")+
    ["hasMockups","available","recent","favorite"].reduce((n,k)=>n+Number(Boolean(q[k])),0)+
    Number(q.priceMin>0)+Number(q.priceMax!==null&&q.priceMax!==undefined);
}
const lower = s => String(s||"").toLowerCase();
const has = (hay, needles) => needles.some(x => hay.includes(x));
export function catalogTags(row) {
  try {const tags=JSON.parse(row.tags_json||"[]");return Array.isArray(tags)?tags.map(lower):[];}catch{return [];}
}
function inferredCategories(row, tags) {
  const name=lower(row.name), group=lower(row.local_group), t=tags.join(" ");
  const hay=[name,t].join(" ");
  const set=new Set();
  const mark=(id,yes)=>{if(yes||group===id)set.add(id);};
  mark("apparel",has(hay,["shirt","tee","hood","sweat","jacket","polo","tank","jersey","legging","jogger","shorts","pants","raglan","vest","apparel"]));
  mark("drinkware",has(hay,["tumbler","bottle","mug","cup","drinkware","glass","flask","decanter"]));
  mark("barware",has(hay,["barware","pint","wine","beer","flask","whiskey","decanter","shot glass"]));
  mark("home",has(hay,["frame","decor","sign","wall art","cutting board","coaster","ornament"]));
  mark("hats",has(hay,["hat","cap","beanie","trucker"]));
  mark("bags",has(hay,["bag","tote","backpack","duffel"]));
  mark("accessories",has(hay,["journal","keychain","coaster","sunglass","wallet","flask","ornament","accessor"]));
  // Exact curated merchant group is additive: a supplier product can span categories.
  if(group && ALLOWED.category.has(group))set.add(group);
  return [...set];
}
function normalizedMethod(text) {
  const s=lower(text);
  return CATALOG_FACETS.printType.map(x=>x.value).filter(m=>new RegExp("(^|[^a-z])"+m+"([^a-z]|$)").test(s));
}
function matchedHoliday(tags,value) {
  const probes={"valentines-day":["valentine"],"mothers-day":["mother's day","mothers day","mom gift"],"fathers-day":["father's day","fathers day","dad gift"],"christmas":["christmas"],"halloween":["halloween"]};
  return tags.some(tag=>has(tag,probes[value]||[value]));
}
function matchedOccasion(tags,value) {
  const probes={"groomsmen-gift":["groomsmen","groomsman"],"bridesmaid-gift":["bridesmaid"],"housewarming":["housewarming"],"retirement":["retirement"],"birthday":["birthday"],"wedding":["wedding"]};
  return tags.some(tag=>has(tag,probes[value]||[value]));
}
export function catalogFacetsFor(row) {
  const tags=catalogTags(row);
  return {
    category: inferredCategories(row,tags),
    printType: normalizedMethod([row.print_type,row.product_type].join(" ")),
    holiday: CATALOG_FACETS.holiday.filter(x=>matchedHoliday(tags,x.value)).map(x=>x.value),
    occasion: CATALOG_FACETS.occasion.filter(x=>matchedOccasion(tags,x.value)).map(x=>x.value),
  };
}
function checkCatalog(row,query,omit) {
  const fields=row._facets||catalogFacetsFor(row);
  for(const group of GROUPS) {
    if(group!==omit && query[group]?.length && !query[group].some(v=>fields[group].includes(v))) return false;
  }
  if(query.q&&!has([row.name,row.sku,row.print_type,row.material,row.tags_json].map(lower).join(" "),[lower(query.q)]))return false;
  if(query.hasMockups && !(Number(row.mockup_count)>0))return false;
  if(query.available && !Boolean(Number(row.available)))return false;
  if(query.recent && !row.last_used_at)return false;
  if(query.favorite && !Number(row.is_favorite))return false;
  const cost=Number(row.fulfillment_cost_free_cents);
  if(query.priceMin>0 && (!Number.isFinite(cost)||cost<query.priceMin))return false;
  if(query.priceMax!==null&&query.priceMax!==undefined && (!Number.isFinite(cost)||cost>query.priceMax))return false;
  return true;
}
export function filterCatalogRows(rows,query) {
  const enriched=rows.map(row=>({...row,_facets:catalogFacetsFor(row)}));
  const facets={};
  for(const group of GROUPS){
    const candidates=enriched.filter(row=>checkCatalog(row,query,group));
    facets[group]=Object.fromEntries(CATALOG_FACETS[group].map(option=>[
      option.value,candidates.filter(row=>row._facets[group].includes(option.value)).length
    ]));
  }
  const selected=enriched.filter(row=>checkCatalog(row,query));
  const number=v=>Number(v)||0;
  selected.sort((a,b)=>{
    switch(query.sort){
      case "name": return a.name.localeCompare(b.name);
      case "newest": return lower(b.created_at).localeCompare(lower(a.created_at));
      case "popular": return number(b.priority)-number(a.priority)||number(b.is_favorite)-number(a.is_favorite);
      case "mockups": return number(b.mockup_count)-number(a.mockup_count);
      case "price-low": return number(a.fulfillment_cost_free_cents)-number(b.fulfillment_cost_free_cents);
      case "price-high": return number(b.fulfillment_cost_free_cents)-number(a.fulfillment_cost_free_cents);
      default:return number(b.is_favorite)-number(a.is_favorite)||number(b.priority)-number(a.priority)||a.name.localeCompare(b.name);
    }
  });
  return {selected,facets};
}
