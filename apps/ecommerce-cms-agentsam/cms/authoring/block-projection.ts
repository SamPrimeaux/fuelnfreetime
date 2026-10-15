/**
 * Canonical block projection from an existing, saved section document.
 *
 * The current storefront renderer still reads the versioned R2 section body.
 * This creates/updates the SAME block placements in cms_section_blocks, with
 * source metadata and revision receipts, without fabricating a second CMS.
 *
 * Only explicitly editor-owned rows may be updated/archived. Existing
 * generated/imported artifact-backed rows are never overwritten.
 */
export type BlockSource = {
  id: string;
  templateKey: string;
  enabled?: boolean;
  parentBlockId?: string | null;
};
export type BlockPlan = {
  id: string;
  templateKey: string;
  status: 'active' | 'hidden';
  contentJson: string;
  sortOrder: number;
};
export type ProjectionResult = {
  status: 'not_applicable' | 'unchanged' | 'applied';
  inserted: number;
  updated: number;
  archived: number;
};
type CanonicalRow = {
  id: string;
  block_key: string;
  block_type: string;
  sort_order: number;
  status: string;
  content_json: string;
  metadata_json: string;
  artifact_id: string | null;
  parent_block_id: string | null;
};
export type SqlDb = {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown>; all(): Promise<{results?: CanonicalRow[]}> } };
  batch(queries: Array<{run(): Promise<unknown>}>): Promise<unknown>;
};
const INSTANCE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const TYPE_KEY = /^[a-z][a-z0-9-]{0,63}$/;
const OWNER = 'theme-studio-v1';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function error(code: string): never {
  throw Object.assign(new Error('cms_block_' + code), { status: 409, code: 'cms_block_' + code });
}
function parsedMeta(json: string): Record<string, unknown> {
  try {
    const meta: unknown = JSON.parse(json);
    return isRecord(meta) ? meta : {};
  } catch { return {}; }
}
function objectJson(value: unknown): string {
  if (!isRecord(value)) error('invalid_block_settings');
  const serialized = JSON.stringify(value);
  if (serialized.length > 131072) error('block_settings_too_large');
  return serialized;
}

/**
 * Undefined means the source never declared a block collection. Do not
 * interpret that as an instruction to empty any existing canonical rows.
 */
export function planEditorBlocks(content: unknown): BlockPlan[] | null {
  if (!isRecord(content)) return null;
  if (!isRecord(content.__editor) || !Array.isArray(content.__editor.blocks)) return null;
  const list = content.__editor.blocks;
  if (list.length > 500) error('too_many_blocks');
  const seen = new Set<string>();
  const plan: BlockPlan[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const block: unknown = list[index];
    if (!isRecord(block)) error('invalid_block');
    const id = block.id;
    const templateKey = block.templateKey;
    if (typeof id !== 'string' || !INSTANCE_KEY.test(id) ||
        typeof templateKey !== 'string' || !TYPE_KEY.test(templateKey))
      error('invalid_block_identity');
    if (seen.has(id)) error('duplicate_block_identity');
    seen.add(id);
    // This version projects flat editor blocks only. Nested blocks remain in
    // their already-authoritative canonical tree and cannot be flattened here.
    if (block.parentBlockId !== undefined && block.parentBlockId !== null)
      error('nested_block_requires_native_writer');
    const settingValue = content[id] ?? {};
    plan.push({
      id, templateKey, sortOrder:index * 10,
      status:block.enabled === false ? 'hidden' : 'active',
      contentJson:objectJson(settingValue),
    });
  }
  return plan;
}

export async function reconcileCanonicalBlocks(
  db: SqlDb, input: {
    accountId: string;
    sectionId: string;
    content: unknown;
  }
): Promise<ProjectionResult> {
  const desired = planEditorBlocks(input.content);
  if (desired === null) return {status:'not_applicable',inserted:0,updated:0,archived:0};
  if (!input.accountId || !input.sectionId) error('missing_scope');

  const existingResult = await db.prepare(
    `SELECT id,block_key,block_type,sort_order,status,content_json,metadata_json,
            artifact_id,parent_block_id
       FROM cms_section_blocks WHERE account_id=? AND section_id=? ORDER BY sort_order,id`
  ).bind(input.accountId,input.sectionId).all();
  const rows = existingResult.results || [];
  const byKey = new Map(rows.map(row => [row.block_key,row]));
  const requested = new Set(desired.map(item => item.id));
  const insertions: Array<{id:string;plan:BlockPlan}> = [];
  const updates: Array<{id:string;plan:BlockPlan}> = [];
  const archives: string[] = [];

  // Validate the ENTIRE operation before starting its D1 transaction.
  for (const item of desired) {
    const old = byKey.get(item.id);
    if (!old) {
      insertions.push({id:'cmsb_' + crypto.randomUUID().replace(/-/g,'').slice(0,16),plan:item});
      continue;
    }
    const meta = parsedMeta(old.metadata_json);
    if (meta.source !== OWNER || old.artifact_id || old.parent_block_id ||
        old.block_type !== item.templateKey)
      error('unmanaged_block_collision:' + item.id);
    if (old.content_json !== item.contentJson || Number(old.sort_order) !== item.sortOrder ||
        old.status !== item.status)
      updates.push({id:old.id,plan:item});
  }
  for (const old of rows) {
    const meta = parsedMeta(old.metadata_json);
    if (meta.source !== OWNER || requested.has(old.block_key)) continue;
    if (old.artifact_id || old.parent_block_id) error('unmanaged_block_collision:' + old.block_key);
    if (old.status !== 'archived') archives.push(old.id);
  }
  if (!insertions.length && !updates.length && !archives.length)
    return {status:'unchanged',inserted:0,updated:0,archived:0};

  const statements: Array<{run(): Promise<unknown>}> = [];
  const receipt = (id: string, snapshot: Record<string, unknown>) =>
    statements.push(db.prepare(
      `INSERT INTO cms_revisions
        (account_id,entity_type,entity_id,revision_number,revision_kind,snapshot_json,metadata_json)
       SELECT ?,'block',?,COALESCE(MAX(revision_number),0)+1,'draft',?,?
       FROM cms_revisions WHERE account_id=? AND entity_type='block' AND entity_id=?`
    ).bind(
      input.accountId,id,JSON.stringify(snapshot),
      JSON.stringify({source:OWNER}),input.accountId,id
    ));
  for (const {id,plan} of insertions) {
    statements.push(db.prepare(
      `INSERT INTO cms_section_blocks
        (id,account_id,section_id,parent_block_id,block_key,block_type,sort_order,
         status,content_json,metadata_json)
       VALUES (?,?,?,NULL,?,?,?, ?,?,?)`
    ).bind(
      id,input.accountId,input.sectionId,plan.id,plan.templateKey,plan.sortOrder,
      plan.status,plan.contentJson,JSON.stringify({source:OWNER,sourceBlockId:plan.id})
    ));
    receipt(id,{...plan,operation:'insert'});
  }
  for (const {id,plan} of updates) {
    statements.push(db.prepare(
      `UPDATE cms_section_blocks SET sort_order=?,status=?,content_json=?,
       updated_at=datetime('now') WHERE id=? AND account_id=? AND section_id=?`
    ).bind(plan.sortOrder,plan.status,plan.contentJson,id,input.accountId,input.sectionId));
    receipt(id,{...plan,operation:'update'});
  }
  for (const id of archives) {
    statements.push(db.prepare(
      `UPDATE cms_section_blocks SET status='archived',updated_at=datetime('now')
       WHERE id=? AND account_id=? AND section_id=?`
    ).bind(id,input.accountId,input.sectionId));
    receipt(id,{operation:'archive'});
  }

  // All block rows and their receipts commit as one D1 transaction.
  await db.batch(statements);
  return {
    status:'applied',
    inserted:insertions.length,updated:updates.length,archived:archives.length,
  };
}
