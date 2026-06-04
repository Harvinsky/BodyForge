import {

  formatGoalDateLabel,

  isBodyGoalConfigured,

  type BodyGoalSettings,

} from "@/lib/body-goal";



function parseDate(iso: string): Date | null {

  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

  const [y, m, d] = iso.split("-").map(Number);

  return new Date(y, m - 1, d);

}



export function getGoalProgressPercent(

  settings: BodyGoalSettings,

  now = new Date()

): number {

  if (!isBodyGoalConfigured(settings)) return 0;



  const start = parseDate(settings.programStartDate!);

  const end = parseDate(settings.goalDate!);

  if (!start || !end) return 0;



  const startMs = start.getTime();

  const endMs = end.getTime();

  const current = now.getTime();



  if (endMs <= startMs) return 0;

  if (current <= startMs) return 0;

  if (current >= endMs) return 100;



  return Math.round(((current - startMs) / (endMs - startMs)) * 100);

}



export function getDaysUntilGoal(

  settings: BodyGoalSettings,

  now = new Date()

): number | null {

  if (!settings.goalDate) return null;



  const end = parseDate(settings.goalDate);

  if (!end) return null;



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



  if (!isBodyGoalConfigured(settings)) {

    return {

      timePercent: 0,

      actualPercent: actual,

      pacePercent: actual,

      status: "pre_start",

      statusLabel: "Bez programu",

      sublabel: "Nastav cieľ v Môj cieľ",

    };

  }



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
  const daysLabel = daysLeft != null ? `${daysLeft} dní` : "—";

  if (delta >= 8) {
    return {
      timePercent,
      actualPercent: actual,
      pacePercent: 100,
      status: "ahead",
      statusLabel: "Vpredu",
      sublabel: `+${delta} pp · ${daysLabel}`,
    };
  }

  if (delta >= -8) {
    return {
      timePercent,
      actualPercent: actual,
      pacePercent,
      status: "on_track",
      statusLabel: "V tempe",
      sublabel: `Čas ${timePercent}% · ${daysLabel}`,
    };
  }

  return {
    timePercent,
    actualPercent: actual,
    pacePercent,
    status: "behind",
    statusLabel: "Za tempom",
    sublabel: `Cieľ ~${timePercent}% · ${daysLabel}`,
  };
}
