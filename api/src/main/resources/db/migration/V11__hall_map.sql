ALTER TABLE competition
  ADD COLUMN hall_map BYTEA,
  ADD COLUMN hall_map_content_type VARCHAR(100);
