-- Vlastný jedálny protokol (šablóna jedál) v používateľských nastaveniach
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS meal_protocol_mode TEXT NOT NULL DEFAULT 'bodyforge';

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS meal_protocol_custom JSONB;

COMMENT ON COLUMN user_settings.meal_protocol_mode IS 'bodyforge | custom';
COMMENT ON COLUMN user_settings.meal_protocol_custom IS 'JSON: meal1, snack (enabled), meal2';
