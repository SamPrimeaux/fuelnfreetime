/**
 * Fuel & Free Time — Agent Sam platform IDs (single-tenant).
 */
export const FNF_TENANT_ID = "tenant_fuelnfreetime";
export const FNF_WORKSPACE_ID = "ws_fuelnfreetime";
export const FNF_SYSTEM_USER_ID = "au_fnf_system";
export const FNF_GITHUB_REPO = "SamPrimeaux/fuelnfreetime";

/** Worker + binding scope — AgentSam tools MUST stay within these resources */
export const FNF_WORKER_NAME = "fuelnfreetime";
export const FNF_D1_BINDING = "DB";
export const FNF_D1_DATABASE = "fuelnfreetime";
export const FNF_R2_BINDING = "WEBSITE_ASSETS";
export const FNF_R2_BUCKET = "fuelnfreetime";
export const FNF_APP_DOMAIN = "fuelnfreetime.com";

/** Canonical platform scope for agentsam_tools handler_config.fnf_scope */
export const FNF_PLATFORM_SCOPE = {
  tenant_id: FNF_TENANT_ID,
  workspace_id: FNF_WORKSPACE_ID,
  worker: FNF_WORKER_NAME,
  d1_binding: FNF_D1_BINDING,
  d1_database: FNF_D1_DATABASE,
  r2_binding: FNF_R2_BINDING,
  r2_bucket: FNF_R2_BUCKET,
  github_repo: FNF_GITHUB_REPO,
  domain: FNF_APP_DOMAIN,
};

export const FNF_TOOL_SCOPE_NOTE =
  "AgentSam tools are limited to fuelnfreetime Worker, D1 database fuelnfreetime (DB binding), R2 bucket fuelnfreetime (WEBSITE_ASSETS), and GitHub repo SamPrimeaux/fuelnfreetime only. Never access other tenants, workers, databases, buckets, or repos.";

/** Studio workflows shown in the AgentSam drawer picker */
export const DRAWER_WORKFLOW_KEYS = [
  "fnf_content_studio",
  "fnf_creative_studio",
  "fnf_brand_refresh",
];
