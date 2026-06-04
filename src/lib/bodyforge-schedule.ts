import { HYDRATION_DEADLINE_HOUR } from "@/lib/hydration";
import { buildMealPlanBlocks, type MealBlock } from "@/lib/meal-plan-protocol";
import {
  DEFAULT_EATING_WINDOW,
  formatEatingWindowLabel,
  formatEatingWindowRange,
  parseTimeToMinutes,
  type EatingWindow,
} from "@/lib/eating-window";
import type { MealTaskKey } from "@/lib/meals";
import type { DailyTasks } from "@/lib/types";

export type BodyforgeActivityKind = "meal" | "water" | "protocol";

export interface BodyforgeScheduleSlot {
  id: string;
  kind: BodyforgeActivityKind;
  /** Riadok v kalendárnej mriežke (hodina) */
  hour: number;
  time: string;
  label: string;
  shortLabel: string;
  taskKey?: MealTaskKey;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hourFromTime(time: string): number {
  return Math.floor(parseTimeToMinutes(time) / 60);
}

function mealShortLabel(id: string): string {
  if (id === "meal-1") return "Jedlo 1";
  if (id === "snack") return "Snack";
  if (id === "meal-2") return "Jedlo 2";
  return "Jedlo";
}

function buildMealSlots(
  window: EatingWindow,
  mealBlocks: MealBlock[]
): BodyforgeScheduleSlot[] {
  const slots: BodyforgeScheduleSlot[] = [];
  const endHour = hourFromTime(window.end);

  for (const block of mealBlocks) {
    const mealMin = parseTimeToMinutes(block.time);
    const hour = hourFromTime(block.time);
    const short = mealShortLabel(block.id);

    slots.push({
      id: `bf-${block.id}`,
      kind: "meal",
      hour,
      time: block.time,
      label: block.label,
      shortLabel: short,
      taskKey: block.taskKey,
    });

    const leadMin = mealMin - 30;
    const leadHour = Math.floor(leadMin / 60);
    if (leadHour >= 6 && leadHour <= endHour) {
      slots.push({
        id: `bf-${block.id}-lead`,
        kind: "meal",
        hour: leadHour,
        time: minutesToTime(leadMin),
        label: `Pripomienka · ${short}`,
        shortLabel: `→ ${short}`,
        taskKey: block.taskKey,
      });
    }
  }

  return slots;
}

function buildWaterGridSlots(window: EatingWindow): BodyforgeScheduleSlot[] {
  const endHour = hourFromTime(window.end);
  const lastWaterHour = Math.min(endHour, 20);

  return [
    {
      id: "bf-water-am",
      kind: "water",
      hour: 9,
      time: "09:00",
      label: "Hydratácia · dopoludnie",
      shortLabel: "Voda",
    },
    {
      id: "bf-water-mid",
      kind: "water",
      hour: 14,
      time: "14:00",
      label: "Hydratácia · popoludnie",
      shortLabel: "Voda",
    },
    {
      id: "bf-water-deadline",
      kind: "water",
      hour: HYDRATION_DEADLINE_HOUR,
      time: `${String(HYDRATION_DEADLINE_HOUR).padStart(2, "0")}:00`,
      label: "80 % vody do 18:00",
      shortLabel: "Voda 80%",
    },
    {
      id: "bf-water-evening",
      kind: "water",
      hour: Math.max(15, lastWaterHour - 1),
      time: minutesToTime(Math.max(15, lastWaterHour - 1) * 60),
      label: "Hydratácia · večer",
      shortLabel: "Voda",
    },
    {
      id: "bf-water-last",
      kind: "water",
      hour: lastWaterHour,
      time: window.end,
      label: "Posledná voda (protokol)",
      shortLabel: "Voda",
    },
  ];
}

function buildProtocolSlots(window: EatingWindow): BodyforgeScheduleSlot[] {
  const label = formatEatingWindowLabel(window);
  const range = formatEatingWindowRange(window);

  return [
    {
      id: "bf-window-open",
      kind: "protocol",
      hour: hourFromTime(window.start),
      time: window.start,
      label: `${label} · otvorenie jedálneho okna`,
      shortLabel: "Okno",
    },
    {
      id: "bf-window-close",
      kind: "protocol",
      hour: hourFromTime(window.end),
      time: window.end,
      label: `${label} · koniec jedenia (${range})`,
      shortLabel: "Koniec",
    },
  ];
}

export function buildBodyforgeSchedule(
  window: EatingWindow = DEFAULT_EATING_WINDOW,
  mealBlocks?: MealBlock[]
): BodyforgeScheduleSlot[] {
  const blocks = mealBlocks ?? buildMealPlanBlocks(window);
  return [
    ...buildMealSlots(window, blocks),
    ...buildWaterGridSlots(window),
    ...buildProtocolSlots(window),
  ];
}

/** @deprecated Použi buildBodyforgeSchedule(window) */
export const BODYFORGE_SCHEDULE = buildBodyforgeSchedule(DEFAULT_EATING_WINDOW);

export function bodyforgeSlotsAtHour(
  hour: number,
  schedule: BodyforgeScheduleSlot[],
  options?: { isFastingDay?: boolean }
): BodyforgeScheduleSlot[] {
  return schedule.filter((slot) => {
    if (slot.hour !== hour) return false;
    if (options?.isFastingDay && slot.kind === "meal") return false;
    if (options?.isFastingDay && slot.id === "bf-window-open") return false;
    return true;
  });
}

export function isBodyforgeTaskDone(
  slot: BodyforgeScheduleSlot,
  tasks: DailyTasks
): boolean | null {
  if (!slot.taskKey) return null;
  return Boolean(tasks[slot.taskKey]);
}

export function bodyforgeKindLegend(window: EatingWindow): {
  kind: BodyforgeActivityKind;
  label: string;
  swatchClass: string;
}[] {
  const label = formatEatingWindowLabel(window);
  return [
    {
      kind: "meal",
      label: "BodyForge · jedlo",
      swatchClass: "bg-[#e8d5a3]/40 ring-1 ring-[#e8d5a3]/70",
    },
    {
      kind: "water",
      label: "BodyForge · voda",
      swatchClass: "border-l-2 border-cyan-400 bg-cyan-500/20",
    },
    {
      kind: "protocol",
      label: `BodyForge · ${label}`,
      swatchClass: "border-r-2 border-violet-400/80 bg-violet-500/15",
    },
  ];
}

/** @deprecated Použi bodyforgeKindLegend(window) */
export const BODYFORGE_KIND_LEGEND = bodyforgeKindLegend(DEFAULT_EATING_WINDOW);
