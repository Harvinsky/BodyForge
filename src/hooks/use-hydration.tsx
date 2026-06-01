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
import {
  buildHourlyChartData,
  getTodayLogDate,
  type HydrationLogEntry,
  isSystemOptimized,
  sumHydrationMl,
} from "@/lib/hydration";
import { useAppUser } from "@/hooks/use-app-user";
import { useDailyTracker } from "@/hooks/use-daily-tracker";

const LOCAL_HYDRATION_PREFIX = "t800-hydration-log-";

function loadLocalLogs(date: string): HydrationLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_HYDRATION_PREFIX}${date}`);
    if (raw) return JSON.parse(raw) as HydrationLogEntry[];
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLogs(date: string, logs: HydrationLogEntry[]): void {
  localStorage.setItem(
    `${LOCAL_HYDRATION_PREFIX}${date}`,
    JSON.stringify(logs)
  );
}

interface HydrationContextValue {
  logs: HydrationLogEntry[];
  totalMl: number;
  weekTotalMl: number;
  chartData: ReturnType<typeof buildHourlyChartData>;
  optimized: boolean;
  loading: boolean;
  saving: boolean;
  addWater: (amountMl: number) => Promise<void>;
  removeWater: (id: string) => Promise<void>;
}

const HydrationContext = createContext<HydrationContextValue | null>(null);

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const { authReady } = useAppUser();
  const { userId, logDate, syncHydrationLevels, applyHydrationFlagsLocal } =
    useDailyTracker();
  const [logs, setLogs] = useState<HydrationLogEntry[]>([]);
  const [weekTotalMl, setWeekTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const dateStr = logDate || getTodayLogDate();

  const loadWeekTotal = useCallback(async () => {
    const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

    if (userId && isSupabaseConfigured()) {
      const { data, error } = await withTimeout(
        supabase
          .from("hydration_logs")
          .select("amount_ml")
          .eq("user_id", userId)
          .gte("log_date", weekStart),
        10_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        setWeekTotalMl(data.reduce((s, r) => s + r.amount_ml, 0));
        return;
      }
    }

    let total = 0;
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      total += sumHydrationMl(loadLocalLogs(d));
    }
    setWeekTotalMl(total);
  }, [userId, supabase]);

  const loadLogs = useCallback(async () => {
    if (!authReady) return;

    setLoading(true);

    if (userId && isSupabaseConfigured()) {
      const { data, error } = await withTimeout(
        supabase
          .from("hydration_logs")
          .select("id, amount_ml, logged_at")
          .eq("user_id", userId)
          .eq("log_date", dateStr)
          .order("logged_at", { ascending: true }),
        10_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        setLogs(data);
        applyHydrationFlagsLocal(sumHydrationMl(data));
        await loadWeekTotal();
        setLoading(false);
        return;
      }
    }

    const local = loadLocalLogs(dateStr);
    setLogs(local);
    applyHydrationFlagsLocal(sumHydrationMl(local));
    await loadWeekTotal();
    setLoading(false);
  }, [
    authReady,
    userId,
    dateStr,
    supabase,
    applyHydrationFlagsLocal,
    loadWeekTotal,
  ]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const applyLogs = useCallback(
    async (nextLogs: HydrationLogEntry[]) => {
      setLogs(nextLogs);
      saveLocalLogs(dateStr, nextLogs);
      await syncHydrationLevels(sumHydrationMl(nextLogs));
      await loadWeekTotal();
    },
    [dateStr, syncHydrationLevels, loadWeekTotal]
  );

  const addWater = useCallback(
    async (amountMl: number) => {
      if (amountMl <= 0 || amountMl > 5000) return;

      setSaving(true);
      const loggedAt = new Date().toISOString();
      const entry: HydrationLogEntry = {
        id: crypto.randomUUID(),
        amount_ml: amountMl,
        logged_at: loggedAt,
      };

      if (userId && isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("hydration_logs")
          .insert({
            user_id: userId,
            amount_ml: amountMl,
            logged_at: loggedAt,
            log_date: dateStr,
          })
          .select("id, amount_ml, logged_at")
          .single();

        if (!error && data) {
          await applyLogs([...logs, data]);
          setSaving(false);
          return;
        }
      }

      await applyLogs([...logs, entry]);
      setSaving(false);
    },
    [userId, dateStr, supabase, logs, applyLogs]
  );

  const removeWater = useCallback(
    async (id: string) => {
      setSaving(true);

      if (userId && isSupabaseConfigured()) {
        await supabase
          .from("hydration_logs")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
      }

      const nextLogs = logs.filter((log) => log.id !== id);
      await applyLogs(nextLogs);
      setSaving(false);
    },
    [userId, supabase, logs, applyLogs]
  );

  const totalMl = sumHydrationMl(logs);
  const chartData = useMemo(() => buildHourlyChartData(logs), [logs]);
  const optimized = isSystemOptimized(totalMl);

  const value = useMemo(
    () => ({
      logs,
      totalMl,
      weekTotalMl,
      chartData,
      optimized,
      loading,
      saving,
      addWater,
      removeWater,
    }),
    [
      logs,
      totalMl,
      weekTotalMl,
      chartData,
      optimized,
      loading,
      saving,
      addWater,
      removeWater,
    ]
  );

  return (
    <HydrationContext.Provider value={value}>
      {children}
    </HydrationContext.Provider>
  );
}

export function useHydration(): HydrationContextValue {
  const ctx = useContext(HydrationContext);
  if (!ctx) {
    throw new Error("useHydration must be used within HydrationProvider");
  }
  return ctx;
}
