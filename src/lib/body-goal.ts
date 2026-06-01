import { format, parseISO } from "date-fns";
import { sk } from "date-fns/locale";

export interface BodyGoalSettings {
  startWeightKg: number;
  goalWeightKg: number;
  currentWeightKg: number | null;
  goalDate: string;
  programStartDate: string;
  dailyCalorieTarget: number;
}

export const DEFAULT_BODY_GOAL: BodyGoalSettings = {
  startWeightKg: 90,
  goalWeightKg: 85,
  currentWeightKg: null,
  goalDate: "2026-07-02",
  programStartDate: "2026-06-01",
  dailyCalorieTarget: 2000,
};

const LOCAL_GOAL_KEY = "bodyforge-body-goal";

export function loadLocalBodyGoal(): BodyGoalSettings {
  if (typeof window === "undefined") return DEFAULT_BODY_GOAL;
  try {
    const raw = localStorage.getItem(LOCAL_GOAL_KEY);
    if (raw) return { ...DEFAULT_BODY_GOAL, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_BODY_GOAL;
}

export function saveLocalBodyGoal(settings: BodyGoalSettings): void {
  localStorage.setItem(LOCAL_GOAL_KEY, JSON.stringify(settings));
}

export function formatGoalDateLabel(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "d. MMMM yyyy", { locale: sk });
  } catch {
    return isoDate;
  }
}

export function getWeightProgressPercent(settings: BodyGoalSettings): number {
  const { startWeightKg, goalWeightKg, currentWeightKg } = settings;
  const totalToLose = startWeightKg - goalWeightKg;
  if (totalToLose <= 0) return 0;

  const current = currentWeightKg ?? startWeightKg;
  const lost = startWeightKg - current;
  return Math.min(100, Math.max(0, Math.round((lost / totalToLose) * 100)));
}

export function parseDateInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export function parseWeightInput(value: string): number | null {
  const n = Number(value.replace(",", "."));
  if (Number.isNaN(n) || n < 30 || n > 300) return null;
  return Math.round(n * 10) / 10;
}
