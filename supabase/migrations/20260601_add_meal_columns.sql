-- Pridá stĺpce pre jedálny lístok (MealPlan) do daily_logs
-- Spusti v Supabase SQL Editor ak už máš vytvorenú tabuľku

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS meal_1_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_snack_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_2_done BOOLEAN DEFAULT FALSE;
