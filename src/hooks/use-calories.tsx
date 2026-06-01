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
  type CalorieDayStatus,
  type CalorieLogEntry,
} from "@/lib/calories";
import { useAppUser } from "@/hooks/use-app-user";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useDailyTracker } from "@/hooks/use-daily-tracker";

const LOCAL_CALORIE_PREFIX = "bodyforge-calorie-log-";

function loadLocalLogs(date: string): CalorieLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_CALORIE_PREFIX}${date}`);
    if (raw) return JSON.parse(raw) as CalorieLogEntry[];
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLogs(date: string, logs: CalorieLogEntry[]): void {
  localStorage.setItem(
    `${LOCAL_CALORIE_PREFIX}${date}`,
    JSON.stringify(logs)
  );
}

interface CalorieContextValue {
  logs: CalorieLogEntry[];
  totalCalories: number;
  status: CalorieDayStatus;
  isFastingDay: boolean;
  loading: boolean;
  saving: boolean;
  addEntry: (label: string, calories: number) => Promise<boolean>;
  removeEntry: (id: string) => Promise<void>;
  setFastingDay: (value: boolean) => Promise<void>;
}

const CalorieContext = createContext<CalorieContextValue | null>(null);

export function CalorieProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useBodyGoal();
  const { tasks, toggleTask } = useDailyTracker();
  const isFastingDay = tasks.is_fasting_day;

  const [logs, setLogs] = useState<CalorieLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          .select("id, label, calories, logged_at")
          .eq("user_id", userId)
          .eq("log_date", dateStr)
          .order("logged_at", { ascending: true }),
        8_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        setLogs(data);
        setLoading(false);
        return;
      }
    }

    setLogs(loadLocalLogs(dateStr));
    setLoading(false);
  }, [authReady, userId, dateStr, supabase]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const persist = useCallback(
    async (nextLogs: CalorieLogEntry[]) => {
      setLogs(nextLogs);
      saveLocalLogs(dateStr, nextLogs);
    },
    [dateStr]
  );

  const addEntry = useCallback(
    async (label: string, calories: number): Promise<boolean> => {
      if (isFastingDay) return false;
      if (calories <= 0 || calories > 10000) return false;

      setSaving(true);
      const loggedAt = new Date().toISOString();
      const entry: CalorieLogEntry = {
        id: crypto.randomUUID(),
        label,
        calories,
        logged_at: loggedAt,
      };

      if (userId && isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("calorie_logs")
          .insert({
            user_id: userId,
            label,
            calories,
            logged_at: loggedAt,
            log_date: dateStr,
          })
          .select("id, label, calories, logged_at")
          .single();

        if (!error && data) {
          await persist([...logs, data]);
          setSaving(false);
          return true;
        }
      }

      await persist([...logs, entry]);
      setSaving(false);
      return true;
    },
    [isFastingDay, userId, dateStr, supabase, logs, persist]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      setSaving(true);
      if (userId && isSupabaseConfigured()) {
        await supabase
          .from("calorie_logs")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
      }
      await persist(logs.filter((l) => l.id !== id));
      setSaving(false);
    },
    [userId, supabase, logs, persist]
  );

  const setFastingDay = useCallback(
    async (value: boolean) => {
      if (value && logs.length > 0) {
        const ok = window.confirm(
          "Zapnúť fasting deň? Existujúce kalorické záznamy zostanú — odporúčame ich zmazať (iba voda = 0 kcal)."
        );
        if (!ok) return;
      }
      await toggleTask("is_fasting_day", value);
    },
    [logs.length, toggleTask]
  );

  const totalCalories = sumCalories(logs);
  const status = evaluateCalorieDay(
    totalCalories,
    settings.dailyCalorieTarget,
    isFastingDay
  );

  const value = useMemo(
    () => ({
      logs,
      totalCalories,
      status,
      isFastingDay,
      loading,
      saving,
      addEntry,
      removeEntry,
      setFastingDay,
    }),
    [
      logs,
      totalCalories,
      status,
      isFastingDay,
      loading,
      saving,
      addEntry,
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
