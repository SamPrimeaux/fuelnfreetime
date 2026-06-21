-- Mailbox ownership + shared access (v2)

ALTER TABLE mail_mailboxes ADD COLUMN owner_user_id TEXT;
ALTER TABLE mail_mailboxes ADD COLUMN access_json TEXT NOT NULL DEFAULT '{}';

UPDATE mail_mailboxes SET owner_user_id = (
  SELECT id FROM auth_users WHERE lower(email) = lower(mail_mailboxes.owner_auth_email) LIMIT 1
) WHERE owner_auth_email IS NOT NULL AND owner_auth_email != '';

UPDATE mail_mailboxes SET access_json = '{"roles":["owner"],"emails":["info@inneranimals.com"]}'
WHERE id = 'mb_payments';
