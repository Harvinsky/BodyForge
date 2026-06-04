import type { DayHistoryRecord } from "@/lib/day-history";
import { isHabitDone } from "@/lib/habits";
import type { MealTaskKey } from "@/lib/meals";

const SEP = ";";

function yesNo(value: boolean): string {
  return value ? "áno" : "nie";
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[";\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function mealItemsText(
  day: DayHistoryRecord,
  mealKey: MealTaskKey
): string {
  const group = day.mealGroups.find((g) => g.mealKey === mealKey);
  if (!group || group.items.length === 0) return "";
  return group.items
    .map((i) => `${i.label} (${i.calories} kcal)`)
    .join(", ");
}

function otherMealText(day: DayHistoryRecord): string {
  const group = day.mealGroups.find((g) => g.mealKey === null);
  if (!group || group.items.length === 0) return "";
  return group.items
    .map((i) => `${i.label} (${i.calories} kcal)`)
    .join(", ");
}

export function buildDayHistoryCsv(days: DayHistoryRecord[]): string {
  const headers = [
    "datum",
    "den",
    "splnenie_percent",
    "16_8",
    "voda_ciel",
    "trening",
    "post",
    "kalorie",
    "kalorie_ciel",
    "voda_l",
    "trening_detail",
    "kroky",
    "spalene_kcal",
    "jedlo_1",
    "snack",
    "jedlo_2_večera",
    "ostatne_jedlo",
    "jedlo_celkom",
  ];

  const rows = days.map((day) =>
    [
      day.date,
      day.dateLabel,
      day.hasAnyData ? day.completion : "",
      yesNo(isHabitDone(day.tasks, "fasting")),
      yesNo(isHabitDone(day.tasks, "water")),
      yesNo(isHabitDone(day.tasks, "training")),
      yesNo(day.tasks.is_fasting_day),
      day.totalCalories || "",
      day.calorieTarget,
      day.waterMl > 0 ? (day.waterMl / 1000).toFixed(2) : "",
      day.trainingSummary === "Bez tréningu" ? "" : day.trainingSummary,
      day.steps || "",
      day.burnedKcal || "",
      mealItemsText(day, "meal_1_done"),
      mealItemsText(day, "meal_snack_done"),
      mealItemsText(day, "meal_2_done"),
      otherMealText(day),
      day.mealsSummary === "—" ? "" : day.mealsSummary,
    ]
      .map(escapeCsvCell)
      .join(SEP)
  );

  return [headers.join(SEP), ...rows].join("\r\n");
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
  endDate: string
): void {
  if (days.length === 0) return;

  const csv = buildDayHistoryCsv(days);
  const slug = sanitizeCsvFilename(periodLabel) || "historia";
  const filename = `bodyforge-${slug}-${startDate}_${endDate}.csv`;
  downloadCsvFile(filename, csv);
}
