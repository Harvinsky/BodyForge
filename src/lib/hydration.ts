import { format } from "date-fns";
import type { DailyTasks } from "@/lib/types";

export const HYDRATION_GOAL_ML = 4000;
/** Cieľ na 7 dní pri 4 L/deň — pre týždenný gauge */
export const HYDRATION_WEEK_GOAL_ML = HYDRATION_GOAL_ML * 7;
export const HYDRATION_DEADLINE_HOUR = 18;
export const HYDRATION_DEADLINE_RATIO = 0.8;
export const HYDRATION_QUICK_AMOUNTS = [300, 500, 1000] as const;

export const HYDRATION_ACCENT = "#38bdf8";
export const HYDRATION_ACCENT_DIM = "#0e7490";

export interface HydrationLogEntry {
  id: string;
  amount_ml: number;
  logged_at: string;
}

export function getTodayLogDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function sumHydrationMl(logs: HydrationLogEntry[]): number {
  return logs.reduce((sum, e) => sum + e.amount_ml, 0);
}

export function mlToLiters(ml: number, digits = 2): string {
  return (ml / 1000).toFixed(digits);
}

export function hydrationProgressPercent(totalMl: number): number {
  return Math.min(100, Math.round((totalMl / HYDRATION_GOAL_ML) * 100));
}

export function isSystemOptimized(totalMl: number): boolean {
  return totalMl >= HYDRATION_GOAL_ML;
}

export function remainingMl(totalMl: number): number {
  return Math.max(0, HYDRATION_GOAL_ML - totalMl);
}

export function hydrationFlagsFromMl(totalMl: number): Pick<
  DailyTasks,
  "hydration_1l" | "hydration_2l" | "hydration_3l"
> {
  return {
    hydration_1l: totalMl >= 1000,
    hydration_2l: totalMl >= 2000,
    hydration_3l: totalMl >= 3000,
  };
}

export function isBeforeHydrationDeadline(now = new Date()): boolean {
  return now.getHours() < HYDRATION_DEADLINE_HOUR;
}

export function needsDeadlinePush(totalMl: number, now = new Date()): boolean {
  if (!isBeforeHydrationDeadline(now)) return false;
  const targetByDeadline = HYDRATION_GOAL_ML * HYDRATION_DEADLINE_RATIO;
  return totalMl < targetByDeadline;
}

export interface HourlyChartPoint {
  hour: string;
  ml: number;
  cumulative: number;
}

export function buildHourlyChartData(
  logs: HydrationLogEntry[]
): HourlyChartPoint[] {
  const buckets = new Map<number, number>();

  for (const log of logs) {
    const hour = new Date(log.logged_at).getHours();
    buckets.set(hour, (buckets.get(hour) ?? 0) + log.amount_ml);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  let cumulative = 0;

  return hours.map((h) => {
    const ml = buckets.get(h) ?? 0;
    cumulative += ml;
    return {
      hour: `${h.toString().padStart(2, "0")}:00`,
      ml,
      cumulative,
    };
  });
}

export function parseManualMlInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isNaN(asNumber) || asNumber <= 0) return null;

  if (trimmed.includes(".") || asNumber <= 10) {
    return Math.round(asNumber * 1000);
  }
  return Math.round(asNumber);
}
