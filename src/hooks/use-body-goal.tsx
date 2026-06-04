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
  clampDailyCalorieTarget,
  EMPTY_BODY_GOAL,
  loadLocalBodyGoal,
  saveLocalBodyGoal,
  settingsFromDbRow,
  type BodyGoalSettings,
} from "@/lib/body-goal";

interface BodyGoalContextValue {
  settings: BodyGoalSettings;
  loading: boolean;
  saving: boolean;
  updateSettings: (patch: Partial<BodyGoalSettings>) => Promise<void>;
  updateDailyCalorieTarget: (kcal: number) => Promise<void>;
}

const BodyGoalContext = createContext<BodyGoalContextValue | null>(null);

export function BodyGoalProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BodyGoalSettings>(EMPTY_BODY_GOAL);
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
            "start_weight_kg, goal_weight_kg, current_weight_kg, goal_date, program_start_date, daily_calorie_target, eating_window_start, eating_window_end, hydration_target_liters"
          )
          .eq("user_id", userId)
          .maybeSingle(),
        8_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        const mapped = settingsFromDbRow(data);
        setSettings(mapped);
        saveLocalBodyGoal(userId, mapped);

        const hadLegacyDates =
          (data.goal_date != null || data.program_start_date != null) &&
          mapped.programStartDate == null &&
          mapped.goalDate == null;

        if (hadLegacyDates) {
          await supabase.from("user_settings").upsert(
            {
              user_id: userId,
              goal_date: null,
              program_start_date: null,
            },
            { onConflict: "user_id" }
          );
        }

        setLoading(false);
        return;
      }
    }

    setSettings(loadLocalBodyGoal(userId));
    setLoading(false);
  }, [authReady, userId, supabase]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (patch: Partial<BodyGoalSettings>) => {
      const raw = { ...settings, ...patch };

      // Normalize and clamp before persisting — UI validators may be bypassed via direct hook calls
      const clampWeight = (v: number | null) =>
        v != null && v >= 30 && v <= 300 ? Math.round(v * 10) / 10 : null;
      const clampCalories = (v: number | null) =>
        v != null ? clampDailyCalorieTarget(v) : null;
      const next: BodyGoalSettings = {
        ...raw,
        startWeightKg: clampWeight(raw.startWeightKg),
        goalWeightKg: clampWeight(raw.goalWeightKg),
        currentWeightKg: clampWeight(raw.currentWeightKg),
        dailyCalorieTarget: clampCalories(raw.dailyCalorieTarget),
      };

      setSettings(next);
      saveLocalBodyGoal(userId, next);
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
            eating_window_start: next.eatingWindowStart,
            eating_window_end: next.eatingWindowEnd,
            hydration_target_liters: next.hydrationTargetLiters,
          },
          { onConflict: "user_id" }
        );
      }

      setSaving(false);
    },
    [settings, userId, supabase]
  );

  const updateDailyCalorieTarget = useCallback(
    async (kcal: number) => {
      const next = clampDailyCalorieTarget(kcal);
      if (next == null) return;
      await updateSettings({ dailyCalorieTarget: next });
    },
    [updateSettings]
  );

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      updateSettings,
      updateDailyCalorieTarget,
    }),
    [settings, loading, saving, updateSettings, updateDailyCalorieTarget]
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
