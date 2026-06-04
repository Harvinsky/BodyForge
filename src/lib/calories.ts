import { format } from "date-fns";

import type { MealTaskKey } from "@/lib/meals";

export interface CalorieLogEntry {
  id: string;
  label: string;
  calories: number;
  logged_at: string;
  meal_key?: MealTaskKey | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
}

export interface MacroTotals {
  protein: number;
  fat: number;
  carbs: number;
}

export const MIN_PROTEIN_GOAL_G = 50;

/**
 * Protein ratio per kg based on the user's body-goal intent:
 *
 * - cutting  (goal < current)   → 1.8 g/kg  high — preserve muscle while losing fat
 * - building (goal > current)   → 1.6 g/kg  moderate — surplus already supports growth
 * - maintenance (≤2 kg diff)    → 1.4 g/kg  standard active-person recommendation
 * - no goal set                 → 1.2 g/kg  conservative healthy baseline
 */
export type ProteinGoalMode = "cutting" | "building" | "maintenance" | "none";

export const PROTEIN_RATIO: Record<ProteinGoalMode, number> = {
  cutting: 1.8,
  building: 1.6,
  maintenance: 1.4,
  none: 1.2,
};

export function resolveProteinMode(
  weightKg: number | null | undefined,
  goalWeightKg: number | null | undefined
): ProteinGoalMode {
  if (!weightKg || weightKg <= 0) return "none";
  if (!goalWeightKg) return "none";
  const diff = goalWeightKg - weightKg;
  if (diff < -2) return "cutting";
  if (diff > 2) return "building";
  return "maintenance";
}

export function calcProteinGoalG(
  weightKg: number | null | undefined,
  goalWeightKg?: number | null
): number {
  if (!weightKg || weightKg <= 0) return 120;
  const mode = resolveProteinMode(weightKg, goalWeightKg);
  return Math.max(MIN_PROTEIN_GOAL_G, Math.round(weightKg * PROTEIN_RATIO[mode]));
}

export function sumMacros(logs: CalorieLogEntry[]): MacroTotals {
  return logs.reduce(
    (acc, e) => ({
      protein: acc.protein + (e.protein_g ?? 0),
      fat: acc.fat + (e.fat_g ?? 0),
      carbs: acc.carbs + (e.carbs_g ?? 0),
    }),
    { protein: 0, fat: 0, carbs: 0 }
  );
}

export const CALORIE_QUICK_PRESETS = [
  { id: "meal-1", label: "Jedlo 1", calories: 450 },
  { id: "snack", label: "Snack", calories: 200 },
  { id: "meal-2", label: "Jedlo 2", calories: 400 },
  { id: "beer", label: "Pivo 0,5 l", calories: 210 },
] as const;

export function getTodayLogDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function sumCalories(logs: CalorieLogEntry[]): number {
  return logs.reduce((s, e) => s + e.calories, 0);
}

export interface CalorieDayStatus {
  consumed: number;
  target: number;
  remaining: number;
  deficit: number;
  inDeficit: boolean;
  overTarget: boolean;
  overBy: number;
  percentOfTarget: number;
  isFastingDay: boolean;
  fastingValid: boolean;
  statusMessage: string;
}

export function evaluateCalorieDay(
  consumed: number,
  target: number | null,
  isFastingDay = false
): CalorieDayStatus {
  if (target == null || target <= 0) {
    return {
      consumed,
      target: 0,
      remaining: 0,
      deficit: 0,
      inDeficit: false,
      overTarget: false,
      overBy: 0,
      percentOfTarget: 0,
      isFastingDay,
      fastingValid: isFastingDay ? consumed === 0 : true,
      statusMessage: "Nastav denný limit kalórií v Môj cieľ",
    };
  }

  const safeTarget = Math.max(500, target);

  if (isFastingDay) {
    const fastingValid = consumed === 0;
    return {
      consumed,
      target: safeTarget,
      remaining: safeTarget,
      deficit: fastingValid ? safeTarget : 0,
      inDeficit: fastingValid,
      overTarget: consumed > 0,
      overBy: consumed > 0 ? consumed : 0,
      percentOfTarget: consumed === 0 ? 0 : Math.min(150, Math.round((consumed / safeTarget) * 100)),
      isFastingDay: true,
      fastingValid,
      statusMessage: fastingValid
        ? "Fasting deň — iba voda, 0 kcal jedla"
        : `Fasting porušený — ${consumed} kcal jedla (odstráň zápisy)`,
    };
  }

  const remaining = safeTarget - consumed;
  const deficit = Math.max(0, remaining);
  const overBy = Math.max(0, consumed - safeTarget);
  const inDeficit = consumed < safeTarget;
  const overTarget = consumed > safeTarget;

  return {
    consumed,
    target: safeTarget,
    remaining,
    deficit,
    inDeficit,
    overTarget,
    overBy,
    percentOfTarget: Math.min(150, Math.round((consumed / safeTarget) * 100)),
    isFastingDay: false,
    fastingValid: true,
    statusMessage: inDeficit
      ? `Zostáva ${deficit} kcal do tvojho limitu ${safeTarget} kcal`
      : `Nad limitom o ${consumed - safeTarget} kcal (limit ${safeTarget} kcal)`,
  };
}
