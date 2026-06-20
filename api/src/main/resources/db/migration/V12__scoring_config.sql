CREATE TABLE IF NOT EXISTS scoring_config (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_id    UUID         NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
    event_type VARCHAR(30)  NOT NULL,
    points     DECIMAL(8,2) NOT NULL,
    label      VARCHAR(50),
    sort_order INT          NOT NULL DEFAULT 0
);
