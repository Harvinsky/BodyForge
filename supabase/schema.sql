-- BodyForge — Supabase schema
-- Spusti v Supabase SQL Editor

-- Daily progress logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  fasting_window BOOLEAN DEFAULT FALSE,
  hydration_1l BOOLEAN DEFAULT FALSE,
  hydration_2l BOOLEAN DEFAULT FALSE,
  hydration_3l BOOLEAN DEFAULT FALSE,
  morning_vacuum BOOLEAN DEFAULT FALSE,
  evening_tech_off BOOLEAN DEFAULT FALSE,
  meal_1_done BOOLEAN DEFAULT FALSE,
  meal_snack_done BOOLEAN DEFAULT FALSE,
  meal_2_done BOOLEAN DEFAULT FALSE,
  is_fasting_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_logs_updated_at ON daily_logs;
CREATE TRIGGER daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: user settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  fasting_start TIME DEFAULT '12:00',
  fasting_end TIME DEFAULT '19:00',
  hydration_target_liters INTEGER DEFAULT 3,
  start_weight_kg NUMERIC(5, 2),
  goal_weight_kg NUMERIC(5, 2),
  current_weight_kg NUMERIC(5, 2),
  goal_date DATE DEFAULT '2026-07-02',
  program_start_date DATE DEFAULT '2026-06-01',
  daily_calorie_target INTEGER DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hydration micro-dosing (HydrationTracker)
CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date
  ON hydration_logs (user_id, log_date);

ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hydration logs"
  ON hydration_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hydration logs"
  ON hydration_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hydration logs"
  ON hydration_logs FOR DELETE
  USING (auth.uid() = user_id);

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
