"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { format, subDays } from "date-fns";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/fetch-timeout";
import {
  DAY_HISTORY_CHANGED,
  dayHistoryChangedIncludesToday,
} from "@/lib/day-history-events";
import {
  buildHourlyChartData,
  getTodayLogDate,
  mergeHydrationLogs,
  type HydrationLogEntry,
  isSystemOptimized,
  sumHydrationMl,
} from "@/lib/hydration";
import { useAppUser } from "@/hooks/use-app-user";
import { useDailyTracker } from "@/hooks/use-daily-tracker";

const LOCAL_HYDRATION_PREFIX = "t800-hydration-log-";
const HYDRATION_FETCH_MS = 6_000;
const HYDRATION_INSERT_MS = 8_000;

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

function localKey(userId: string | null, date: string): string {
  return `${LOCAL_HYDRATION_PREFIX}${localScope(userId)}:${date}`;
}

function loadLocalLogs(
  userId: string | null,
  date: string
): HydrationLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKey(userId, date));
    if (raw) return JSON.parse(raw) as HydrationLogEntry[];
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLogs(
  userId: string | null,
  date: string,
  logs: HydrationLogEntry[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(localKey(userId, date), JSON.stringify(logs));
  } catch {
    // private mode / quota
  }
}

interface HydrationContextValue {
  logs: HydrationLogEntry[];
  totalMl: number;
  weekTotalMl: number;
  chartData: ReturnType<typeof buildHourlyChartData>;
  optimized: boolean;
  loading: boolean;
  saving: boolean;
  lastError: string | null;
  addWater: (amountMl: number) => Promise<boolean>;
  removeWater: (id: string) => Promise<void>;
}

const HydrationContext = createContext<HydrationContextValue | null>(null);

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const { authReady } = useAppUser();
  const { userId, logDate, syncHydrationLevels, applyHydrationFlagsLocal } =
    useDailyTracker();
  const [logs, setLogs] = useState<HydrationLogEntry[]>([]);
  const logsRef = useRef<HydrationLogEntry[]>([]);
  // Generácia načítania — každý increment zneplatní predošlé loadLogs volanie
  const loadGenRef = useRef(0);
  const [weekTotalMl, setWeekTotalMl] = useState(0);
  const [loading, setLoading] = useState(false);
  // Counter namiesto boolean — paralelné operácie ho inkrementujú/dekrementujú
  // Tým sa saving vynuluje správne aj pri súbežných add/remove volaniach
  const [savingCount, setSavingCount] = useState(0);
  const saving = savingCount > 0;
  const [lastError, setLastError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Živý dátum — ak sa zmení (po polnoci), loadLogs sa automaticky zresetuje
  const dateStr = logDate || getTodayLogDate();

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const loadWeekTotal = useCallback(async () => {
    const weekStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

    if (userId && isSupabaseConfigured()) {
      const { data, error } = await withTimeout(
        supabase
          .from("hydration_logs")
          .select("amount_ml")
          .eq("user_id", userId)
          .gte("log_date", weekStart),
        HYDRATION_FETCH_MS
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        setWeekTotalMl(data.reduce((s, r) => s + r.amount_ml, 0));
        return;
      }
    }

    let total = 0;
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      total += sumHydrationMl(loadLocalLogs(userId, d));
    }
    setWeekTotalMl(total);
  }, [userId, supabase]);

  const loadLogs = useCallback(async () => {
    if (!authReady) return;

    // Generácia — ak sa spustí nové loadLogs, táto verzia výsledok zahodi
    loadGenRef.current += 1;
    const thisGen = loadGenRef.current;

    setLoading(true);
    try {
      let remote: HydrationLogEntry[] = [];

      if (userId && isSupabaseConfigured()) {
        const { data, error } = await withTimeout(
          supabase
            .from("hydration_logs")
            .select("id, amount_ml, logged_at")
            .eq("user_id", userId)
            .eq("log_date", dateStr)
            .order("logged_at", { ascending: true }),
          HYDRATION_FETCH_MS
        ).catch(() => ({ data: null, error: { message: "timeout" } }));

        if (!error && data) remote = data;
      }

      // Zahoď výsledok, ak medzičasom prišiel novší loadLogs
      if (thisGen !== loadGenRef.current) return;

      const local = loadLocalLogs(userId, dateStr);
      // Merge: lokálne záznamy zachová, remote má prednosť pri rovnakom id
      const resolved = mergeHydrationLogs(remote, local);
      logsRef.current = resolved;
      setLogs(resolved);
      saveLocalLogs(userId, dateStr, resolved);
      applyHydrationFlagsLocal(sumHydrationMl(resolved));
      await loadWeekTotal();
    } finally {
      if (thisGen === loadGenRef.current) {
        setLoading(false);
      }
    }
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

  const syncLevelsSafe = useCallback(
    async (totalMl: number) => {
      try {
        await syncHydrationLevels(totalMl);
      } catch {
        // neblokuj UI — hydration flags sa uložia pri ďalšom upsert
      }
    },
    [syncHydrationLevels]
  );

  const applyLogsUpdate = useCallback(
    (compute: (prev: HydrationLogEntry[]) => HydrationLogEntry[]) => {
      const prevTotal = sumHydrationMl(logsRef.current);
      const nextLogs = compute(logsRef.current);
      const nextTotal = sumHydrationMl(nextLogs);
      const delta = nextTotal - prevTotal;
      logsRef.current = nextLogs;
      setLogs(nextLogs);
      saveLocalLogs(userId, dateStr, nextLogs);
      applyHydrationFlagsLocal(nextTotal);
      void syncLevelsSafe(nextTotal);
      setWeekTotalMl((prev) => prev + delta);
      return nextLogs;
    },
    [dateStr, syncLevelsSafe, applyHydrationFlagsLocal, userId]
  );

  const addWater = useCallback(
    async (amountMl: number): Promise<boolean> => {
      setLastError(null);

      if (amountMl <= 0 || amountMl > 5000) {
        setLastError("hydration.invalidRange");
        return false;
      }

      setSavingCount((c) => c + 1);
      try {
        const loggedAt = new Date().toISOString();
        // crypto.randomUUID() requires a secure context (HTTPS/localhost).
        // Fall back to a Math.random-based v4 UUID for HTTP LAN access.
        const clientId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                /[xy]/g,
                (c) => {
                  const r = (Math.random() * 16) | 0;
                  return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
                }
              );
        const newEntry: HydrationLogEntry = {
          id: clientId,
          amount_ml: amountMl,
          logged_at: loggedAt,
        };

        // Optimistický update PRED čakaním na server
        applyLogsUpdate((prev) => [...prev, newEntry]);

        if (userId && isSupabaseConfigured()) {
          const { error } = await withTimeout(
            supabase
              .from("hydration_logs")
              .upsert(
                {
                  id: clientId,
                  user_id: userId,
                  amount_ml: amountMl,
                  logged_at: loggedAt,
                  log_date: dateStr,
                },
                { onConflict: "id", ignoreDuplicates: true }
              ),
            HYDRATION_INSERT_MS
          ).catch(() => ({ error: { message: "timeout" } }));

          if (error && error.message !== "timeout") {
            setLastError("hydration.addFailed");
          }
        }

        return true;
      } catch {
        setLastError("hydration.addFailed");
        return false;
      } finally {
        setSavingCount((c) => c - 1);
      }
    },
    [userId, dateStr, supabase, applyLogsUpdate]
  );

  const removeWater = useCallback(
    async (id: string) => {
      setSavingCount((c) => c + 1);
      setLastError(null);

      // Snapshot pred optimistickým odstránením — potrebné na rollback
      const snapshot = logsRef.current;
      applyLogsUpdate((prev) => prev.filter((log) => log.id !== id));

      try {
        if (userId && isSupabaseConfigured()) {
          const { error } = await withTimeout(
            supabase
              .from("hydration_logs")
              .delete()
              .eq("id", id)
              .eq("user_id", userId),
            HYDRATION_INSERT_MS
          ).catch(() => ({ error: { message: "timeout" } }));

          if (error && error.message !== "timeout") {
            // Server delete failed — rollback optimistic removal
            logsRef.current = snapshot;
            setLogs(snapshot);
            saveLocalLogs(userId, dateStr, snapshot);
            applyHydrationFlagsLocal(sumHydrationMl(snapshot));
            setLastError("hydration.removeFailed");
          } else {
            // Refresh weekly total after successful delete
            void loadWeekTotal();
          }
        }
      } finally {
        setSavingCount((c) => c - 1);
      }
    },
    [userId, dateStr, supabase, applyLogsUpdate, applyHydrationFlagsLocal, loadWeekTotal]
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
      lastError,
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
      lastError,
      addWater,
      removeWater,
    ]
  );

  return (
    <HydrationContext.Provider value={value}>{children}</HydrationContext.Provider>
  );
}

export function useHydration(): HydrationContextValue {
  const ctx = useContext(HydrationContext);
  if (!ctx) {
    throw new Error("useHydration must be used within HydrationProvider");
  }
  return ctx;
}
