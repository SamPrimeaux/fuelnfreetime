-- Canonical code-generation capabilities used by provider/model routing.

INSERT INTO agentsam_capabilities (
  capability_key, domain, verb, description, is_mutating, is_active, created_at, updated_at
)
VALUES
  ('code.generate','code','generate','Generate a new code artifact or CMS implementation without persisting it by itself.',0,1,unixepoch(),unixepoch()),
  ('code.edit','code','edit','Produce a patch/diff against an existing code artifact without persisting it by itself.',0,1,unixepoch(),unixepoch())
ON CONFLICT(capability_key) DO UPDATE SET
  domain=excluded.domain,
  verb=excluded.verb,
  description=excluded.description,
  is_mutating=excluded.is_mutating,
  is_active=1,
  updated_at=unixepoch();

UPDATE agentsam_ai
SET capabilities_json = json_insert(
      CASE WHEN json_valid(capabilities_json) THEN capabilities_json ELSE '[]' END,
      '$[#]',
      'code.generate'
    ),
    updated_at = datetime('now')
WHERE task_type='code_generation'
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(CASE WHEN json_valid(agentsam_ai.capabilities_json) THEN agentsam_ai.capabilities_json ELSE '[]' END)
    WHERE value='code.generate'
  );

UPDATE agentsam_ai
SET capabilities_json = json_insert(
      CASE WHEN json_valid(capabilities_json) THEN capabilities_json ELSE '[]' END,
      '$[#]',
      'code.edit'
    ),
    updated_at = datetime('now')
WHERE task_type='code_generation'
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(CASE WHEN json_valid(agentsam_ai.capabilities_json) THEN agentsam_ai.capabilities_json ELSE '[]' END)
    WHERE value='code.edit'
  );
