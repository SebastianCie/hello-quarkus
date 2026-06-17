CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    contact_email VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    discipline VARCHAR(50) NOT NULL,
    format VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    event_date DATE,
    location VARCHAR(255),
    self_registration BOOLEAN DEFAULT FALSE,
    registration_opens_at TIMESTAMPTZ,
    registration_closes_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competition_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_id UUID NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    age_min VARCHAR(10),
    age_max VARCHAR(10),
    max_participants INTEGER
);

CREATE TABLE route (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_id UUID NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
    route_number VARCHAR(20),
    discipline VARCHAR(50),
    grade VARCHAR(20),
    max_score INTEGER,
    sort_order INTEGER
);

CREATE TABLE athlete (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    club VARCHAR(255),
    nation VARCHAR(10),
    license_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_id UUID NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athlete(id),
    category_id UUID REFERENCES competition_category(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    start_number VARCHAR(20),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE TABLE score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES route(id),
    athlete_id UUID NOT NULL REFERENCES athlete(id),
    judge_id UUID,
    attempts INTEGER DEFAULT 0,
    topped BOOLEAN DEFAULT FALSE,
    zoned BOOLEAN DEFAULT FALSE,
    bonus_points INTEGER DEFAULT 0,
    final_score INTEGER,
    scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE competition_judge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_id UUID NOT NULL REFERENCES competition(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL
);
