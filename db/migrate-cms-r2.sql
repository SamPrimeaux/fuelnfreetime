-- CMS R2 pointers (thin D1 index)
-- Run: npm run db:migrate:cms-r2

ALTER TABLE page_sections ADD COLUMN content_r2_key TEXT;
ALTER TABLE page_sections ADD COLUMN content_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE page_sections ADD COLUMN content_hash TEXT;
