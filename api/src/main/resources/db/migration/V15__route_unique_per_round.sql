-- Drop old comp-level unique indexes (replaced by round-scoped ones)
DROP INDEX IF EXISTS route_unique_number;
DROP INDEX IF EXISTS route_unique_name;
DROP INDEX IF EXISTS route_unique_sort_order;

-- Unique within a round (NULL round_id = legacy, treated as global scope)
CREATE UNIQUE INDEX route_unique_round_number
  ON route (round_id, category_id, route_number) NULLS NOT DISTINCT
  WHERE route_number IS NOT NULL;

CREATE UNIQUE INDEX route_unique_round_name
  ON route (round_id, category_id, name) NULLS NOT DISTINCT
  WHERE name IS NOT NULL;

CREATE UNIQUE INDEX route_unique_round_sort_order
  ON route (round_id, category_id, sort_order) NULLS NOT DISTINCT
  WHERE sort_order IS NOT NULL;
