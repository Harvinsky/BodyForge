-- Add optional macro tracking columns to calorie_logs
ALTER TABLE calorie_logs
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC(6,1) CHECK (protein_g IS NULL OR protein_g >= 0),
  ADD COLUMN IF NOT EXISTS fat_g     NUMERIC(6,1) CHECK (fat_g IS NULL OR fat_g >= 0),
  ADD COLUMN IF NOT EXISTS carbs_g   NUMERIC(6,1) CHECK (carbs_g IS NULL OR carbs_g >= 0);
