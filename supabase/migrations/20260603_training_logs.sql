-- Training activity logs (per-user)
CREATE TABLE IF NOT EXISTS training_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_logs_user_date
  ON training_logs (user_id, log_date);

ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own training logs" ON training_logs;
CREATE POLICY "Users can view own training logs"
  ON training_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own training logs" ON training_logs;
CREATE POLICY "Users can insert own training logs"
  ON training_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own training logs" ON training_logs;
CREATE POLICY "Users can delete own training logs"
  ON training_logs FOR DELETE
  USING (auth.uid() = user_id);
