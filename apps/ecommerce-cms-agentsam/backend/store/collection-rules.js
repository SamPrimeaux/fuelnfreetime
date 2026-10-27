import {
  DEFAULT_COLLECTION_RULES, normalizeCollectionRules, resolveCollectionMembers,
} from "../../../../packages/agentsam-merch/src/collection-planning.js";

export { normalizeCollectionRules, resolveCollectionMembers };

export async function loadCollectionRules(env, collectionId) {
  try {
    const row = await env.DB.prepare("SELECT config_json FROM store_collection_rules WHERE collection_id = ?")
      .bind(collectionId).first();
    if (!row) return { ...DEFAULT_COLLECTION_RULES };
    return normalizeCollectionRules(JSON.parse(row.config_json || "{}"));
  } catch (error) {
    // Upgraded code may deploy before its additive SQL migration. Historical
    // collections must remain functional in manual mode until migration.
    if (/no such table/i.test(String(error?.message || error)))
      return { ...DEFAULT_COLLECTION_RULES };
    throw error;
  }
}


export async function withDynamicCollectionCounts(env, collections) {
  const rows = [...(collections || [])];
  if (!rows.length) return rows;
  const ids = rows.map(row => Number(row.id)).filter(id => Number.isSafeInteger(id) && id > 0);
  if (!ids.length) return rows;
  let configs;
  try {
    ({results:configs} = await env.DB.prepare(
      "SELECT collection_id,config_json FROM store_collection_rules WHERE collection_id IN (" +
      ids.map(() => "?").join(",") + ")"
    ).bind(...ids).all());
  } catch (error) {
    if (/no such table/i.test(String(error?.message || error))) return rows;
    throw error;
  }
  const automatics = (configs || []).map(item => {
    const rules = normalizeCollectionRules(JSON.parse(item.config_json || "{}"));
    return {id: Number(item.collection_id),rules};
  }).filter(item => item.rules.mode !== "manual");
  if (!automatics.length) return rows;
  const activeIds = automatics.map(item => item.id);
  const [{results:catalog},{results:manual}] = await Promise.all([
    env.DB.prepare("SELECT id,title,slug,collection,status FROM products WHERE status='active'").all(),
    env.DB.prepare("SELECT collection_id,product_id FROM store_collection_products WHERE collection_id IN (" +
      activeIds.map(() => "?").join(",") + ") ORDER BY sort_order,product_id").bind(...activeIds).all(),
  ]);
  return rows.map(row => {
    const configured=automatics.find(item=>item.id===Number(row.id));
    if(!configured)return row;
    const assigned=(manual||[]).filter(item=>Number(item.collection_id)===configured.id)
      .map(item=>Number(item.product_id));
    return {...row,product_count:resolveCollectionMembers(catalog||[],assigned,configured.rules).length};
  });
}
