-- Archív programov — pomenované obdobia (jar 2026, minulý rok, …)
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
