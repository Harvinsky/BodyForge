import { format, parseISO } from "date-fns";

import { dateFnsLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/types";
import { normalizeEatingWindow } from "@/lib/eating-window";



export interface BodyGoalSettings {

  startWeightKg: number | null;

  goalWeightKg: number | null;

  currentWeightKg: number | null;

  goalDate: string | null;

  programStartDate: string | null;

  dailyCalorieTarget: number | null;

  eatingWindowStart: string | null;

  eatingWindowEnd: string | null;

}



/** Prázdny stav — nový používateľ nemá žiadne predvyplnené údaje. */

export const EMPTY_BODY_GOAL: BodyGoalSettings = {

  startWeightKg: null,

  goalWeightKg: null,

  currentWeightKg: null,

  goalDate: null,

  programStartDate: null,

  dailyCalorieTarget: null,

  eatingWindowStart: null,

  eatingWindowEnd: null,

};



/** @deprecated Použi EMPTY_BODY_GOAL */

export const DEFAULT_BODY_GOAL = EMPTY_BODY_GOAL;



export const DAILY_CALORIE_MIN = 800;

export const DAILY_CALORIE_MAX = 6000;



export function isBodyGoalConfigured(settings: BodyGoalSettings): boolean {
  return (
    settings.startWeightKg != null &&
    settings.goalWeightKg != null &&
    settings.programStartDate != null &&
    settings.goalDate != null
  );
}

/** Obdobie programu platí len po uložení kompletného cieľa (váha + dátumy). */
export function hasProgramPeriod(settings: BodyGoalSettings): boolean {
  return isBodyGoalConfigured(settings);
}

/** Staré SQL/app predvolené hodnoty — nie sú skutočné údaje používateľa. */
const LEGACY_SEED = {
  programStartDate: "2026-06-01",
  goalDate: "2026-07-02",
  startWeightKg: 90,
  goalWeightKg: 85,
  dailyCalorieTarget: 2000,
  eatingWindowStart: "12:00",
  eatingWindowEnd: "20:00",
} as const;

function isLegacySeedBundle(settings: BodyGoalSettings): boolean {
  return (
    settings.programStartDate === LEGACY_SEED.programStartDate &&
    settings.goalDate === LEGACY_SEED.goalDate &&
    settings.startWeightKg === LEGACY_SEED.startWeightKg &&
    settings.goalWeightKg === LEGACY_SEED.goalWeightKg
  );
}

/** Odstráni dátumy obdobia a legacy seed pri načítaní z DB / localStorage. */
export function sanitizeLoadedSettings(
  settings: BodyGoalSettings
): BodyGoalSettings {
  if (isLegacySeedBundle(settings)) {
    return { ...EMPTY_BODY_GOAL };
  }

  if (!isBodyGoalConfigured(settings)) {
    return {
      ...settings,
      programStartDate: null,
      goalDate: null,
    };
  }

  return settings;
}



export function hasCalorieTarget(settings: BodyGoalSettings): boolean {

  return settings.dailyCalorieTarget != null && settings.dailyCalorieTarget > 0;

}



export function hasEatingWindow(settings: BodyGoalSettings): boolean {

  return (

    settings.eatingWindowStart != null &&

    settings.eatingWindowEnd != null &&

    normalizeEatingWindow(

      settings.eatingWindowStart,

      settings.eatingWindowEnd

    ) != null

  );

}



export function getEffectiveWeightKg(settings: BodyGoalSettings): number | null {

  return settings.currentWeightKg ?? settings.startWeightKg ?? null;

}



export function clampDailyCalorieTarget(value: number): number | null {

  const n = Math.round(Number(value));

  if (!Number.isFinite(n) || n <= 0) return null;

  return Math.min(DAILY_CALORIE_MAX, Math.max(DAILY_CALORIE_MIN, n));

}



const LOCAL_GOAL_KEY = "bodyforge-body-goal-v2";



function localScope(userId: string | null): string {

  return userId ? `user:${userId}` : "anon";

}



function localGoalKey(userId: string | null): string {

  return `${LOCAL_GOAL_KEY}:${localScope(userId)}`;

}



function mergeStoredGoal(partial: Partial<BodyGoalSettings>): BodyGoalSettings {

  return { ...EMPTY_BODY_GOAL, ...partial };

}



export function loadLocalBodyGoal(userId: string | null): BodyGoalSettings {

  if (typeof window === "undefined") return EMPTY_BODY_GOAL;

  try {

    const raw = localStorage.getItem(localGoalKey(userId));

    if (raw) {
      return sanitizeLoadedSettings(
        mergeStoredGoal(JSON.parse(raw) as Partial<BodyGoalSettings>)
      );
    }

  } catch {

    // ignore

  }

  return EMPTY_BODY_GOAL;

}



export function saveLocalBodyGoal(

  userId: string | null,

  settings: BodyGoalSettings

): void {

  localStorage.setItem(localGoalKey(userId), JSON.stringify(settings));

}



export function formatGoalDateLabel(
  isoDate: string | null,
  locale: AppLocale = "en"
): string {
  if (!isoDate) return "—";
  try {
    return format(parseISO(isoDate), "d MMMM yyyy", {
      locale: dateFnsLocale(locale),
    });
  } catch {
    return isoDate;
  }
}

/** Kompaktný dátum pre hlavičku — napr. 1.7.2026 */
export function formatProgramDateShort(
  isoDate: string | null,
  locale: AppLocale = "en"
): string {
  if (!isoDate) return "—";
  try {
    return format(parseISO(isoDate), "d.M.yyyy", {
      locale: dateFnsLocale(locale),
    });
  } catch {
    return isoDate;
  }
}

/** Obdobie programu od začiatku po cieľový dátum */
export function formatProgramDateRange(
  settings: {
    programStartDate: string | null;
    goalDate: string | null;
  },
  locale: AppLocale = "en",
  unsetLabel = "Not set"
): string {
  if (!hasProgramPeriod(settings as BodyGoalSettings)) {
    return unsetLabel;
  }
  return `${formatProgramDateShort(settings.programStartDate, locale)} – ${formatProgramDateShort(settings.goalDate, locale)}`;
}

export function formatWeightGoalLine(
  settings: BodyGoalSettings,
  setGoalHint: string
): string {
  if (!isBodyGoalConfigured(settings)) {
    return setGoalHint;
  }
  if (settings.currentWeightKg != null) {
    return `${settings.startWeightKg} → ${settings.currentWeightKg} → ${settings.goalWeightKg} kg`;
  }
  return `${settings.startWeightKg} → ${settings.goalWeightKg} kg`;
}


export function getWeightProgressPercent(settings: BodyGoalSettings): number {

  const { startWeightKg, goalWeightKg, currentWeightKg } = settings;

  if (startWeightKg == null || goalWeightKg == null) return 0;



  const totalToLose = startWeightKg - goalWeightKg;

  if (totalToLose <= 0) return 0;



  const current = currentWeightKg ?? startWeightKg;

  const lost = startWeightKg - current;

  return Math.min(100, Math.max(0, Math.round((lost / totalToLose) * 100)));

}



export function parseDateInput(value: string): string | null {

  if (!value.trim()) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  return value;

}



export function parseWeightInput(value: string): number | null {

  const trimmed = value.trim();

  if (!trimmed) return null;

  const n = Number(trimmed.replace(",", "."));

  if (Number.isNaN(n) || n < 30 || n > 300) return null;

  return Math.round(n * 10) / 10;

}



/** Supabase TIME → HH:mm */

export function normalizeTimeFromDb(value: unknown): string | null {

  if (value == null) return null;

  const raw = String(value).trim();

  const match = raw.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2]}`;

}



function parseWeightFromDb(value: unknown): number | null {

  if (value == null) return null;

  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return null;

  return n;

}



function parseDateFromDb(value: unknown): string | null {

  if (value == null) return null;

  const s = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  return s;

}



function parseCalorieFromDb(value: unknown): number | null {

  if (value == null) return null;

  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return null;

  return clampDailyCalorieTarget(n);

}



export function settingsFromDbRow(row: Record<string, unknown>): BodyGoalSettings {
  return sanitizeLoadedSettings({
    startWeightKg: parseWeightFromDb(row.start_weight_kg),
    goalWeightKg: parseWeightFromDb(row.goal_weight_kg),
    currentWeightKg: parseWeightFromDb(row.current_weight_kg),
    goalDate: parseDateFromDb(row.goal_date),
    programStartDate: parseDateFromDb(row.program_start_date),
    dailyCalorieTarget: parseCalorieFromDb(row.daily_calorie_target),
    eatingWindowStart: normalizeTimeFromDb(row.eating_window_start),
    eatingWindowEnd: normalizeTimeFromDb(row.eating_window_end),
  });
}



export function clampEatingWindow(

  start: string,

  end: string

): Pick<BodyGoalSettings, "eatingWindowStart" | "eatingWindowEnd"> | null {

  const normalized = normalizeEatingWindow(start, end);

  if (!normalized) return null;

  return {

    eatingWindowStart: normalized.start,

    eatingWindowEnd: normalized.end,

  };

}


