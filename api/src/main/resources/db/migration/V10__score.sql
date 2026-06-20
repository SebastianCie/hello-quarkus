CREATE TABLE IF NOT EXISTS score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES route(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athlete(id) ON DELETE CASCADE,
    judge_id UUID,
    attempts INTEGER NOT NULL DEFAULT 0,
    topped BOOLEAN NOT NULL DEFAULT FALSE,
    zoned BOOLEAN NOT NULL DEFAULT FALSE,
    bonus_points INTEGER NOT NULL DEFAULT 0,
    final_score INTEGER,
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE score ADD CONSTRAINT unique_score_reg_route UNIQUE (registration_id, route_id);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;
