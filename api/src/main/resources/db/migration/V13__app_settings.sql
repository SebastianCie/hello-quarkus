CREATE TABLE IF NOT EXISTS app_settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO app_settings (key, value) VALUES
    ('scoreboard_interval_seconds', '5'),
    ('scoreboard_athletes_per_page', '0')
ON CONFLICT DO NOTHING;
