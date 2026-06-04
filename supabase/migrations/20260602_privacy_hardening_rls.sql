-- Privacy hardening: enforce strict per-user isolation on all app tables
-- Run in Supabase SQL editor (safe to run multiple times).

ALTER TABLE IF EXISTS daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calorie_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_activity_metrics ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS daily_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hydration_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calorie_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS training_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_activity_metrics FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON daily_logs;
CREATE POLICY "Users can view own logs"
  ON daily_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own logs" ON daily_logs;
CREATE POLICY "Users can insert own logs"
  ON daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own logs" ON daily_logs;
CREATE POLICY "Users can update own logs"
  ON daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own logs" ON daily_logs;
CREATE POLICY "Users can delete own logs"
  ON daily_logs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own hydration logs" ON hydration_logs;
CREATE POLICY "Users can view own hydration logs"
  ON hydration_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own hydration logs" ON hydration_logs;
CREATE POLICY "Users can insert own hydration logs"
  ON hydration_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own hydration logs" ON hydration_logs;
CREATE POLICY "Users can delete own hydration logs"
  ON hydration_logs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own calorie logs" ON calorie_logs;
CREATE POLICY "Users can view own calorie logs"
  ON calorie_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own calorie logs" ON calorie_logs;
CREATE POLICY "Users can insert own calorie logs"
  ON calorie_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calorie logs" ON calorie_logs;
CREATE POLICY "Users can delete own calorie logs"
  ON calorie_logs FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF to_regclass('public.training_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own training logs" ON training_logs';
    EXECUTE 'CREATE POLICY "Users can view own training logs" ON training_logs FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own training logs" ON training_logs';
    EXECUTE 'CREATE POLICY "Users can insert own training logs" ON training_logs FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own training logs" ON training_logs';
    EXECUTE 'CREATE POLICY "Users can delete own training logs" ON training_logs FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.daily_activity_metrics') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own activity metrics" ON daily_activity_metrics';
    EXECUTE 'CREATE POLICY "Users can view own activity metrics" ON daily_activity_metrics FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own activity metrics" ON daily_activity_metrics';
    EXECUTE 'CREATE POLICY "Users can insert own activity metrics" ON daily_activity_metrics FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own activity metrics" ON daily_activity_metrics';
    EXECUTE 'CREATE POLICY "Users can update own activity metrics" ON daily_activity_metrics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own activity metrics" ON daily_activity_metrics';
    EXECUTE 'CREATE POLICY "Users can delete own activity metrics" ON daily_activity_metrics FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;
