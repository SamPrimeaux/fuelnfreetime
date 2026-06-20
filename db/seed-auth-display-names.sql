-- Canonical display names for auth_users (idempotent)
UPDATE auth_users SET name = 'Sam Primeaux', display_name = 'Sam Primeaux', updated_at = datetime('now')
WHERE email = 'info@inneranimals.com';

UPDATE auth_users SET name = 'Connor McNeely', display_name = 'Connor McNeely', updated_at = datetime('now')
WHERE email = 'connordmcneely@leadershiplegacydigital.com';

UPDATE auth_users SET name = 'Justin Molaison', display_name = 'Justin Molaison', updated_at = datetime('now')
WHERE email = 'jmoeee21@yahoo.com';

UPDATE auth_users SET name = 'Site Admin', display_name = 'Site Admin', updated_at = datetime('now')
WHERE email = 'admin@fuelnfreetime.com';
