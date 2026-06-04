import type { MealBlock } from "@/lib/meal-plan-protocol";
import type { MealTaskKey } from "@/lib/meals";
import type { DailyTasks } from "@/lib/types";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";
import {
  buildMealTimesFromWindow,
  formatEatingWindowRange,
  type EatingWindow,
} from "@/lib/eating-window";

type TFn = (key: MessageKey, params?: TranslateParams) => string;

const BLOCK_META = [
  {
    id: "meal-1",
    contentKey: "meal1",
    taskKey: "meal_1_done" as const,
    labelKey: "mealPlan.meal1Label",
    timeKey: "meal1" as const,
  },
  {
    id: "snack",
    contentKey: "snack",
    taskKey: "meal_snack_done" as const,
    labelKey: "mealPlan.snackLabel",
    timeKey: "snack" as const,
    optional: true,
  },
  {
    id: "meal-2",
    contentKey: "meal2",
    taskKey: "meal_2_done" as const,
    labelKey: "mealPlan.meal2Label",
    timeKey: "meal2" as const,
  },
] as const;

function blockField(
  t: TFn,
  contentKey: string,
  field: string,
  params?: TranslateParams
): string {
  return t(`mealPlan.blocks.${contentKey}.${field}`, params);
}

export function buildLocalizedMealBlocks(
  window: EatingWindow,
  t: TFn
): MealBlock[] {
  const times = buildMealTimesFromWindow(window);
  const range = formatEatingWindowRange(window);

  return BLOCK_META.map((meta) => {
    const time =
      meta.timeKey === "meal1"
        ? times.meal1
        : meta.timeKey === "snack"
          ? times.snack
          : times.meal2;

    const side = blockField(t, meta.contentKey, "side");
    const purpose = blockField(t, meta.contentKey, "purpose");
    const technicalNote = blockField(t, meta.contentKey, "technicalNote", {
      range,
    });

    return {
      id: meta.id,
      taskKey: meta.taskKey,
      time,
      label: t(meta.labelKey),
      optional: "optional" in meta ? meta.optional : undefined,
      composition: blockField(t, meta.contentKey, "composition"),
      side: side && !side.startsWith("mealPlan.") ? side : undefined,
      purpose:
        purpose && !purpose.startsWith("mealPlan.") ? purpose : undefined,
      protocolTip: blockField(t, meta.contentKey, "protocolTip"),
      estimatedKcal: blockField(t, meta.contentKey, "estimatedKcal"),
      realExamples: blockField(t, meta.contentKey, "realExamples"),
      logHint: blockField(t, meta.contentKey, "logHint"),
      technicalNote:
        technicalNote && !technicalNote.startsWith("mealPlan.")
          ? technicalNote
          : undefined,
    };
  });
}

/** Which meal slot should show open details (next incomplete, time-aware). */
export function activeMealBlockId(
  blocks: MealBlock[],
  tasks: DailyTasks,
  windowClosed: boolean,
  isFastingDay: boolean,
  now = new Date()
): string | null {
  if (windowClosed || isFastingDay || blocks.length === 0) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();

  const parseTime = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  let best: { id: string; score: number } | null = null;

  for (const block of blocks) {
    if (tasks[block.taskKey as MealTaskKey]) continue;
    const slotMin = parseTime(block.time);
    const score = nowMin >= slotMin - 45 ? slotMin : slotMin + 24 * 60;
    if (!best || score < best.score) {
      best = { id: block.id, score };
    }
  }

  return best?.id ?? null;
}
