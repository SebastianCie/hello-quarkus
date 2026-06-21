-- Tiebreaker flag on competition
ALTER TABLE competition ADD COLUMN tiebreak_use_previous_round BOOLEAN NOT NULL DEFAULT FALSE;

-- Rounds per competition
CREATE TABLE IF NOT EXISTS competition_round (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_id      UUID NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    slug         VARCHAR(100) NOT NULL,
    sort_order   INT NOT NULL DEFAULT 0,
    start_at     TIMESTAMPTZ,
    end_at       TIMESTAMPTZ,
    advancement_count INT,        -- NULL = finale, keine Weiterkommen-Logik
    status       VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',  -- UPCOMING | ACTIVE | CLOSED
    UNIQUE(comp_id, slug)
);

-- Create a default "Qualifikation" round for every existing competition
INSERT INTO competition_round (comp_id, name, slug, sort_order, status)
SELECT id, 'Qualifikation', 'qualifikation', 0, 'ACTIVE'
FROM competition;

-- Assign existing routes to their competition's default round
ALTER TABLE route ADD COLUMN round_id UUID REFERENCES competition_round(id) ON DELETE CASCADE;

UPDATE route r
SET round_id = (
    SELECT cr.id FROM competition_round cr
    WHERE cr.comp_id = r.comp_id
      AND cr.slug = 'qualifikation'
    LIMIT 1
);

-- Participants per round (who is allowed to compete in this round)
CREATE TABLE IF NOT EXISTS round_participant (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id        UUID NOT NULL REFERENCES competition_round(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    UNIQUE(round_id, registration_id)
);

-- All currently confirmed athletes start in round 1 (qualifikation)
INSERT INTO round_participant (round_id, registration_id)
SELECT cr.id, reg.id
FROM registration reg
JOIN competition_round cr ON cr.comp_id = reg.comp_id AND cr.slug = 'qualifikation'
WHERE reg.status = 'CONFIRMED';
