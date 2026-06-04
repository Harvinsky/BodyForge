-- ============================================================
-- BodyForge — SKOPIUJ CELÝ TENTO SÚBOR DO SUPABASE SQL EDITOR
-- Supabase.com → tvoj projekt → SQL Editor → New query → vlož → Run
-- ============================================================

-- Ak už máš staršiu databázu, tieto riadky doplnia chýbajúce stĺpce:
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS meal_1_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_snack_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meal_2_done BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_fasting_day BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS training_done BOOLEAN DEFAULT FALSE;

ALTER TABLE daily_logs DROP COLUMN IF EXISTS evening_tech_off;
ALTER TABLE daily_logs DROP COLUMN IF EXISTS morning_vacuum;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS start_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS goal_date DATE,
  ADD COLUMN IF NOT EXISTS program_start_date DATE,
  ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER;

-- --- Zvyšok len ak ešte NEMÁŠ tabuľky (prvýkrát). Inak môžeš preskočiť od riadku CREATE TABLE. ---

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  fasting_window BOOLEAN DEFAULT FALSE,
  hydration_1l BOOLEAN DEFAULT FALSE,
  hydration_2l BOOLEAN DEFAULT FALSE,
  hydration_3l BOOLEAN DEFAULT FALSE,
  training_done BOOLEAN DEFAULT FALSE,
  meal_1_done BOOLEAN DEFAULT FALSE,
  meal_snack_done BOOLEAN DEFAULT FALSE,
  meal_2_done BOOLEAN DEFAULT FALSE,
  is_fasting_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

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

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON daily_logs;
CREATE POLICY "Users can view own logs" ON daily_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own logs" ON daily_logs;
CREATE POLICY "Users can insert own logs" ON daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own logs" ON daily_logs;
CREATE POLICY "Users can update own logs" ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own logs" ON daily_logs;
CREATE POLICY "Users can delete own logs" ON daily_logs FOR DELETE USING (auth.uid() = user_id);

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
  goal_date DATE,
  program_start_date DATE,
  daily_calorie_target INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date ON hydration_logs (user_id, log_date);
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hydration_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own hydration logs" ON hydration_logs;
CREATE POLICY "Users can view own hydration logs" ON hydration_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own hydration logs" ON hydration_logs;
CREATE POLICY "Users can insert own hydration logs" ON hydration_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own hydration logs" ON hydration_logs;
CREATE POLICY "Users can delete own hydration logs" ON hydration_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS calorie_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories > 0 AND calories <= 10000),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calorie_logs_user_date ON calorie_logs (user_id, log_date);
ALTER TABLE calorie_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calorie_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own calorie logs" ON calorie_logs;
CREATE POLICY "Users can view own calorie logs" ON calorie_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own calorie logs" ON calorie_logs;
CREATE POLICY "Users can insert own calorie logs" ON calorie_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own calorie logs" ON calorie_logs;
CREATE POLICY "Users can delete own calorie logs" ON calorie_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS training_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_logs_user_date ON training_logs (user_id, log_date);
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own training logs" ON training_logs;
CREATE POLICY "Users can view own training logs" ON training_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own training logs" ON training_logs;
CREATE POLICY "Users can insert own training logs" ON training_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own training logs" ON training_logs;
CREATE POLICY "Users can delete own training logs" ON training_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS daily_activity_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0 AND steps <= 150000),
  calories_burned_manual INTEGER NOT NULL DEFAULT 0 CHECK (calories_burned_manual >= 0 AND calories_burned_manual <= 20000),
  calories_burned_estimated INTEGER NOT NULL DEFAULT 0 CHECK (calories_burned_estimated >= 0 AND calories_burned_estimated <= 20000),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_metrics_user_date ON daily_activity_metrics (user_id, log_date);
ALTER TABLE daily_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_metrics FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can view own activity metrics" ON daily_activity_metrics FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can insert own activity metrics" ON daily_activity_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can update own activity metrics" ON daily_activity_metrics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can delete own activity metrics" ON daily_activity_metrics FOR DELETE USING (auth.uid() = user_id);

-- Jedálne okno + väzba kalórií na jedlá (ak ešte nemáš)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS eating_window_start TIME DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS eating_window_end TIME DEFAULT '20:00';

ALTER TABLE calorie_logs
  ADD COLUMN IF NOT EXISTS meal_key TEXT
  CHECK (
    meal_key IS NULL
    OR meal_key IN ('meal_1_done', 'meal_snack_done', 'meal_2_done')
  );

-- Archív programov (história dní — pomenované obdobia)
CREATE TABLE IF NOT EXISTS program_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_calorie_target INTEGER,
  start_weight_kg NUMERIC(5, 2),
  goal_weight_kg NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_program_periods_user ON program_periods (user_id, start_date DESC);
ALTER TABLE program_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_periods FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own program periods" ON program_periods;
CREATE POLICY "Users can manage own program periods"
  ON program_periods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Makrá (proteín, tuky, sacharidy) — voliteľné stĺpce v calorie_logs ──
ALTER TABLE calorie_logs
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC(6,1) CHECK (protein_g IS NULL OR protein_g >= 0),
  ADD COLUMN IF NOT EXISTS fat_g     NUMERIC(6,1) CHECK (fat_g IS NULL OR fat_g >= 0),
  ADD COLUMN IF NOT EXISTS carbs_g   NUMERIC(6,1) CHECK (carbs_g IS NULL OR carbs_g >= 0);
