import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const contract = JSON.parse(fs.readFileSync(new URL("../apps/ecommerce-cms-agentsam/theme/authoring.contract.json", import.meta.url), "utf8"));
const guide = fs.readFileSync(new URL("../apps/ecommerce-cms-agentsam/theme/README.md", import.meta.url), "utf8");

test("FNF has one Shopify-inspired, provider-neutral authoring contract", () => {
  assert.equal(contract.schema, "agentsam.theme-authoring.v1");
  assert.equal(contract.version, "1.1.0");
  assert.deepEqual(contract.authority, {
    page: "cms_pages",
    section_instance: "cms_page_sections",
    block_instance: "cms_section_blocks",
    definition: "cms_definitions",
    implementation: "cms_artifacts",
    revision: "cms_revisions",
    global: "cms_globals",
    media: "media_assets",
  });
  assert.equal(contract.ownership.package_definition_source, "owning_package_manifest");
  assert.equal(contract.ownership.installed_runtime_projection, "cms_definitions");
  assert.equal(contract.ownership.artifact_id_nullable, true);
  assert.match(guide, /not a Liquid\/Shopify runtime|Shopify-inspired, provider-neutral implementation classes/i);
});

test("implementation classes distinguish native, static, interactive, and app-owned behavior", () => {
  const { classes } = contract.implementation;
  assert.deepEqual(Object.keys(classes).sort(), ["app", "artifact_interactive", "artifact_static", "native"]);
  assert.equal(classes.native.artifact_required, false);
  assert.deepEqual(classes.artifact_static.formats, ["html", "css"]);
  assert.equal(classes.artifact_static.javascript, "forbidden");
  assert.equal(classes.artifact_static.status, "supported");
  assert.equal(classes.artifact_interactive.status, "not_wired");
  assert.equal(classes.artifact_interactive.acceptance, "reject_until_interactive_runtime_exists");
  assert.equal(contract.maturity.artifact_interactive, "unavailable_until_runtime_contract_is_implemented");
  assert.equal(contract.maturity.artifact_static, "current_script_free_acceptance_lane");
  assert.match(contract.maturity.typed_settings, /not_fully_implemented/);
  assert.match(contract.maturity.selector_scope, /legacy generated-block linter/);
  assert.equal(contract.implementation.artifact_compatibility.unknown_versions, "reject");
});

test("declared settings schemas own types and keep content/resource/style bindings distinct", () => {
  const settings = contract.settings_contract;
  assert.equal(settings.schema_authority, "definition.settings_schema");
  assert.equal(settings.declared_type_is_authoritative, true);
  assert.equal(settings.initial_values_define_schema, false);
  assert.equal(settings.never_infer_public_type_from_initial_value, true);
  for (const type of ["range", "select", "color", "media", "link", "font_role", "typography_preset", "product", "collection", "alignment", "spacing"]) {
    assert.ok(settings.contract_field_types.includes(type), `missing field type ${type}`);
  }
  assert.equal(settings.bindings.content.mechanism, "data-cms");
  assert.equal(settings.bindings.visual.mechanism, "scoped_css_custom_property");
  assert.equal(settings.bindings.visual.pattern, "--__UID__-setting-<key>");
  assert.equal(settings.runtime_must_reject_unimplemented_field_types, true);
  assert.equal(settings.bindings.visual.status, "contract_target_runtime_support_pending");
});

test("semantic identity, package ownership, and mined-code provenance are explicit", () => {
  assert.match(contract.identity.definition_key, /never namespaced/);
  assert.equal(contract.identity.generated_namespace.semantic_namespace, "agentsam");
  assert.match(contract.identity.generated_namespace.applies_to, /per_instance/);
  assert.ok(contract.identity.preserve_compatibility_alias_during_v1);
  assert.equal(contract.refurbishment.discovery_authority, "AgentSam Machine/Repository adapters, outside the FNF Worker");
  assert.ok(contract.refurbishment.discovery_is_read_only);
  assert.ok(contract.refurbishment.promotion_mutates_runtime_only_after_approval);
  for (const field of ["source_repo", "source_commit", "source_path", "source_hash", "license_or_ownership_evidence", "refurbishment_receipt"]) {
    assert.ok(contract.provenance.refurbished_fields.includes(field), `missing provenance field ${field}`);
  }
  for (const evidence of ["deterministic_crawl_receipt", "relationship_evidence", "source_provenance"]) {
    assert.ok(contract.refurbishment.intake_requires.includes(evidence));
  }
  for (const field of ["crawl_id", "seed", "resources_discovered", "edges_discovered", "errors", "started_at", "completed_at", "snapshot_hash"]) {
    assert.ok(contract.refurbishment.crawl_receipt_fields.includes(field));
  }
  assert.ok(contract.refurbishment.code_refinery.human_approval_before_promotion);
  assert.equal(contract.refurbishment.code_refinery.automatic_source_rewrite, "forbidden");
  assert.match(guide, /not this storefront Worker/);
});

test("verification gates include contract compatibility, CSS scope, ownership, and receipts", () => {
  for (const check of [
    "implementation_class_supported",
    "artifact_contract_version_supported",
    "package_authority_checked",
    "duplicate_semantic_definition_checked",
    "declared_settings_schema_preserved",
    "visual_settings_have_scoped_css_variable_bindings",
    "source_provenance_present",
    "crawl_receipt_and_relationship_evidence_present_for_mined_code",
  ]) {
    assert.ok(contract.verification.includes(check), `missing verifier gate ${check}`);
  }
  assert.equal(contract.artifact.selector_scope.every_selector_rooted_in_placed_instance_scope, true);
  assert.equal(contract.artifact.selector_scope.global_selectors, "forbidden");
});
