-- event_date (DATE) → start_date + end_date (TIMESTAMPTZ mit Uhrzeit)
ALTER TABLE competition RENAME COLUMN event_date TO start_date;
ALTER TABLE competition ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ;
ALTER TABLE competition ADD COLUMN end_date TIMESTAMPTZ;
