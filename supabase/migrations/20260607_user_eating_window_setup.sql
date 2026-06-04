-- ============================================================
-- BodyForge — jedálne okno (16:8 / vlastné) per používateľ
-- Spusti raz v Supabase → SQL Editor → Run
-- ============================================================
-- Hodnoty NEMUSÍš meniť tu v SQL — v appke: Môj cieľ → Jedálne okno → Uložiť.
-- Tento skript len pripraví stĺpce v user_settings (sync medzi zariadeniami).

-- Tabuľka nastavení (ak ešte neexistuje)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  start_weight_kg NUMERIC(5, 2),
  goal_weight_kg NUMERIC(5, 2),
  current_weight_kg NUMERIC(5, 2),
  goal_date DATE DEFAULT '2026-07-02',
  program_start_date DATE DEFAULT '2026-06-01',
  daily_calorie_target INTEGER DEFAULT 2000,
  eating_window_start TIME DEFAULT '12:00',
  eating_window_end TIME DEFAULT '20:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doplnenie stĺpcov na existujúcej tabuľke
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS start_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS goal_date DATE DEFAULT '2026-07-02',
  ADD COLUMN IF NOT EXISTS program_start_date DATE DEFAULT '2026-06-01',
  ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS eating_window_start TIME DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS eating_window_end TIME DEFAULT '20:00';

-- Presun zo starých názvov (fasting_start / fasting_end), ak existujú
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'fasting_start'
  ) THEN
    UPDATE user_settings
    SET
      eating_window_start = COALESCE(
        eating_window_start,
        fasting_start,
        TIME '12:00'
      ),
      eating_window_end = COALESCE(
        eating_window_end,
        NULLIF(fasting_end, TIME '19:00'),
        TIME '20:00'
      );
  END IF;
END $$;

-- RLS — každý user vidí len svoje nastavenia
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tréning dnes + odstránenie legacy úloh
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS training_done BOOLEAN DEFAULT FALSE;

ALTER TABLE daily_logs DROP COLUMN IF EXISTS evening_tech_off;
ALTER TABLE daily_logs DROP COLUMN IF EXISTS morning_vacuum;
