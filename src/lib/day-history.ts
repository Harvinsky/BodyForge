import {
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
} from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeDailyBurn,
  trainingDaySummaryFromSessions,
  type TrainingSession,
} from "@/lib/activity-burn";
import type { CalorieLogEntry } from "@/lib/calories";
import { groupLogsByMeal } from "@/lib/meal-calorie-link";
import { evaluateCalorieDay } from "@/lib/calories";
import { mlToLiters } from "@/lib/hydration";
import { isHabitDone } from "@/lib/habits";
import { rowToDailyTasks } from "@/lib/meals";
import {
  calculateCompletion,
  emptyDailyTasks,
  type DailyTasks,
} from "@/lib/types";
import { withTimeout } from "@/lib/fetch-timeout";
import { formatHistoryDayLabel } from "@/lib/program-periods";

export interface DayHistoryRecord {
  date: string;
  dateLabel: string;
  isToday: boolean;
  tasks: DailyTasks;
  completion: number;
  totalCalories: number;
  calorieTarget: number;
  calorieStatus: ReturnType<typeof evaluateCalorieDay>;
  mealsSummary: string;
  waterMl: number;
  waterLabel: string;
  trainingSummary: string;
  trainingMinutes: number;
  steps: number;
  burnedKcal: number;
  hasAnyData: boolean;
  calorieLogs: CalorieLogEntry[];
  mealGroups: ReturnType<typeof groupLogsByMeal>;
  hydrationEntries: { amount_ml: number; logged_at: string }[];
  trainingSessions: { activity: string; duration_minutes: number }[];
}

interface RawDayBundle {
  tasks: DailyTasks;
  calories: CalorieLogEntry[];
  hydration: { amount_ml: number; logged_at: string }[];
  training: { activity: string; duration_minutes: number }[];
  steps: number;
  manualBurned: number;
  estimatedBurned: number;
}

function enumerateDates(startDate: string, endDate: string): string[] {
  return datesInRange(startDate, endDate);
}

export function datesInRange(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end || end < start) return [];
  return eachDayOfInterval({ start, end }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
}

function parseIsoDate(dateStr: string): Date | null {
  const d = parseISO(dateStr);
  return isValid(d) ? d : null;
}

function buildMealsSummary(logs: CalorieLogEntry[]): string {
  if (logs.length === 0) return "—";
  const groups = groupLogsByMeal(logs);
  return groups
    .map((g) => {
      const items = g.items.map((i) => i.label).join(", ");
      return `${g.label}: ${items}`;
    })
    .join(" · ");
}

function buildTrainingSummary(
  sessions: { activity: string; duration_minutes: number }[]
): string {
  if (sessions.length === 0) return "Bez tréningu";
  return sessions
    .map((s) => `${s.activity} ${s.duration_minutes} min`)
    .join(", ");
}

function bundleHasData(bundle: RawDayBundle): boolean {
  return (
    bundle.calories.length > 0 ||
    bundle.hydration.length > 0 ||
    bundle.training.length > 0 ||
    bundle.steps > 0 ||
    bundle.manualBurned > 0 ||
    bundle.estimatedBurned > 0 ||
    isHabitDone(bundle.tasks, "fasting") ||
    isHabitDone(bundle.tasks, "water") ||
    isHabitDone(bundle.tasks, "training") ||
    bundle.tasks.is_fasting_day
  );
}

function assembleDayRecord(
  dateStr: string,
  bundle: RawDayBundle,
  calorieTarget: number | null,
  weightKg: number,
  today: string
): DayHistoryRecord {
  const target =
    calorieTarget != null && calorieTarget > 0 ? calorieTarget : 0;
  const totalCalories = bundle.calories.reduce((s, l) => s + l.calories, 0);
  const waterMl = bundle.hydration.reduce((s, h) => s + h.amount_ml, 0);
  const trainingMinutes = bundle.training.reduce(
    (s, t) => s + t.duration_minutes,
    0
  );
  const sessions: TrainingSession[] = bundle.training.map((t) => ({
    activity: t.activity,
    durationMinutes: t.duration_minutes,
  }));
  const burn = computeDailyBurn(
    {
      steps: bundle.steps,
      calories_burned_manual: bundle.manualBurned,
      calories_burned_estimated: bundle.estimatedBurned,
    },
    trainingDaySummaryFromSessions(sessions),
    weightKg
  );

  return {
    date: dateStr,
    dateLabel: formatHistoryDayLabel(dateStr),
    isToday: dateStr === today,
    tasks: bundle.tasks,
    completion: calculateCompletion(bundle.tasks),
    totalCalories,
    calorieTarget: target,
    calorieStatus: evaluateCalorieDay(
      totalCalories,
      target > 0 ? target : null,
      bundle.tasks.is_fasting_day
    ),
    mealsSummary: buildMealsSummary(bundle.calories),
    waterMl,
    waterLabel: waterMl > 0 ? `${mlToLiters(waterMl, 1)} L` : "—",
    trainingSummary: buildTrainingSummary(bundle.training),
    trainingMinutes,
    steps: bundle.steps,
    burnedKcal: burn.totalBurned,
    hasAnyData: bundleHasData(bundle),
    calorieLogs: bundle.calories,
    mealGroups: groupLogsByMeal(bundle.calories),
    hydrationEntries: bundle.hydration,
    trainingSessions: bundle.training,
  };
}

export async function fetchDayHistory(
  supabase: SupabaseClient,
  userId: string | null,
  startDate: string,
  endDate: string,
  calorieTarget: number | null,
  weightKg: number,
  today: string
): Promise<DayHistoryRecord[]> {
  const dates = enumerateDates(startDate, endDate);
  if (dates.length === 0) return [];

  const bundles = new Map<string, RawDayBundle>();
  for (const dateStr of dates) {
    bundles.set(dateStr, {
      tasks: emptyDailyTasks(),
      calories: [],
      hydration: [],
      training: [],
      steps: 0,
      manualBurned: 0,
      estimatedBurned: 0,
    });
  }

  if (userId) {
    const timeout = 12_000;
    const [dailyRes, calorieRes, hydrationRes, trainingRes, activityRes] =
      await Promise.all([
        withTimeout(
          supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", userId)
            .gte("log_date", startDate)
            .lte("log_date", endDate),
          timeout
        ).catch(() => ({ data: null })),
        withTimeout(
          supabase
            .from("calorie_logs")
            .select("id, label, calories, logged_at, meal_key, log_date")
            .eq("user_id", userId)
            .gte("log_date", startDate)
            .lte("log_date", endDate)
            .order("logged_at", { ascending: true }),
          timeout
        ).catch(() => ({ data: null })),
        withTimeout(
          supabase
            .from("hydration_logs")
            .select("amount_ml, logged_at, log_date")
            .eq("user_id", userId)
            .gte("log_date", startDate)
            .lte("log_date", endDate)
            .order("logged_at", { ascending: true }),
          timeout
        ).catch(() => ({ data: null })),
        withTimeout(
          supabase
            .from("training_logs")
            .select("activity, duration_minutes, log_date")
            .eq("user_id", userId)
            .gte("log_date", startDate)
            .lte("log_date", endDate)
            .order("logged_at", { ascending: true }),
          timeout
        ).catch(() => ({ data: null })),
        withTimeout(
          supabase
            .from("daily_activity_metrics")
            .select(
              "log_date, steps, calories_burned_manual, calories_burned_estimated"
            )
            .eq("user_id", userId)
            .gte("log_date", startDate)
            .lte("log_date", endDate),
          timeout
        ).catch(() => ({ data: null })),
      ]);

    for (const row of dailyRes.data ?? []) {
      const key = String(row.log_date);
      const b = bundles.get(key);
      if (b) b.tasks = rowToDailyTasks(row);
    }

    for (const row of calorieRes.data ?? []) {
      const key = String(row.log_date);
      const b = bundles.get(key);
      if (!b) continue;
      b.calories.push({
        id: String(row.id),
        label: String(row.label),
        calories: Number(row.calories),
        logged_at: String(row.logged_at),
        meal_key: row.meal_key as CalorieLogEntry["meal_key"],
      });
    }

    for (const row of hydrationRes.data ?? []) {
      const key = String(row.log_date);
      const b = bundles.get(key);
      if (!b) continue;
      b.hydration.push({
        amount_ml: Number(row.amount_ml),
        logged_at: String(row.logged_at),
      });
    }

    for (const row of trainingRes.data ?? []) {
      const key = String(row.log_date);
      const b = bundles.get(key);
      if (!b) continue;
      b.training.push({
        activity: String(row.activity),
        duration_minutes: Number(row.duration_minutes),
      });
    }

    for (const row of activityRes.data ?? []) {
      const key = String(row.log_date);
      const b = bundles.get(key);
      if (!b) continue;
      b.steps = Number(row.steps ?? 0);
      b.manualBurned = Number(row.calories_burned_manual ?? 0);
      b.estimatedBurned = Number(row.calories_burned_estimated ?? 0);
    }
  }

  mergeLocalFallback(userId, dates, bundles);

  return dates
    .slice()
    .reverse()
    .map((dateStr) => {
      const bundle = bundles.get(dateStr)!;
      const target = calorieTarget != null && calorieTarget > 0 ? calorieTarget : 0;
      return assembleDayRecord(
        dateStr,
        bundle,
        target,
        weightKg,
        today
      );
    });
}

function mergeLocalFallback(
  userId: string | null,
  dates: string[],
  bundles: Map<string, RawDayBundle>
): void {
  if (typeof window === "undefined") return;

  for (const dateStr of dates) {
    const b = bundles.get(dateStr);
    if (!b) continue;

    if (b.calories.length === 0) {
      try {
        const raw = localStorage.getItem(
          `bodyforge-calorie-log-${userId ? `user:${userId}` : "anon"}:${dateStr}`
        );
        if (raw) b.calories = JSON.parse(raw) as CalorieLogEntry[];
      } catch {
        // ignore
      }
    }

    if (b.hydration.length === 0) {
      try {
        const raw = localStorage.getItem(
          `t800-hydration-log-${userId ? `user:${userId}` : "anon"}:${dateStr}`
        );
        if (raw) b.hydration = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    if (b.training.length === 0) {
      try {
        const raw = localStorage.getItem(
          `bodyforge-training-log-${userId ? `user:${userId}` : "anon"}:${dateStr}`
        );
        if (raw) {
          const entries = JSON.parse(raw) as {
            activity: string;
            duration_minutes: number;
          }[];
          b.training = entries.map((e) => ({
            activity: e.activity,
            duration_minutes: e.duration_minutes,
          }));
        }
      } catch {
        // ignore
      }
    }

    const noDailyFlags =
      !b.tasks.fasting_window &&
      !b.tasks.is_fasting_day &&
      !b.tasks.hydration_3l &&
      !b.tasks.training_done;
    if (noDailyFlags) {
      try {
        const raw = localStorage.getItem(
          `t800-daily-log-${userId ? `user:${userId}` : "anon"}:${dateStr}`
        );
        if (raw) {
          const local = JSON.parse(raw) as DailyTasks;
          b.tasks = { ...emptyDailyTasks(), ...local };
        }
      } catch {
        // ignore
      }
    }
  }
}

export function countDaysWithData(days: DayHistoryRecord[]): number {
  return days.filter((d) => d.hasAnyData).length;
}

export function historyRangeDayCount(
  startDate: string,
  endDate: string
): number {
  return datesInRange(startDate, endDate).length;
}
