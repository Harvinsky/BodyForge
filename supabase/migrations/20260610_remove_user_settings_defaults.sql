-- ============================================================
-- BodyForge — odstrániť predvolené dátumy obdobia v user_settings
-- Spusti raz v Supabase → SQL Editor → Run
-- ============================================================
-- Nový user nemá mať 2026-06-01 / 2026-07-02 kým si sám neuloží cieľ.

-- Zrušiť DEFAULT na stĺpcoch (nové riadky už nedostanú falošné dátumy)
ALTER TABLE user_settings
  ALTER COLUMN goal_date DROP DEFAULT,
  ALTER COLUMN program_start_date DROP DEFAULT;

-- Voliteľné: zrušiť aj default kalórií (appka nechá NULL kým user neuloží limit)
ALTER TABLE user_settings
  ALTER COLUMN daily_calorie_target DROP DEFAULT;

-- Vyčistiť osirelé dátumy — bez uloženej váhy to nebol skutočný cieľ
UPDATE user_settings
SET
  goal_date = NULL,
  program_start_date = NULL
WHERE start_weight_kg IS NULL OR goal_weight_kg IS NULL;

-- Vyčistiť starý testovací seed (90→85 kg, jún–júl 2026)
UPDATE user_settings
SET
  start_weight_kg = NULL,
  goal_weight_kg = NULL,
  current_weight_kg = NULL,
  goal_date = NULL,
  program_start_date = NULL,
  daily_calorie_target = NULL,
  eating_window_start = NULL,
  eating_window_end = NULL
WHERE program_start_date = DATE '2026-06-01'
  AND goal_date = DATE '2026-07-02'
  AND start_weight_kg = 90
  AND goal_weight_kg = 85;
