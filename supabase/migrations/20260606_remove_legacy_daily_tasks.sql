-- Odstránenie legacy stĺpcov (večerné vypnutie / ranné vákuum) — nahradené training_done
ALTER TABLE daily_logs DROP COLUMN IF EXISTS evening_tech_off;
ALTER TABLE daily_logs DROP COLUMN IF EXISTS morning_vacuum;
