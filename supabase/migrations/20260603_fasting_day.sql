-- Fasting deň (iba voda, žiadny jedálniček)
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS is_fasting_day BOOLEAN DEFAULT FALSE;
