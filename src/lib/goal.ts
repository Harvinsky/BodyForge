import { formatGoalDateLabel, type BodyGoalSettings } from "@/lib/body-goal";

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getGoalProgressPercent(
  settings: BodyGoalSettings,
  now = new Date()
): number {
  const start = parseDate(settings.programStartDate).getTime();
  const end = parseDate(settings.goalDate).getTime();
  const current = now.getTime();

  if (current <= start) return 0;
  if (current >= end) return 100;

  return Math.round(((current - start) / (end - start)) * 100);
}

export function getDaysUntilGoal(
  settings: BodyGoalSettings,
  now = new Date()
): number {
  const end = parseDate(settings.goalDate);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getGoalDateLabel(settings: BodyGoalSettings): string {
  return formatGoalDateLabel(settings.goalDate);
}

export type PlanPaceStatus = "ahead" | "on_track" | "behind" | "pre_start" | "ended";

export interface PlanPace {
  timePercent: number;
  actualPercent: number;
  pacePercent: number;
  status: PlanPaceStatus;
  statusLabel: string;
  sublabel: string;
}

export function getPlanPace(
  settings: BodyGoalSettings,
  actualPercent: number,
  now = new Date()
): PlanPace {
  const timePercent = getGoalProgressPercent(settings, now);
  const daysLeft = getDaysUntilGoal(settings, now);
  const goalLabel = getGoalDateLabel(settings);
  const actual = Math.min(100, Math.max(0, Math.round(actualPercent)));

  if (timePercent <= 0) {
    return {
      timePercent: 0,
      actualPercent: actual,
      pacePercent: actual,
      status: "pre_start",
      statusLabel: actual > 0 ? "Štart" : "Pripravený",
      sublabel: `Cieľ ${goalLabel}`,
    };
  }

  if (timePercent >= 100) {
    return {
      timePercent: 100,
      actualPercent: actual,
      pacePercent: actual,
      status: actual >= 80 ? "ended" : "behind",
      statusLabel: actual >= 80 ? "Splnené" : "Doplň",
      sublabel: `Finálne skóre ${actual}%`,
    };
  }

  const ratio = actual / timePercent;
  const pacePercent = Math.min(100, Math.round(ratio * 100));
  const delta = actual - timePercent;

  if (delta >= 8) {
    return {
      timePercent,
      actualPercent: actual,
      pacePercent: 100,
      status: "ahead",
      statusLabel: "Vpredu",
      sublabel: `+${delta} pp · ${daysLeft} dní`,
    };
  }

  if (delta >= -8) {
    return {
      timePercent,
      actualPercent: actual,
      pacePercent,
      status: "on_track",
      statusLabel: "V tempe",
      sublabel: `Čas ${timePercent}% · ${daysLeft} dní`,
    };
  }

  return {
    timePercent,
    actualPercent: actual,
    pacePercent,
    status: "behind",
    statusLabel: "Za tempom",
    sublabel: `Cieľ ~${timePercent}% · ${daysLeft} dní`,
  };
}
