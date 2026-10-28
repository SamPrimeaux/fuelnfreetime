export {
  MANUFACTURING_PROFILE_SCHEMA,
  RASTER_FORMATS,
  VECTOR_FORMATS,
  DOCUMENT_FORMATS,
  mediaKindForFormat,
  normalizeFormat,
  normalizeManufacturingProfile,
  validateManufacturingProfile,
} from "./profile.js";
export { createManufacturingProfileRegistry } from "./profile-registry.js";
// Vendored from canonical agentsam-sdk merch geometry (pin 33fa5d9).
export { effectiveArtworkDpi, providerPrintSizeIn, rasterResolutionPreflight } from "./geometry.js";
export {
  COMPATIBILITY_STATUS,
  evaluateManufacturingCompatibility,
} from "./compatibility.js";
export {
  DERIVATIVE_ROLE,
  planMediaDerivatives,
  buildMerchPlan,
} from "./derivatives.js";
export {
  COLLECTION_CANDIDATE_STATE,
  approvalsComplete,
  canTransitionCollectionCandidate,
  createCollectionCandidate,
  transitionCollectionCandidate,
} from "./collection-lab.js";
export {
  completefulProfileContext,
  completefulTarget,
} from "./adapters-completeful.js";

export { PRODUCT_SOURCE_KINDS, resolveProductSource, groupProductInventory, validateInventoryAdjustment } from "./product-spine.js";

export {
  MERCH_ASSORTMENT_RECIPES, assortmentSearchTerms, DEFAULT_COLLECTION_RULES,
  normalizeCollectionRules, matchesCollectionRules, resolveCollectionMembers,
} from "./collection-planning.js";

export { normalizeMerchHero, parseMerchHero, renderMerchHero, serializeMerchHero, safeMerchUrl } from "./merch-hero.js";

export { collectionShowcaseStyle, renderMerchCollectionShowcase } from "./collection-showcase.js";
