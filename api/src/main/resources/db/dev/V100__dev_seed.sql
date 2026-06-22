-- Dev-only seed data — wird NUR im dev-Profil eingespielt (quarkus.flyway.locations)
-- Dev-User UUID: 00000000-0000-0000-0000-000000000001
-- Dev-Login: dev@betabattle.local / kein Passwort (Auth-Bypass via %dev.beta-battle.dev-user-id)

INSERT INTO users (id, email, password_hash, display_name, role, email_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'dev@betabattle.local',
    NULL,
    'Dev User',
    'ORGANIZER',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO organization (id, name, slug, contact_email)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'Dev Organisation',
    'dev-org',
    'dev@betabattle.local'
) ON CONFLICT DO NOTHING;

INSERT INTO location (id, org_id, name, city, address)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    'Dev Halle Regensburg',
    'Regensburg',
    'Entwicklerstraße 1'
) ON CONFLICT DO NOTHING;

-- Dev-User ist SUPERADMIN der Dev Organisation (kein location_id = org-weit)
INSERT INTO org_user (id, org_id, user_id, role)
VALUES (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'SUPERADMIN'
) ON CONFLICT DO NOTHING;
