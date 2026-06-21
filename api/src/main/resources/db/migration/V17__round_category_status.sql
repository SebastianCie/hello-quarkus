CREATE TABLE round_category_status (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id    UUID NOT NULL REFERENCES competition_round(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES competition_category(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    UNIQUE(round_id, category_id)
);
