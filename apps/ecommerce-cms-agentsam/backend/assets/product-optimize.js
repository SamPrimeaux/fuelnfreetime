/**
 * Re-export Worker-safe asset planning into the ecommerce Worker tree.
 * Heavy optimize/promote runs via bin/fnf-assets (sharp).
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
  FNF_R2,
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
