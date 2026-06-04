ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS eating_window_start TIME DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS eating_window_end TIME DEFAULT '20:00';
