/**
 * Re-export Worker-safe asset planning + job runner into the ecommerce Worker tree.
 * Raster transforms run in-Worker via @jsquash; CLI can also drain with Sharp.
 */
export {
  planProductAssetOptimization,
  planAssetIngest,
} from "../../../../lib/assets/worker-hook.js";
export {
  buildAssetTags,
  inferProductContextFromKey,
} from "../../../../lib/assets/tags.js";
export {
  ASSET_STORAGE,
  publicUrlsForKey,
  deliveryUrlForKey,
  mediaPathForKey,
} from "../../../../lib/assets/config.js";
export {
  classifyMediaAsset,
  routePipelineWorkflow,
  guessMimeFromKey,
  canonicalKeyForPromotion,
} from "../../../../lib/assets/classify.js";
export {
  buildDeterministicSuggestions,
  applyAcceptedSuggestions,
} from "../../../../lib/assets/suggestions.js";
export {
  createAssetJob,
  enqueueAssetJob,
  newJobId,
  getAssetJob,
} from "../../../../lib/assets/jobs.js";
export {
  processAssetJobById,
  drainAssetJobs,
  finalizeMediaAsset,
} from "../../../../lib/assets/process-job.js";
