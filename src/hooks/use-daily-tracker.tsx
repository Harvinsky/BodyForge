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
import { dateFnsLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/types";
import { useI18n } from "@/providers/locale-provider";
import { withTimeout } from "@/lib/fetch-timeout";
import { useAppUser } from "@/hooks/use-app-user";
import { useBodyGoal } from "@/hooks/use-body-goal";
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
  isHabitDone,
  waterWeekPercent,
  weekHabitSuccess,
} from "@/lib/habits";
import { mergeHydrationTaskFlags } from "@/lib/hydration";
import {
  type MealTaskKey,
  rowToDailyTasks,
  tasksWithMealUpdate,
} from "@/lib/meals";
import { planRollingDayDates } from "@/lib/plan-days";
import {
  DAY_HISTORY_CHANGED,
  dayHistoryChangedIncludesToday,
} from "@/lib/day-history-events";

export interface WeekColumn {
  weekIndex: number;
  label: string;
  habits: Record<HabitKey, boolean>;
}

/** Jeden deň v týždennom prehľade (posledných 7 dní). */
export interface DayHabitColumn {
  date: string;
  label: string;
  isToday: boolean;
  habits: Record<HabitKey, boolean>;
}

const LOCAL_STORAGE_PREFIX = "t800-daily-log-";
const SUPABASE_TIMEOUT_MS = 12_000;

const EMPTY_DAY_COLUMNS: DayHabitColumn[] = [];

function getTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

function localKey(userId: string | null, date: string): string {
  return `${LOCAL_STORAGE_PREFIX}${localScope(userId)}:${date}`;
}

function loadLocalTasks(userId: string | null, date: string): DailyTasks {
  if (typeof window === "undefined") return emptyDailyTasks();

  try {
    const stored = localStorage.getItem(localKey(userId, date));
    if (stored) {
      return { ...emptyDailyTasks(), ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return emptyDailyTasks();
}

function saveLocalTasks(
  userId: string | null,
  date: string,
  tasks: DailyTasks
): void {
  localStorage.setItem(localKey(userId, date), JSON.stringify(tasks));
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
  dayColumns: DayHabitColumn[];
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
    useState<WeekColumn[]>([]);
  const [dayColumns, setDayColumns] =
    useState<DayHabitColumn[]>(EMPTY_DAY_COLUMNS);
  const [waterWeekPct, setWaterWeekPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [logDate, setLogDate] = useState(getTodayDate);
  const { userId, authReady } = useAppUser();
  const { settings: bodyGoal } = useBodyGoal();
  const { locale } = useI18n();

  const supabase = useMemo(() => createClient(), []);

  // Detekcia zmeny dňa (po polnoci) — resetuje logDate
  useEffect(() => {
    const check = () => {
      const today = getTodayDate();
      setLogDate((prev) => (prev !== today ? today : prev));
    };
    // Skontroluj každú minútu
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  const buildProgressHistory = useCallback(
    async (uid: string | null, programStartDate: string | null, appLocale: AppLocale) => {
      const dateLoc = dateFnsLocale(appLocale);
      const byDate = new Map<string, DailyTasks>();
      const todayStr = getTodayDate();
      const planDays = planRollingDayDates(programStartDate, 7);

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
        byDate.get(dateStr) ?? loadLocalTasks(uid, dateStr);

      const days: ProgressDay[] = planDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTasks = tasksFor(dateStr);
        return {
          date: dateStr,
          label: format(date, "EEE", { locale: dateLoc }),
          completion: calculateCompletion(dayTasks),
          completed: countCompletedTasks(dayTasks),
          total: TOTAL_DAILY_TASKS,
        };
      });
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
            training: weekHabitSuccess(weekDays, "training"),
          },
        });
      }
      setWeekColumns(weekCols);

      const dayCols: DayHabitColumn[] = planDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTasks = tasksFor(dateStr);
        return {
          date: dateStr,
          label: format(date, "EEE d.M.", { locale: dateLoc }),
          isToday: dateStr === todayStr,
          habits: {
            fasting: isHabitDone(dayTasks, "fasting"),
            water: isHabitDone(dayTasks, "water"),
            training: isHabitDone(dayTasks, "training"),
          },
        };
      });
      setDayColumns(dayCols);

      const currentWeekDays = planDays.map((date) =>
        tasksFor(format(date, "yyyy-MM-dd"))
      );
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
                data ? rowToDailyTasks(data) : loadLocalTasks(userId, logDate)
              );
            }
          } catch {
            if (!cancelled) setTasks(loadLocalTasks(userId, logDate));
          }
        } else if (!cancelled) {
          setTasks(loadLocalTasks(userId, logDate));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (!cancelled) {
        void buildProgressHistory(userId, bodyGoal.programStartDate, locale);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [authReady, userId, supabase, logDate, buildProgressHistory, bodyGoal.programStartDate, locale]);

  useEffect(() => {
    const reloadToday = async () => {
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
          setTasks(
            data ? rowToDailyTasks(data) : loadLocalTasks(userId, logDate)
          );
        } catch {
          setTasks(loadLocalTasks(userId, logDate));
        }
      } else {
        setTasks(loadLocalTasks(userId, logDate));
      }
      void buildProgressHistory(userId, bodyGoal.programStartDate, locale);
    };

    const onHistory = (event: Event) => {
      const dates =
        (event as CustomEvent<{ dates?: string[] }>).detail?.dates ?? [];
      if (dayHistoryChangedIncludesToday(dates, logDate)) {
        void reloadToday();
      }
    };
    window.addEventListener(DAY_HISTORY_CHANGED, onHistory);
    return () => window.removeEventListener(DAY_HISTORY_CHANGED, onHistory);
  }, [
    userId,
    supabase,
    logDate,
    buildProgressHistory,
    bodyGoal.programStartDate,
    locale,
  ]);

  const applyHydrationFlagsLocal = useCallback((totalMl: number) => {
    setTasks((prev) => ({
      ...prev,
      ...mergeHydrationTaskFlags(prev, totalMl),
    }));
  }, []);

  const persistTasks = useCallback(
    async (nextTasks: DailyTasks) => {
      saveLocalTasks(userId, logDate, nextTasks);

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
            training_done: nextTasks.training_done,
          };
          await supabase.from("daily_logs").upsert(legacyPayload, {
            onConflict: "user_id,log_date",
          });
        }

        try {
          await buildProgressHistory(userId, bodyGoal.programStartDate, locale);
        } catch {
          // offline / timeout — neblokuj zápis vody ani checkboxov
        }
      } finally {
        setSyncing(false);
      }
    },
    [userId, logDate, supabase, buildProgressHistory, bodyGoal.programStartDate, locale]
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
        nextTasks = {
          ...prev,
          ...mergeHydrationTaskFlags(prev, totalMl),
        };
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
        training: "training_done",
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
      dayColumns,
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
      dayColumns,
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
