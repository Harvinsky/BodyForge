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
  burnedPercentOfTarget,
  computeDailyBurn,
  trainingDaySummaryFromSessions,
  type DailyBurnSummary,
  type TrainingSession,
} from "@/lib/activity-burn";
import {
  loadLocalActivityMetrics,
  loadLocalTrainingSessions,
} from "@/lib/activity-storage";
import { useAppUser } from "@/hooks/use-app-user";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { getEffectiveWeightKg } from "@/lib/body-goal";

interface ActivitySummaryValue {
  today: DailyBurnSummary;
  weekBurned: number;
  burnedTodayPercent: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_DAY: DailyBurnSummary = {
  steps: 0,
  trainingMinutes: 0,
  trainingSessions: 0,
  estimatedBurned: 0,
  manualBurned: 0,
  totalBurned: 0,
};

const ActivitySummaryContext = createContext<ActivitySummaryValue | null>(null);

async function loadDayBurn(
  userId: string | null,
  logDate: string,
  weightKg: number,
  supabase: ReturnType<typeof createClient>
): Promise<DailyBurnSummary> {
  let metrics = loadLocalActivityMetrics(userId, logDate);
  let sessions: TrainingSession[] = loadLocalTrainingSessions(userId, logDate);

  if (userId && isSupabaseConfigured()) {
    const [{ data: activity }, { data: training }] = await Promise.all([
      withTimeout(
        supabase
          .from("daily_activity_metrics")
          .select(
            "steps, calories_burned_manual, calories_burned_estimated"
          )
          .eq("user_id", userId)
          .eq("log_date", logDate)
          .maybeSingle(),
        5_000
      ).catch(() => ({ data: null })),
      withTimeout(
        supabase
          .from("training_logs")
          .select("activity, duration_minutes")
          .eq("user_id", userId)
          .eq("log_date", logDate),
        5_000
      ).catch(() => ({ data: null })),
    ]);

    if (activity) {
      metrics = {
        steps: Number(activity.steps ?? 0),
        calories_burned_manual: Number(activity.calories_burned_manual ?? 0),
        calories_burned_estimated: Number(
          activity.calories_burned_estimated ?? 0
        ),
        notes: "",
      };
    }

    if (training?.length) {
      sessions = training.map((row) => ({
        activity: String(row.activity ?? "Vlastný šport"),
        durationMinutes: Number(row.duration_minutes ?? 0),
      }));
    }
  }

  return computeDailyBurn(
    metrics,
    trainingDaySummaryFromSessions(sessions),
    weightKg
  );
}

export function ActivitySummaryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, authReady } = useAppUser();
  const { settings } = useBodyGoal();
  const supabase = useMemo(() => createClient(), []);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const weightKg = getEffectiveWeightKg(settings) ?? 0;

  const [today, setToday] = useState<DailyBurnSummary>(EMPTY_DAY);
  const [weekBurned, setWeekBurned] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authReady) return;

    setLoading(true);
    const todayBurn = await loadDayBurn(
      userId,
      todayStr,
      weightKg,
      supabase
    );
    setToday(todayBurn);

    const dates = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), i), "yyyy-MM-dd")
    );
    let weekTotal = 0;
    for (const date of dates) {
      const day = await loadDayBurn(userId, date, weightKg, supabase);
      weekTotal += day.totalBurned;
    }
    setWeekBurned(weekTotal);
    setLoading(false);
  }, [authReady, userId, todayStr, weightKg, supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key?.includes("bodyforge-activity-metrics") ||
        event.key?.includes("bodyforge-training-log")
      ) {
        void refresh();
      }
    };
    window.addEventListener("bodyforge-activity-updated", onUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bodyforge-activity-updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const burnedTodayPercent = burnedPercentOfTarget(
    today.totalBurned,
    settings.dailyCalorieTarget ?? 0
  );

  const value = useMemo(
    () => ({
      today,
      weekBurned,
      burnedTodayPercent,
      loading,
      refresh,
    }),
    [today, weekBurned, burnedTodayPercent, loading, refresh]
  );

  return (
    <ActivitySummaryContext.Provider value={value}>
      {children}
    </ActivitySummaryContext.Provider>
  );
}

export function useActivitySummary(): ActivitySummaryValue {
  const ctx = useContext(ActivitySummaryContext);
  if (!ctx) {
    throw new Error(
      "useActivitySummary must be used within ActivitySummaryProvider"
    );
  }
  return ctx;
}
