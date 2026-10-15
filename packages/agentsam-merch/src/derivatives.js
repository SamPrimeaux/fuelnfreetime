import { evaluateManufacturingCompatibility } from "./compatibility.js";
import { normalizeManufacturingProfile } from "./profile.js";

export const DERIVATIVE_ROLE = Object.freeze({
  ORIGINAL: "original/master",
  MANUFACTURING: "manufacturing",
  STOREFRONT: "storefront/gallery",
  THUMBNAIL: "thumbnail",
  SOCIAL: "social",
  MOCKUP: "mockup",
});

// #UNFINISHEDTOOLS (commerce.artwork.prepare): this PLANS derivatives (role/format/preserve) but nothing
// EXECUTES the preflight `actions` (trim, place, rasterize, convert, color space, alpha, optimize), so no refined,
// aligned production file is ever produced here. The only real execution is browser canvas code in
// StudioWorkspace.tsx and storefront-oriented optimization in backend/assets/*. Build
// createArtworkPreparer({ runtime }) (browser | Worker env.IMAGES/jSquash | Node sharp) that runs the actions in
// order and re-runs evaluateManufacturingCompatibility to prove `ready`. Also add computePlacement().
// Audit: docs/AGENTSAM_MERCH_AND_TOOLS_AUDIT_20261015.md (F1). Tracked: tkt_13207989954e4171.
export function planMediaDerivatives({
  asset,
  profile,
  target = {},
  storefrontFormat = "webp",
  thumbnailFormat = "webp",
  socialFormat = "jpg",
  mockupFormat = "webp",
} = {}) {
  const normalizedProfile = normalizeManufacturingProfile(profile);
  const compatibility = evaluateManufacturingCompatibility(asset, normalizedProfile, target);

  return Object.freeze({
    source: Object.freeze({
      role: DERIVATIVE_ROLE.ORIGINAL,
      preserve: true,
      immutableAuthority: true,
      format: asset?.format || null,
    }),
    manufacturing: Object.freeze({
      role: DERIVATIVE_ROLE.MANUFACTURING,
      preserve: true,
      derivedFrom: DERIVATIVE_ROLE.ORIGINAL,
      format: normalizedProfile.format,
      profileId: normalizedProfile.id,
      compatibility,
      mustNotUseStorefrontDerivative: true,
    }),
    storefront: Object.freeze({
      role: DERIVATIVE_ROLE.STOREFRONT,
      preserve: false,
      derivedFrom: DERIVATIVE_ROLE.ORIGINAL,
      format: storefrontFormat,
      optimizeFor: "delivery",
    }),
    thumbnail: Object.freeze({
      role: DERIVATIVE_ROLE.THUMBNAIL,
      preserve: false,
      derivedFrom: DERIVATIVE_ROLE.ORIGINAL,
      format: thumbnailFormat,
      optimizeFor: "small-ui",
    }),
    social: Object.freeze({
      role: DERIVATIVE_ROLE.SOCIAL,
      preserve: false,
      derivedFrom: DERIVATIVE_ROLE.ORIGINAL,
      format: socialFormat,
      optimizeFor: "social",
    }),
    mockup: Object.freeze({
      role: DERIVATIVE_ROLE.MOCKUP,
      preserve: false,
      derivedFrom: DERIVATIVE_ROLE.ORIGINAL,
      format: mockupFormat,
      optimizeFor: "preview",
    }),
  });
}

export function buildMerchPlan({ design, products = [], registry }) {
  if (!design?.asset) throw new TypeError("design.asset is required");
  if (!registry?.get || !registry?.select) {
    throw new TypeError("a manufacturing profile registry is required");
  }

  const targets = products.map((product) => {
    const profile =
      (product.profileId && registry.get(product.profileId)) ||
      registry.select(product.profileContext || product);

    if (!profile) {
      return Object.freeze({
        id: product.id,
        name: product.name || product.id,
        profileId: null,
        status: "unsupported",
        reason: "No manufacturing profile matched.",
      });
    }

    const derivatives = planMediaDerivatives({
      asset: design.asset,
      profile,
      target: product.target || product,
    });

    return Object.freeze({
      ...product,
      profileId: profile.id,
      status: derivatives.manufacturing.compatibility.status,
      derivatives,
    });
  });

  return Object.freeze({
    schemaVersion: "agentsam.merch-plan.v1",
    design: Object.freeze({ ...design }),
    targets: Object.freeze(targets),
  });
}
