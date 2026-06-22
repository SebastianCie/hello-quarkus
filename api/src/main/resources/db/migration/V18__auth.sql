-- Interne Benutzer (ersetzt Keycloak)
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),                    -- NULL bei zukünftigem Social Login
    display_name  VARCHAR(255),
    role          VARCHAR(50)  NOT NULL DEFAULT 'ORGANIZER',
    email_verified BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Refresh Tokens: opaque UUID, SHA-256-gehasht gespeichert
CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256 hex
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Passwort-Reset-Tokens: SHA-256-gehasht, 1 Stunde gültig, einmalig verwendbar
CREATE TABLE password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- E-Mail-Verifizierungstoken: SHA-256-gehasht, 24 Stunden gültig
CREATE TABLE email_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance-Indizes
CREATE INDEX idx_refresh_tokens_hash   ON refresh_tokens(token_hash)       WHERE NOT revoked;
CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX idx_password_reset_hash   ON password_reset_tokens(token_hash) WHERE NOT used;
CREATE INDEX idx_email_verif_hash      ON email_verifications(token_hash);
