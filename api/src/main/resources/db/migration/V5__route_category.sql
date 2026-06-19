-- Routen können optional einer Kategorie zugeordnet werden (null = alle Kategorien)
ALTER TABLE route ADD COLUMN category_id UUID REFERENCES competition_category(id) ON DELETE SET NULL;
