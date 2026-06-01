import { format } from "date-fns";

export interface CalorieLogEntry {
  id: string;
  label: string;
  calories: number;
  logged_at: string;
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
  percentOfTarget: number;
  isFastingDay: boolean;
  fastingValid: boolean;
  statusMessage: string;
}

export function evaluateCalorieDay(
  consumed: number,
  target: number,
  isFastingDay = false
): CalorieDayStatus {
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
  const inDeficit = consumed < safeTarget;
  const overTarget = consumed > safeTarget;

  return {
    consumed,
    target: safeTarget,
    remaining,
    deficit,
    inDeficit,
    overTarget,
    percentOfTarget: Math.min(150, Math.round((consumed / safeTarget) * 100)),
    isFastingDay: false,
    fastingValid: true,
    statusMessage: inDeficit
      ? `Deficit ${deficit} kcal do limitu ${safeTarget} kcal`
      : `Nad limitom o ${consumed - safeTarget} kcal`,
  };
}
