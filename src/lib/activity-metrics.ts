export const STEP_KCAL_FACTOR = 0.04;
export const DEFAULT_DAILY_STEP_GOAL = 10000;

export function estimatedKcalFromSteps(steps: number): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  return Math.round(steps * STEP_KCAL_FACTOR);
}

export function paceLabelBySteps(steps: number): string {
  if (steps >= 12000) return "Top tempo";
  if (steps >= 8000) return "Dobry progres";
  if (steps >= 5000) return "Stredny den";
  return "Nizka aktivita";
}

