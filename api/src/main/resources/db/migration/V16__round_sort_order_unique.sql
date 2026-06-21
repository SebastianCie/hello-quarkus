-- Ensure sort_order is unique within a competition's rounds
ALTER TABLE competition_round ADD CONSTRAINT uq_round_comp_sort_order UNIQUE (comp_id, sort_order);
