"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/fetch-timeout";
import { useAppUser } from "@/hooks/use-app-user";
import {
  DEFAULT_BODY_GOAL,
  loadLocalBodyGoal,
  saveLocalBodyGoal,
  type BodyGoalSettings,
} from "@/lib/body-goal";

interface BodyGoalContextValue {
  settings: BodyGoalSettings;
  loading: boolean;
  saving: boolean;
  updateSettings: (patch: Partial<BodyGoalSettings>) => Promise<void>;
}

const BodyGoalContext = createContext<BodyGoalContextValue | null>(null);

function rowToSettings(row: Record<string, unknown>): BodyGoalSettings {
  return {
    startWeightKg: Number(row.start_weight_kg) || DEFAULT_BODY_GOAL.startWeightKg,
    goalWeightKg: Number(row.goal_weight_kg) || DEFAULT_BODY_GOAL.goalWeightKg,
    currentWeightKg:
      row.current_weight_kg != null
        ? Number(row.current_weight_kg)
        : null,
    goalDate: String(row.goal_date ?? DEFAULT_BODY_GOAL.goalDate),
    programStartDate: String(
      row.program_start_date ?? DEFAULT_BODY_GOAL.programStartDate
    ),
    dailyCalorieTarget:
      Number(row.daily_calorie_target) || DEFAULT_BODY_GOAL.dailyCalorieTarget,
  };
}

export function BodyGoalProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BodyGoalSettings>(DEFAULT_BODY_GOAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { userId, authReady } = useAppUser();

  const supabase = useMemo(() => createClient(), []);

  const loadSettings = useCallback(async () => {
    if (!authReady) return;

    setLoading(true);

    if (userId && isSupabaseConfigured()) {
      const { data, error } = await withTimeout(
        supabase
          .from("user_settings")
          .select(
            "start_weight_kg, goal_weight_kg, current_weight_kg, goal_date, program_start_date, daily_calorie_target"
          )
          .eq("user_id", userId)
          .maybeSingle(),
        8_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        const mapped = rowToSettings(data);
        setSettings(mapped);
        saveLocalBodyGoal(mapped);
        setLoading(false);
        return;
      }
    }

    setSettings(loadLocalBodyGoal());
    setLoading(false);
  }, [authReady, userId, supabase]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (patch: Partial<BodyGoalSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveLocalBodyGoal(next);
      setSaving(true);

      if (userId && isSupabaseConfigured()) {
        await supabase.from("user_settings").upsert(
          {
            user_id: userId,
            start_weight_kg: next.startWeightKg,
            goal_weight_kg: next.goalWeightKg,
            current_weight_kg: next.currentWeightKg,
            goal_date: next.goalDate,
            program_start_date: next.programStartDate,
            daily_calorie_target: next.dailyCalorieTarget,
          },
          { onConflict: "user_id" }
        );
      }

      setSaving(false);
    },
    [settings, userId, supabase]
  );

  const value = useMemo(
    () => ({ settings, loading, saving, updateSettings }),
    [settings, loading, saving, updateSettings]
  );

  return (
    <BodyGoalContext.Provider value={value}>
      {children}
    </BodyGoalContext.Provider>
  );
}

export function useBodyGoal(): BodyGoalContextValue {
  const ctx = useContext(BodyGoalContext);
  if (!ctx) {
    throw new Error("useBodyGoal must be used within BodyGoalProvider");
  }
  return ctx;
}
