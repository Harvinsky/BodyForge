import { format, parseISO } from "date-fns";

import type { DayHistoryRecord } from "@/lib/day-history";
import { sumMacros } from "@/lib/calories";
import { isHabitDone } from "@/lib/habits";
import { dateFnsLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/i18n/types";
import type { MealTaskKey } from "@/lib/meals";

const SEP = ";";

type ColumnKind = "data" | "gap";

interface ExportColumn {
  kind: ColumnKind;
  section?: string;
  header: string;
  value: (day: DayHistoryRecord) => string | number;
}

interface ExportLabels {
  title: string;
  period: (label: string) => string;
  range: (start: string, end: string, count: number) => string;
  sections: {
    day: string;
    habits: string;
    calories: string;
    activity: string;
    meals: string;
  };
  headers: {
    date: string;
    weekday: string;
    completion: string;
    fastingWindow: string;
    waterHabit: string;
    trainingHabit: string;
    fastingDay: string;
    caloriesTotal: string;
    caloriesTarget: string;
    caloriesStatus: string;
    protein: string;
    waterLiters: string;
    trainingMinutes: string;
    trainingDetail: string;
    steps: string;
    burned: string;
    meal1: string;
    snack: string;
    meal2: string;
    otherMeal: string;
    mealsSummary: string;
  };
  yes: string;
  no: string;
}

const LABELS: Record<AppLocale, ExportLabels> = {
  sk: {
    title: "BodyForge – export histórie dní",
    period: (label) => `Obdobie: ${label}`,
    range: (start, end, count) =>
      `Dátumy: ${start} – ${end} · ${count} ${count === 1 ? "deň" : count < 5 ? "dni" : "dní"}`,
    sections: {
      day: "Dátum a prehľad",
      habits: "Denné návyky",
      calories: "Kalórie",
      activity: "Voda a pohyb",
      meals: "Jedlá",
    },
    headers: {
      date: "Dátum",
      weekday: "Deň",
      completion: "Splnenie dňa (%)",
      fastingWindow: "Jedálne okno 16:8",
      waterHabit: "Pitný režim (cieľ)",
      trainingHabit: "Tréning (cieľ)",
      fastingDay: "Pôstový deň",
      caloriesTotal: "Kalórie celkom",
      caloriesTarget: "Denný cieľ kalórií",
      caloriesStatus: "Stav oproti cieľu",
      protein: "Bielkoviny (g)",
      waterLiters: "Vypitá voda (l)",
      trainingMinutes: "Tréning (min)",
      trainingDetail: "Aktivity",
      steps: "Kroky",
      burned: "Spálené (kcal)",
      meal1: "Jedlo 1 – obed",
      snack: "Snack",
      meal2: "Jedlo 2 – večera",
      otherMeal: "Ostatné jedlo",
      mealsSummary: "Súhrn stravy",
    },
    yes: "Áno",
    no: "Nie",
  },
  en: {
    title: "BodyForge – day history export",
    period: (label) => `Period: ${label}`,
    range: (start, end, count) =>
      `Dates: ${start} – ${end} · ${count} day${count === 1 ? "" : "s"}`,
    sections: {
      day: "Date & overview",
      habits: "Daily habits",
      calories: "Calories",
      activity: "Water & activity",
      meals: "Meals",
    },
    headers: {
      date: "Date",
      weekday: "Day",
      completion: "Day completion (%)",
      fastingWindow: "16:8 eating window",
      waterHabit: "Hydration goal",
      trainingHabit: "Training goal",
      fastingDay: "Fasting day",
      caloriesTotal: "Total calories",
      caloriesTarget: "Daily calorie target",
      caloriesStatus: "Vs target",
      protein: "Protein (g)",
      waterLiters: "Water drunk (l)",
      trainingMinutes: "Training (min)",
      trainingDetail: "Activities",
      steps: "Steps",
      burned: "Burned (kcal)",
      meal1: "Meal 1 – lunch",
      snack: "Snack",
      meal2: "Meal 2 – dinner",
      otherMeal: "Other food",
      mealsSummary: "Food summary",
    },
    yes: "Yes",
    no: "No",
  },
};

function yesNo(value: boolean, labels: ExportLabels): string {
  return value ? labels.yes : labels.no;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (raw === "") return "";
  if (/[";\n\r]/.test(raw) || /^\s|\s$/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function joinRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(SEP);
}

function formatExportDate(iso: string, locale: AppLocale): string {
  const parsed = parseISO(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return format(
    parsed,
    locale === "sk" ? "dd.MM.yyyy" : "MM/dd/yyyy",
    { locale: dateFnsLocale(locale) }
  );
}

function formatDecimal(
  value: number,
  locale: AppLocale,
  fractionDigits = 2
): string {
  const formatted = value.toFixed(fractionDigits);
  return locale === "sk" ? formatted.replace(".", ",") : formatted;
}

function calorieStatusText(day: DayHistoryRecord, locale: AppLocale): string {
  const s = day.calorieStatus;
  if (s.target <= 0) return "";
  if (s.isFastingDay) {
    return s.fastingValid
      ? locale === "sk"
        ? "Pôst – bez jedál"
        : "Fast – no food logged"
      : locale === "sk"
        ? "Pôst – boli záznamy jedla"
        : "Fast – food was logged";
  }
  if (s.overTarget) {
    return locale === "sk"
      ? `Prekročenie (+${s.overBy} kcal)`
      : `Over target (+${s.overBy} kcal)`;
  }
  if (s.inDeficit) {
    return locale === "sk"
      ? `Deficit (${s.deficit} kcal)`
      : `Deficit (${s.deficit} kcal)`;
  }
  return locale === "sk" ? "V cieli" : "On target";
}

function mealItemsText(
  day: DayHistoryRecord,
  mealKey: MealTaskKey
): string {
  const group = day.mealGroups.find((g) => g.mealKey === mealKey);
  if (!group || group.items.length === 0) return "";
  return group.items
    .map((i) => `${i.label} — ${i.calories} kcal`)
    .join("\n");
}

function otherMealText(day: DayHistoryRecord): string {
  const group = day.mealGroups.find((g) => g.mealKey === null);
  if (!group || group.items.length === 0) return "";
  return group.items
    .map((i) => `${i.label} — ${i.calories} kcal`)
    .join("\n");
}

function trainingDetail(day: DayHistoryRecord): string {
  if (day.trainingSessions.length === 0) return "";
  return day.trainingSessions
    .map((s) => `${s.activity} — ${s.duration_minutes} min`)
    .join("\n");
}

function gap(): ExportColumn {
  return { kind: "gap", header: "", value: () => "" };
}

function buildColumns(
  labels: ExportLabels,
  locale: AppLocale
): ExportColumn[] {
  const { sections: s, headers: h } = labels;

  return [
    {
      kind: "data",
      section: s.day,
      header: h.date,
      value: (day) => formatExportDate(day.date, locale),
    },
    {
      kind: "data",
      header: h.weekday,
      value: (day) => day.dateLabel,
    },
    {
      kind: "data",
      header: h.completion,
      value: (day) => (day.hasAnyData ? day.completion : ""),
    },
    gap(),
    {
      kind: "data",
      section: s.habits,
      header: h.fastingWindow,
      value: (day) => yesNo(isHabitDone(day.tasks, "fasting"), labels),
    },
    {
      kind: "data",
      header: h.waterHabit,
      value: (day) => yesNo(isHabitDone(day.tasks, "water"), labels),
    },
    {
      kind: "data",
      header: h.trainingHabit,
      value: (day) => yesNo(isHabitDone(day.tasks, "training"), labels),
    },
    {
      kind: "data",
      header: h.fastingDay,
      value: (day) => yesNo(day.tasks.is_fasting_day, labels),
    },
    gap(),
    {
      kind: "data",
      section: s.calories,
      header: h.caloriesTotal,
      value: (day) => (day.totalCalories > 0 ? day.totalCalories : ""),
    },
    {
      kind: "data",
      header: h.caloriesTarget,
      value: (day) => (day.calorieTarget > 0 ? day.calorieTarget : ""),
    },
    {
      kind: "data",
      header: h.caloriesStatus,
      value: (day) =>
        day.totalCalories > 0 || day.tasks.is_fasting_day
          ? calorieStatusText(day, locale)
          : "",
    },
    {
      kind: "data",
      header: h.protein,
      value: (day) => {
        const protein = sumMacros(day.calorieLogs).protein;
        return protein > 0 ? Math.round(protein) : "";
      },
    },
    gap(),
    {
      kind: "data",
      section: s.activity,
      header: h.waterLiters,
      value: (day) =>
        day.waterMl > 0
          ? formatDecimal(day.waterMl / 1000, locale)
          : "",
    },
    {
      kind: "data",
      header: h.trainingMinutes,
      value: (day) => (day.trainingMinutes > 0 ? day.trainingMinutes : ""),
    },
    {
      kind: "data",
      header: h.trainingDetail,
      value: trainingDetail,
    },
    {
      kind: "data",
      header: h.steps,
      value: (day) => (day.steps > 0 ? day.steps : ""),
    },
    {
      kind: "data",
      header: h.burned,
      value: (day) => (day.burnedKcal > 0 ? day.burnedKcal : ""),
    },
    gap(),
    {
      kind: "data",
      section: s.meals,
      header: h.meal1,
      value: (day) => mealItemsText(day, "meal_1_done"),
    },
    {
      kind: "data",
      header: h.snack,
      value: (day) => mealItemsText(day, "meal_snack_done"),
    },
    {
      kind: "data",
      header: h.meal2,
      value: (day) => mealItemsText(day, "meal_2_done"),
    },
    {
      kind: "data",
      header: h.otherMeal,
      value: otherMealText,
    },
    {
      kind: "data",
      header: h.mealsSummary,
      value: (day) => (day.mealsSummary === "—" ? "" : day.mealsSummary),
    },
  ];
}

function buildSectionRow(columns: ExportColumn[]): string {
  let currentSection = "";
  const cells = columns.map((col) => {
    if (col.kind === "gap") return "";
    if (col.section && col.section !== currentSection) {
      currentSection = col.section;
      return col.section;
    }
    return "";
  });
  return joinRow(cells);
}

export interface DayHistoryCsvMeta {
  periodLabel: string;
  startDate: string;
  endDate: string;
}

/** Jedna hlavička = jeden deň. Stiahne len dni z vybraného obdobia v Histórii. */
export function buildDayHistoryCsv(
  days: DayHistoryRecord[],
  meta: DayHistoryCsvMeta,
  locale: AppLocale = "sk"
): string {
  const labels = LABELS[locale];
  const columns = buildColumns(labels, locale);
  const startLabel = formatExportDate(meta.startDate, locale);
  const endLabel = formatExportDate(meta.endDate, locale);

  const preamble = [
    joinRow([labels.title]),
    joinRow([labels.period(meta.periodLabel)]),
    joinRow([labels.range(startLabel, endLabel, days.length)]),
    "",
    buildSectionRow(columns),
    joinRow(columns.map((c) => c.header)),
  ];

  const dataRows = days.map((day) =>
    joinRow(columns.map((col) => col.value(day)))
  );

  return [...preamble, ...dataRows].join("\r\n");
}

export function sanitizeCsvFilename(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .toLowerCase();
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportDayHistoryCsv(
  days: DayHistoryRecord[],
  periodLabel: string,
  startDate: string,
  endDate: string,
  locale: AppLocale = "sk"
): void {
  if (days.length === 0) return;

  const csv = buildDayHistoryCsv(
    days,
    { periodLabel, startDate, endDate },
    locale
  );
  const slug = sanitizeCsvFilename(periodLabel) || "historia";
  const filename = `bodyforge-${slug}-${startDate}_${endDate}.csv`;
  downloadCsvFile(filename, csv);
}
