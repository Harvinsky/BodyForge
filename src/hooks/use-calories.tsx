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
import {
  evaluateCalorieDay,
  getTodayLogDate,
  sumCalories,
  sumMacros,
  calcProteinGoalG,
  resolveProteinMode,
  type ProteinGoalMode,
  type CalorieDayStatus,
  type CalorieLogEntry,
  type MacroTotals,
} from "@/lib/calories";
import { useAppUser } from "@/hooks/use-app-user";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { getEffectiveWeightKg } from "@/lib/body-goal";
import {
  computeDailyBurn,
  trainingDaySummaryFromSessions,
} from "@/lib/activity-burn";
import {
  loadLocalActivityMetrics,
  loadLocalTrainingSessions,
} from "@/lib/activity-storage";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useI18n } from "@/providers/locale-provider";
import type { MealTaskKey } from "@/lib/meals";
import {
  groupLogsByMeal,
  mealHasLogs,
  sumMealCalories,
} from "@/lib/meal-calorie-link";
import {
  DAY_HISTORY_CHANGED,
  dayHistoryChangedIncludesToday,
} from "@/lib/day-history-events";

const LOCAL_CALORIE_PREFIX = "bodyforge-calorie-log-";

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

function localKey(userId: string | null, date: string): string {
  return `${LOCAL_CALORIE_PREFIX}${localScope(userId)}:${date}`;
}

function loadLocalLogs(userId: string | null, date: string): CalorieLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKey(userId, date));
    if (raw) return JSON.parse(raw) as CalorieLogEntry[];
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLogs(
  userId: string | null,
  date: string,
  logs: CalorieLogEntry[]
): void {
  localStorage.setItem(localKey(userId, date), JSON.stringify(logs));
}

export interface CalorieEntryInput {
  label: string;
  calories: number;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
}

interface CalorieContextValue {
  logs: CalorieLogEntry[];
  logsByMeal: ReturnType<typeof groupLogsByMeal>;
  totalCalories: number;
  caloriesBurned: number;
  netCalories: number;
  status: CalorieDayStatus;
  isFastingDay: boolean;
  loading: boolean;
  saving: boolean;
  macros: MacroTotals;
  proteinGoalG: number;
  proteinMode: ProteinGoalMode;
  mealCalories: (mealKey: MealTaskKey) => number;
  addEntry: (
    label: string,
    calories: number,
    mealKey?: MealTaskKey | null,
    macros?: { protein_g?: number | null; fat_g?: number | null; carbs_g?: number | null }
  ) => Promise<boolean>;
  addMealEntries: (
    items: CalorieEntryInput[],
    mealKey: MealTaskKey
  ) => Promise<boolean>;
  removeEntry: (id: string) => Promise<void>;
  setFastingDay: (value: boolean) => Promise<void>;
}

const CalorieContext = createContext<CalorieContextValue | null>(null);

export function CalorieProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useBodyGoal();
  const { tasks, toggleTask, toggleMeal } = useDailyTracker();
  const isFastingDay = tasks.is_fasting_day;
  const { t } = useI18n();

  const [logs, setLogs] = useState<CalorieLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const { authReady } = useAppUser();
  const { userId } = useDailyTracker();

  const supabase = useMemo(() => createClient(), []);
  const dateStr = getTodayLogDate();

  const loadLogs = useCallback(async () => {
    if (!authReady) return;

    setLoading(true);

    if (userId && isSupabaseConfigured()) {
      const { data, error } = await withTimeout(
        supabase
          .from("calorie_logs")
          .select("id, label, calories, logged_at, meal_key, protein_g, fat_g, carbs_g")
          .eq("user_id", userId)
          .eq("log_date", dateStr)
          .order("logged_at", { ascending: true }),
        8_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        setLogs(data as CalorieLogEntry[]);
        const { data: activity } = await withTimeout(
          supabase
            .from("daily_activity_metrics")
            .select("calories_burned_manual, calories_burned_estimated")
            .eq("user_id", userId)
            .eq("log_date", dateStr)
            .maybeSingle(),
          4_000
        ).catch(() => ({ data: null }));
        setCaloriesBurned(
          Math.max(
            Number(activity?.calories_burned_manual ?? 0),
            Number(activity?.calories_burned_estimated ?? 0)
          )
        );
        setLoading(false);
        return;
      }
    }

    setLogs(loadLocalLogs(userId, dateStr));
    const weightKg = getEffectiveWeightKg(settings) ?? 0;
    const localBurn = computeDailyBurn(
      loadLocalActivityMetrics(userId, dateStr),
      trainingDaySummaryFromSessions(
        loadLocalTrainingSessions(userId, dateStr)
      ),
      weightKg
    );
    setCaloriesBurned(localBurn.totalBurned);
    setLoading(false);
  }, [authReady, userId, dateStr, supabase, settings]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const onHistory = (event: Event) => {
      const dates =
        (event as CustomEvent<{ dates?: string[] }>).detail?.dates ?? [];
      if (dayHistoryChangedIncludesToday(dates, dateStr)) {
        void loadLogs();
      }
    };
    window.addEventListener(DAY_HISTORY_CHANGED, onHistory);
    return () => window.removeEventListener(DAY_HISTORY_CHANGED, onHistory);
  }, [loadLogs, dateStr]);

  const persist = useCallback(
    async (nextLogs: CalorieLogEntry[]) => {
      setLogs(nextLogs);
      saveLocalLogs(userId, dateStr, nextLogs);
    },
    [dateStr, userId]
  );

  const syncMealCheck = useCallback(
    async (mealKey: MealTaskKey, nextLogs: CalorieLogEntry[]) => {
      const has = mealHasLogs(nextLogs, mealKey);
      if (has && !tasks[mealKey]) {
        await toggleMeal(mealKey, true);
      } else if (!has && tasks[mealKey]) {
        await toggleMeal(mealKey, false);
      }
    },
    [tasks, toggleMeal]
  );

  const insertEntries = useCallback(
    async (
      items: CalorieEntryInput[],
      mealKey?: MealTaskKey | null
    ): Promise<CalorieLogEntry[]> => {
      const loggedAt = new Date().toISOString();
      const created: CalorieLogEntry[] = [];

      if (userId && isSupabaseConfigured()) {
        for (const item of items) {
          const { data, error } = await supabase
            .from("calorie_logs")
            .insert({
              user_id: userId,
              label: item.label,
              calories: item.calories,
              logged_at: loggedAt,
              log_date: dateStr,
              meal_key: mealKey ?? null,
              protein_g: item.protein_g ?? null,
              fat_g: item.fat_g ?? null,
              carbs_g: item.carbs_g ?? null,
            })
            .select("id, label, calories, logged_at, meal_key, protein_g, fat_g, carbs_g")
            .single();

          if (!error && data) {
            created.push(data as CalorieLogEntry);
            continue;
          }

          created.push({
            id: crypto.randomUUID(),
            label: item.label,
            calories: item.calories,
            logged_at: loggedAt,
            meal_key: mealKey ?? null,
            protein_g: item.protein_g ?? null,
            fat_g: item.fat_g ?? null,
            carbs_g: item.carbs_g ?? null,
          });
        }
        return created;
      }

      return items.map((item) => ({
        id: crypto.randomUUID(),
        label: item.label,
        calories: item.calories,
        logged_at: loggedAt,
        meal_key: mealKey ?? null,
        protein_g: item.protein_g ?? null,
        fat_g: item.fat_g ?? null,
        carbs_g: item.carbs_g ?? null,
      }));
    },
    [userId, dateStr, supabase]
  );

  const addEntry = useCallback(
    async (
      label: string,
      calories: number,
      mealKey?: MealTaskKey | null,
      macroInput?: { protein_g?: number | null; fat_g?: number | null; carbs_g?: number | null }
    ): Promise<boolean> => {
      if (isFastingDay) return false;
      const trimmedLabel = label.trim().slice(0, 200);
      if (!trimmedLabel || calories <= 0 || calories > 10000) return false;

      setSaving(true);
      try {
        const clampMacro = (v?: number | null) =>
          v != null ? Math.min(500, Math.max(0, Math.round(v))) : null;
        const created = await insertEntries(
          [{
            label: trimmedLabel,
            calories: Math.round(calories),
            protein_g: clampMacro(macroInput?.protein_g),
            fat_g: clampMacro(macroInput?.fat_g),
            carbs_g: clampMacro(macroInput?.carbs_g),
          }],
          mealKey
        );
        const nextLogs = [...logs, ...created];
        await persist(nextLogs);
        if (mealKey) await syncMealCheck(mealKey, nextLogs);
        return true;
      } finally {
        setSaving(false);
      }
    },
    [isFastingDay, insertEntries, logs, persist, syncMealCheck]
  );

  const addMealEntries = useCallback(
    async (
      items: CalorieEntryInput[],
      mealKey: MealTaskKey
    ): Promise<boolean> => {
      if (isFastingDay) return false;
      const valid = items.filter((i) => i.calories > 0 && i.calories <= 10000 && i.label.trim());
      if (valid.length === 0) return false;

      setSaving(true);
      try {
        const created = await insertEntries(
          valid.map((i) => ({
            label: i.label.trim().slice(0, 200),
            calories: Math.round(i.calories),
            protein_g: i.protein_g != null ? Math.min(500, Math.max(0, Math.round(i.protein_g))) : null,
            fat_g: i.fat_g != null ? Math.min(500, Math.max(0, Math.round(i.fat_g))) : null,
            carbs_g: i.carbs_g != null ? Math.min(500, Math.max(0, Math.round(i.carbs_g))) : null,
          })),
          mealKey
        );
        const nextLogs = [...logs, ...created];
        await persist(nextLogs);
        await syncMealCheck(mealKey, nextLogs);
        return true;
      } finally {
        setSaving(false);
      }
    },
    [isFastingDay, insertEntries, logs, persist, syncMealCheck]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const removed = logs.find((l) => l.id === id);
        if (userId && isSupabaseConfigured()) {
          await withTimeout(
            supabase
              .from("calorie_logs")
              .delete()
              .eq("id", id)
              .eq("user_id", userId),
            8_000
          ).catch(() => undefined);
        }
        const nextLogs = logs.filter((l) => l.id !== id);
        await persist(nextLogs);
        if (removed?.meal_key) await syncMealCheck(removed.meal_key, nextLogs);
      } finally {
        setSaving(false);
      }
    },
    [userId, supabase, logs, persist, syncMealCheck]
  );

  const setFastingDay = useCallback(
    async (value: boolean) => {
      if (value && logs.length > 0) {
        const ok = window.confirm(t("calories.confirmFastingDay"));
        if (!ok) return;
      }
      await toggleTask("is_fasting_day", value);
    },
    [logs.length, toggleTask, t]
  );

  const totalCalories = sumCalories(logs);
  const netCalories = Math.max(0, totalCalories - caloriesBurned);
  const status = evaluateCalorieDay(
    netCalories,
    settings.dailyCalorieTarget,
    isFastingDay
  );
  const logsByMeal = useMemo(() => groupLogsByMeal(logs), [logs]);
  const macros = useMemo(() => sumMacros(logs), [logs]);

  const weightKg = getEffectiveWeightKg(settings);
  const proteinMode = resolveProteinMode(weightKg, settings.goalWeightKg);
  const proteinGoalG = calcProteinGoalG(weightKg, settings.goalWeightKg);

  const mealCalories = useCallback(
    (mealKey: MealTaskKey) => sumMealCalories(logs, mealKey),
    [logs]
  );

  const value = useMemo(
    () => ({
      logs,
      logsByMeal,
      totalCalories,
      caloriesBurned,
      netCalories,
      status,
      isFastingDay,
      loading,
      saving,
      macros,
      proteinGoalG,
      proteinMode,
      mealCalories,
      addEntry,
      addMealEntries,
      removeEntry,
      setFastingDay,
    }),
    [
      logs,
      logsByMeal,
      totalCalories,
      caloriesBurned,
      netCalories,
      status,
      isFastingDay,
      loading,
      saving,
      macros,
      proteinGoalG,
      proteinMode,
      mealCalories,
      addEntry,
      addMealEntries,
      removeEntry,
      setFastingDay,
    ]
  );

  return (
    <CalorieContext.Provider value={value}>{children}</CalorieContext.Provider>
  );
}

export function useCalories(): CalorieContextValue {
  const ctx = useContext(CalorieContext);
  if (!ctx) {
    throw new Error("useCalories must be used within CalorieProvider");
  }
  return ctx;
}
