-- Optional 3D placement tuning per asset (camera orbit, position, scale)

ALTER TABLE media_assets ADD COLUMN placement_json TEXT;
