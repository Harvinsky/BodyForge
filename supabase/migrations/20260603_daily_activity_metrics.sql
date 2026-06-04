-- Per-user daily activity summary: steps + calories burned
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

CREATE INDEX IF NOT EXISTS idx_daily_activity_metrics_user_date
  ON daily_activity_metrics (user_id, log_date);

ALTER TABLE daily_activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_metrics FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can view own activity metrics"
  ON daily_activity_metrics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can insert own activity metrics"
  ON daily_activity_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can update own activity metrics"
  ON daily_activity_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activity metrics" ON daily_activity_metrics;
CREATE POLICY "Users can delete own activity metrics"
  ON daily_activity_metrics FOR DELETE
  USING (auth.uid() = user_id);
