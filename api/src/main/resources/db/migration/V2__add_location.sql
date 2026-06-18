-- Location table: a gym/hall belonging to an organization
CREATE TABLE location (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    address    TEXT,
    city       VARCHAR(100),
    country    VARCHAR(10) DEFAULT 'DE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rename competition.location (text) to venue to avoid confusion with location FK
ALTER TABLE competition RENAME COLUMN location TO venue;

-- Competition now belongs to a specific location
ALTER TABLE competition ADD COLUMN location_id UUID REFERENCES location(id) ON DELETE SET NULL;

-- OrgUser: null = org-superadmin (all locations), set = location-admin (one location only)
ALTER TABLE org_user ADD COLUMN location_id UUID REFERENCES location(id) ON DELETE SET NULL;

-- Athlete now belongs to an organization
ALTER TABLE athlete ADD COLUMN org_id UUID REFERENCES organization(id) ON DELETE SET NULL;
