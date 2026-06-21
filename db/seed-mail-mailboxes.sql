-- Default @fuelnfreetime.com mailboxes (idempotent)

INSERT INTO mail_mailboxes (
  id, address, label, kind, owner_name, owner_auth_email, resend_from_name, is_default_send, sort_order
) VALUES
  (
    'mb_sam',
    'sam@fuelnfreetime.com',
    'Sam',
    'personal',
    'Sam Primeaux',
    'info@inneranimals.com',
    'Sam Primeaux',
    0,
    10
  ),
  (
    'mb_connor',
    'connor@fuelnfreetime.com',
    'Connor',
    'personal',
    'Connor McNeely',
    'connordmcneely@leadershiplegacydigital.com',
    'Connor McNeely',
    0,
    20
  ),
  (
    'mb_payments',
    'payments@fuelnfreetime.com',
    'Payments',
    'payments',
    'Fuel & Free Time',
    NULL,
    'Fuel & Free Time Payments',
    0,
    30
  )
ON CONFLICT(id) DO UPDATE SET
  address = excluded.address,
  label = excluded.label,
  kind = excluded.kind,
  owner_name = excluded.owner_name,
  owner_auth_email = excluded.owner_auth_email,
  resend_from_name = excluded.resend_from_name,
  sort_order = excluded.sort_order;
