import { format, parseISO, subDays } from "date-fns";

import { formatProgramDateShort } from "@/lib/body-goal";
import { dateFnsLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/types";

export const CURRENT_PROGRAM_ID = "__current__";
export const CUSTOM_RANGE_ID = "__custom__";

export interface ProgramPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  dailyCalorieTarget?: number | null;
  startWeightKg?: number | null;
  goalWeightKg?: number | null;
  createdAt?: string;
  isVirtual?: boolean;
}

const LOCAL_PERIODS_KEY = "bodyforge-program-periods";

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

function periodsKey(userId: string | null): string {
  return `${LOCAL_PERIODS_KEY}:${localScope(userId)}`;
}

export function loadLocalProgramPeriods(userId: string | null): ProgramPeriod[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(periodsKey(userId));
    if (raw) return JSON.parse(raw) as ProgramPeriod[];
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalProgramPeriods(
  userId: string | null,
  periods: ProgramPeriod[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(periodsKey(userId), JSON.stringify(periods));
}

export function buildCurrentProgramPeriod(
  programStartDate: string | null,
  goalDate: string | null,
  today: string
): ProgramPeriod {
  if (!programStartDate || !goalDate) {
    const start = format(subDays(parseISO(today), 6), "yyyy-MM-dd");
    return {
      id: CURRENT_PROGRAM_ID,
      label: "Bez nastaveného programu",
      startDate: start,
      endDate: today,
      isVirtual: true,
    };
  }

  const end =
    goalDate < today ? goalDate : today > programStartDate ? today : programStartDate;
  return {
    id: CURRENT_PROGRAM_ID,
    label: `Aktuálny program · ${formatProgramDateShort(programStartDate)} – ${formatProgramDateShort(goalDate)}`,
    startDate: programStartDate,
    endDate: end,
    isVirtual: true,
  };
}

export function buildCustomRangePeriod(
  startDate: string,
  endDate: string
): ProgramPeriod {
  return {
    id: CUSTOM_RANGE_ID,
    label: `Vlastný rozsah · ${formatProgramDateShort(startDate)} – ${formatProgramDateShort(endDate)}`,
    startDate,
    endDate,
    isVirtual: true,
  };
}

export function clampRangeEnd(
  startDate: string,
  endDate: string,
  today: string
): string {
  if (endDate > today) return today >= startDate ? today : startDate;
  return endDate;
}

export function formatHistoryDayLabel(
  dateStr: string,
  locale: AppLocale = "en"
): string {
  try {
    return format(parseISO(dateStr), "EEE d. M. yyyy", {
      locale: dateFnsLocale(locale),
    });
  } catch {
    return dateStr;
  }
}

export function rowToProgramPeriod(row: Record<string, unknown>): ProgramPeriod {
  return {
    id: String(row.id),
    label: String(row.label ?? "Program"),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    dailyCalorieTarget:
      row.daily_calorie_target != null
        ? Number(row.daily_calorie_target)
        : null,
    startWeightKg:
      row.start_weight_kg != null ? Number(row.start_weight_kg) : null,
    goalWeightKg:
      row.goal_weight_kg != null ? Number(row.goal_weight_kg) : null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}
