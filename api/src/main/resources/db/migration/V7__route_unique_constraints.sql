-- Duplikate bereinigen, bevor Constraints gesetzt werden
-- Leerzeichen in Namen trimmen
UPDATE route SET name = TRIM(name) WHERE name IS NOT NULL;

-- Duplikate bei route_number pro (comp_id, category_id) entfernen, älteste behalten
DELETE FROM route WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY comp_id, category_id, route_number ORDER BY ctid) AS rn
    FROM route WHERE route_number IS NOT NULL
  ) t WHERE rn > 1
);

-- Duplikate bei sort_order pro (comp_id, category_id) entfernen
DELETE FROM route WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY comp_id, category_id, sort_order ORDER BY ctid) AS rn
    FROM route WHERE sort_order IS NOT NULL
  ) t WHERE rn > 1
);

-- Duplikate bei name pro (comp_id, category_id) entfernen
DELETE FROM route WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY comp_id, category_id, name ORDER BY ctid) AS rn
    FROM route WHERE name IS NOT NULL
  ) t WHERE rn > 1
);

-- Unique-Indexes mit NULLS NOT DISTINCT (PostgreSQL 15+):
-- NULL category_id = "alle Kategorien" wird als eigene Gruppe behandelt
CREATE UNIQUE INDEX route_unique_number
  ON route (comp_id, category_id, route_number) NULLS NOT DISTINCT
  WHERE route_number IS NOT NULL;

CREATE UNIQUE INDEX route_unique_name
  ON route (comp_id, category_id, name) NULLS NOT DISTINCT
  WHERE name IS NOT NULL;

CREATE UNIQUE INDEX route_unique_sort_order
  ON route (comp_id, category_id, sort_order) NULLS NOT DISTINCT
  WHERE sort_order IS NOT NULL;
