-- BodyForge: cieľ váhy + kalórie
-- Spusti v Supabase SQL Editor

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS start_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS goal_date DATE DEFAULT '2026-07-02',
  ADD COLUMN IF NOT EXISTS program_start_date DATE DEFAULT '2026-06-01',
  ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER DEFAULT 2000;

CREATE TABLE IF NOT EXISTS calorie_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories > 0 AND calories <= 10000),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_date
  ON calorie_logs (user_id, log_date);

ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calorie logs"
  ON calorie_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calorie logs"
  ON calorie_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calorie logs"
  ON calorie_logs FOR DELETE
  USING (auth.uid() = user_id);
