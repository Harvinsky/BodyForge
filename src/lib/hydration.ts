import { format } from "date-fns";
import type { DailyTasks } from "@/lib/types";

/** Denný cieľ hydratácie — 100 % gauge pri dosiahnutí */
export const HYDRATION_GOAL_ML = 3500;
/** Cieľ na 7 dní — pre týždenný gauge */
export const HYDRATION_WEEK_GOAL_ML = HYDRATION_GOAL_ML * 7;
export const HYDRATION_DEADLINE_HOUR = 18;
export const HYDRATION_DEADLINE_RATIO = 0.8;
export const HYDRATION_QUICK_AMOUNTS = [300, 500, 1000] as const;

export const HYDRATION_ACCENT = "#38bdf8";
export const HYDRATION_ACCENT_MET = "#34d399";
/** Prekročenie denného cieľa — odlíšená, stále „vodná“ farba */
export const HYDRATION_ACCENT_OVER = "#c084fc";
export const HYDRATION_ACCENT_DIM = "#0e7490";

export type HydrationGaugeState = "under" | "met" | "over";

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

/** Zlúči cloud + localStorage (remote má prednosť pri rovnakom id). */
export function mergeHydrationLogs(
  remote: HydrationLogEntry[],
  local: HydrationLogEntry[]
): HydrationLogEntry[] {
  const byId = new Map<string, HydrationLogEntry>();
  for (const entry of local) byId.set(entry.id, entry);
  for (const entry of remote) byId.set(entry.id, entry);
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  );
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

export function isHydrationOverGoal(totalMl: number): boolean {
  return totalMl > HYDRATION_GOAL_ML;
}

export function hydrationOverByMl(totalMl: number): number {
  return Math.max(0, totalMl - HYDRATION_GOAL_ML);
}

export function hydrationGaugeState(totalMl: number): HydrationGaugeState {
  if (totalMl > HYDRATION_GOAL_ML) return "over";
  if (totalMl >= HYDRATION_GOAL_ML) return "met";
  return "under";
}

export function hydrationAccentForState(state: HydrationGaugeState): string {
  switch (state) {
    case "met":
      return HYDRATION_ACCENT_MET;
    case "over":
      return HYDRATION_ACCENT_OVER;
    default:
      return HYDRATION_ACCENT;
  }
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
    hydration_3l: totalMl >= HYDRATION_GOAL_ML,
  };
}

export type HydrationMilestoneKey =
  | "hydration_1l"
  | "hydration_2l"
  | "hydration_3l";

export const HYDRATION_MILESTONE_ML: Record<HydrationMilestoneKey, number> = {
  hydration_1l: 1000,
  hydration_2l: 2000,
  hydration_3l: HYDRATION_GOAL_ML,
};

/** Manuálne odkliknuté míľniky neprepísať späť na false pri sync z palivomera. */
export function mergeHydrationTaskFlags(
  prev: Pick<DailyTasks, HydrationMilestoneKey>,
  totalMl: number
): Pick<DailyTasks, HydrationMilestoneKey> {
  const auto = hydrationFlagsFromMl(totalMl);
  return {
    hydration_1l: prev.hydration_1l || auto.hydration_1l,
    hydration_2l: prev.hydration_2l || auto.hydration_2l,
    hydration_3l: prev.hydration_3l || auto.hydration_3l,
  };
}

export function isHydrationMilestoneDone(
  key: HydrationMilestoneKey,
  tasks: Pick<DailyTasks, HydrationMilestoneKey>,
  totalMl: number
): boolean {
  return tasks[key] || totalMl >= HYDRATION_MILESTONE_ML[key];
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
  const trimmed = raw.trim().toLowerCase().replace(",", ".");
  if (!trimmed) return null;

  const mlMatch = trimmed.match(/^([\d.]+)\s*ml$/);
  if (mlMatch) {
    const n = Number(mlMatch[1]);
    return Number.isNaN(n) || n <= 0 ? null : Math.round(n);
  }

  const lMatch = trimmed.match(/^([\d.]+)\s*l$/);
  if (lMatch) {
    const n = Number(lMatch[1]);
    return Number.isNaN(n) || n <= 0 ? null : Math.round(n * 1000);
  }

  const asNumber = Number(trimmed.replace(/[^\d.]/g, "") || trimmed);
  if (Number.isNaN(asNumber) || asNumber <= 0) return null;

  if (trimmed.includes(".") || asNumber <= 10) {
    return Math.round(asNumber * 1000);
  }
  return Math.round(asNumber);
}
