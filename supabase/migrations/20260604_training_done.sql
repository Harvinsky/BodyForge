-- Tréning dnes (checkbox v daily trackeri)
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS training_done BOOLEAN DEFAULT FALSE;
