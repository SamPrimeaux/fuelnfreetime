/**
 * media_asset_jobs helpers — D1 job ledger for automatic asset processing.
 */

export function newJobId() {
  return `maj_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * @param {any} env
 * @param {{
 *   id?: string,
 *   mediaAssetId?: number|null,
 *   intakeKey: string,
 *   canonicalKey?: string|null,
 *   pipeline?: string|null,
 *   plan?: object,
 * }} input
 */
export async function createAssetJob(env, input) {
  const id = input.id || newJobId();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO media_asset_jobs
       (id, media_asset_id, intake_key, canonical_key, pipeline, status, attempts, plan_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'queued', 0, ?, ?, ?)`,
  )
    .bind(
      id,
      input.mediaAssetId ?? null,
      input.intakeKey,
      input.canonicalKey ?? null,
      input.pipeline ?? null,
      JSON.stringify(input.plan || {}),
      now,
      now,
    )
    .run();
  return id;
}

export async function getAssetJob(env, jobId) {
  return env.DB.prepare(`SELECT * FROM media_asset_jobs WHERE id = ?`).bind(jobId).first();
}

export async function markJobProcessing(env, jobId) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE media_asset_jobs
     SET status = 'processing', attempts = attempts + 1, started_at = COALESCE(started_at, ?), updated_at = ?
     WHERE id = ?`,
  )
    .bind(now, now, jobId)
    .run();
}

export async function markJobSucceeded(env, jobId, result) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE media_asset_jobs
     SET status = 'succeeded', result_json = ?, finished_at = ?, updated_at = ?, last_error = NULL
     WHERE id = ?`,
  )
    .bind(JSON.stringify(result || {}), now, now, jobId)
    .run();
}

export async function markJobFailed(env, jobId, error) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE media_asset_jobs
     SET status = 'failed', last_error = ?, finished_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(String(error || "failed").slice(0, 1000), now, now, jobId)
    .run();
}

export async function markJobSkipped(env, jobId, reason, result = {}) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE media_asset_jobs
     SET status = 'skipped', result_json = ?, last_error = ?, finished_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(JSON.stringify(result), String(reason || "").slice(0, 500), now, now, jobId)
    .run();
}

/** Enqueue for durable async processing when ASSET_JOBS binding exists. */
export async function enqueueAssetJob(env, jobId, extras = {}) {
  if (env.ASSET_JOBS?.send) {
    await env.ASSET_JOBS.send({ job_id: jobId, ...extras });
    return { queued: true, transport: "cloudflare_queue" };
  }
  return { queued: false, transport: "none" };
}

export async function listQueuedJobs(env, limit = 20) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM media_asset_jobs
     WHERE status IN ('queued', 'failed')
     ORDER BY created_at ASC
     LIMIT ?`,
  )
    .bind(limit)
    .all();
  return results || [];
}
