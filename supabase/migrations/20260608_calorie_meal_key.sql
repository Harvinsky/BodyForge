-- Prepojenie kalorických zápisov s jedlami v jedálnom pláne
ALTER TABLE calorie_logs
  ADD COLUMN IF NOT EXISTS meal_key TEXT
  CHECK (
    meal_key IS NULL
    OR meal_key IN ('meal_1_done', 'meal_snack_done', 'meal_2_done')
  );
