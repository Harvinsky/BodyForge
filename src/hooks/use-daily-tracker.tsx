"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format, subDays } from "date-fns";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/fetch-timeout";
import { useAppUser } from "@/hooks/use-app-user";
import {
  calculateCompletion,
  countCompletedTasks,
  emptyDailyTasks,
  type DailyLog,
  type DailyTaskKey,
  type DailyTasks,
  type ProgressDay,
  TOTAL_DAILY_TASKS,
} from "@/lib/types";
import {
  type HabitKey,
  waterWeekPercent,
  weekHabitSuccess,
} from "@/lib/habits";
import { hydrationFlagsFromMl } from "@/lib/hydration";
import {
  type MealTaskKey,
  rowToDailyTasks,
  tasksWithMealUpdate,
} from "@/lib/meals";

export interface WeekColumn {
  weekIndex: number;
  label: string;
  habits: Record<HabitKey, boolean>;
}

const LOCAL_STORAGE_PREFIX = "t800-daily-log-";
const SUPABASE_TIMEOUT_MS = 12_000;

const EMPTY_WEEK_COLUMNS: WeekColumn[] = [1, 2, 3, 4].map((n) => ({
  weekIndex: n,
  label: `Week ${n}`,
  habits: {
    fasting: false,
    water: false,
    vacuum: false,
    night: false,
  },
}));

function getTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function loadLocalTasks(date: string): DailyTasks {
  if (typeof window === "undefined") return emptyDailyTasks();

  try {
    const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${date}`);
    if (stored) {
      return { ...emptyDailyTasks(), ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return emptyDailyTasks();
}

function saveLocalTasks(date: string, tasks: DailyTasks): void {
  localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${date}`, JSON.stringify(tasks));
}

interface DailyTrackerContextValue {
  tasks: DailyTasks;
  toggleTask: (key: DailyTaskKey, value: boolean) => Promise<void>;
  toggleMeal: (key: MealTaskKey, value: boolean) => Promise<void>;
  syncHydrationLevels: (totalMl: number) => Promise<void>;
  applyHydrationFlagsLocal: (totalMl: number) => void;
  toggleHabit: (habit: HabitKey, value: boolean) => Promise<void>;
  completion: number;
  completedCount: number;
  totalTasks: number;
  progressHistory: ProgressDay[];
  weekColumns: WeekColumn[];
  waterWeekPercent: number;
  loading: boolean;
  syncing: boolean;
  userId: string | null;
  logDate: string;
}

const DailyTrackerContext = createContext<DailyTrackerContextValue | null>(
  null
);

export function DailyTrackerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<DailyTasks>(emptyDailyTasks);
  const [progressHistory, setProgressHistory] = useState<ProgressDay[]>([]);
  const [weekColumns, setWeekColumns] =
    useState<WeekColumn[]>(EMPTY_WEEK_COLUMNS);
  const [waterWeekPct, setWaterWeekPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [logDate] = useState(getTodayDate);
  const { userId, authReady } = useAppUser();

  const supabase = useMemo(() => createClient(), []);

  const buildProgressHistory = useCallback(
    async (uid: string | null) => {
      const byDate = new Map<string, DailyTasks>();

      if (uid && isSupabaseConfigured()) {
        try {
          const start = format(subDays(new Date(), 27), "yyyy-MM-dd");
          const end = format(new Date(), "yyyy-MM-dd");
          const { data } = await withTimeout(
            supabase
              .from("daily_logs")
              .select("*")
              .eq("user_id", uid)
              .gte("log_date", start)
              .lte("log_date", end),
            SUPABASE_TIMEOUT_MS
          );
          for (const row of data ?? []) {
            const key = row.log_date as string;
            if (key) byDate.set(key, rowToDailyTasks(row));
          }
        } catch {
          // slow/offline — fall back to localStorage per day
        }
      }

      const tasksFor = (dateStr: string): DailyTasks =>
        byDate.get(dateStr) ?? loadLocalTasks(dateStr);

      const days: ProgressDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTasks = tasksFor(dateStr);
        days.push({
          date: dateStr,
          label: format(date, "EEE"),
          completion: calculateCompletion(dayTasks),
          completed: countCompletedTasks(dayTasks),
          total: TOTAL_DAILY_TASKS,
        });
      }
      setProgressHistory(days);

      const weekCols: WeekColumn[] = [];
      for (let w = 3; w >= 0; w--) {
        const weekDays: DailyTasks[] = [];
        for (let d = 6; d >= 0; d--) {
          const date = subDays(new Date(), w * 7 + d);
          weekDays.push(tasksFor(format(date, "yyyy-MM-dd")));
        }
        weekCols.push({
          weekIndex: 4 - w,
          label: `Week ${4 - w}`,
          habits: {
            fasting: weekHabitSuccess(weekDays, "fasting"),
            water: weekHabitSuccess(weekDays, "water"),
            vacuum: weekHabitSuccess(weekDays, "vacuum"),
            night: weekHabitSuccess(weekDays, "night"),
          },
        });
      }
      setWeekColumns(weekCols);

      const currentWeekDays: DailyTasks[] = [];
      for (let d = 6; d >= 0; d--) {
        currentWeekDays.push(
          tasksFor(format(subDays(new Date(), d), "yyyy-MM-dd"))
        );
      }
      setWaterWeekPct(waterWeekPercent(currentWeekDays));
    },
    [supabase]
  );

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function init() {
      setLoading(true);

      try {
        if (userId && isSupabaseConfigured()) {
          try {
            const { data } = await withTimeout(
              supabase
                .from("daily_logs")
                .select("*")
                .eq("user_id", userId)
                .eq("log_date", logDate)
                .maybeSingle(),
              8_000
            );
            if (!cancelled) {
              setTasks(
                data ? rowToDailyTasks(data) : loadLocalTasks(logDate)
              );
            }
          } catch {
            if (!cancelled) setTasks(loadLocalTasks(logDate));
          }
        } else if (!cancelled) {
          setTasks(loadLocalTasks(logDate));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (!cancelled) {
        void buildProgressHistory(userId);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [authReady, userId, supabase, logDate, buildProgressHistory]);

  const applyHydrationFlagsLocal = useCallback((totalMl: number) => {
    setTasks((prev) => ({ ...prev, ...hydrationFlagsFromMl(totalMl) }));
  }, []);

  const persistTasks = useCallback(
    async (nextTasks: DailyTasks) => {
      saveLocalTasks(logDate, nextTasks);

      if (!userId || !isSupabaseConfigured()) return;

      setSyncing(true);
      try {
        const payload: Omit<DailyLog, "id" | "created_at" | "updated_at"> = {
          user_id: userId,
          log_date: logDate,
          ...nextTasks,
        };
        const { error } = await supabase.from("daily_logs").upsert(payload, {
          onConflict: "user_id,log_date",
        });

        if (error) {
          const legacyPayload = {
            user_id: userId,
            log_date: logDate,
            fasting_window: nextTasks.fasting_window,
            hydration_1l: nextTasks.hydration_1l,
            hydration_2l: nextTasks.hydration_2l,
            hydration_3l: nextTasks.hydration_3l,
            morning_vacuum: nextTasks.morning_vacuum,
            evening_tech_off: nextTasks.evening_tech_off,
          };
          await supabase.from("daily_logs").upsert(legacyPayload, {
            onConflict: "user_id,log_date",
          });
        }

        await buildProgressHistory(userId);
      } finally {
        setSyncing(false);
      }
    },
    [userId, logDate, supabase, buildProgressHistory]
  );

  const toggleTask = useCallback(
    async (key: DailyTaskKey, value: boolean) => {
      let nextTasks = emptyDailyTasks();
      setTasks((prev) => {
        nextTasks = { ...prev, [key]: value };
        return nextTasks;
      });
      await persistTasks(nextTasks);
    },
    [persistTasks]
  );

  const toggleMeal = useCallback(
    async (mealKey: MealTaskKey, value: boolean) => {
      let nextTasks = emptyDailyTasks();
      setTasks((prev) => {
        nextTasks = tasksWithMealUpdate(prev, mealKey, value);
        return nextTasks;
      });
      await persistTasks(nextTasks);
    },
    [persistTasks]
  );

  const syncHydrationLevels = useCallback(
    async (totalMl: number) => {
      let nextTasks = emptyDailyTasks();
      setTasks((prev) => {
        nextTasks = { ...prev, ...hydrationFlagsFromMl(totalMl) };
        return nextTasks;
      });
      await persistTasks(nextTasks);
    },
    [persistTasks]
  );

  const toggleHabit = useCallback(
    async (habit: HabitKey, value: boolean) => {
      if (habit === "water") {
        let nextTasks = emptyDailyTasks();
        setTasks((prev) => {
          nextTasks = {
            ...prev,
            hydration_1l: value,
            hydration_2l: value,
            hydration_3l: value,
          };
          return nextTasks;
        });
        await persistTasks(nextTasks);
        return;
      }

      const keyMap: Record<Exclude<HabitKey, "water">, DailyTaskKey> = {
        fasting: "fasting_window",
        vacuum: "morning_vacuum",
        night: "evening_tech_off",
      };
      await toggleTask(keyMap[habit], value);
    },
    [persistTasks, toggleTask]
  );

  const value = useMemo(
    () => ({
      tasks,
      toggleTask,
      toggleMeal,
      syncHydrationLevels,
      applyHydrationFlagsLocal,
      toggleHabit,
      completion: calculateCompletion(tasks),
      completedCount: countCompletedTasks(tasks),
      totalTasks: TOTAL_DAILY_TASKS,
      progressHistory,
      weekColumns,
      waterWeekPercent: waterWeekPct,
      loading,
      syncing,
      userId,
      logDate,
    }),
    [
      tasks,
      toggleTask,
      toggleMeal,
      syncHydrationLevels,
      applyHydrationFlagsLocal,
      toggleHabit,
      progressHistory,
      weekColumns,
      waterWeekPct,
      loading,
      syncing,
      userId,
      logDate,
    ]
  );

  return (
    <DailyTrackerContext.Provider value={value}>
      {children}
    </DailyTrackerContext.Provider>
  );
}

export function useDailyTracker(): DailyTrackerContextValue {
  const context = useContext(DailyTrackerContext);
  if (!context) {
    throw new Error("useDailyTracker must be used within DailyTrackerProvider");
  }
  return context;
}
