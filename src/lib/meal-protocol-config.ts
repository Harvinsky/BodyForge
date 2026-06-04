import type { MealBlock } from "@/lib/meal-plan-protocol";
import {
  buildMealTimesFromWindow,
  formatEatingWindowRange,
  type EatingWindow,
} from "@/lib/eating-window";
import type { MealTaskKey } from "@/lib/meals";

export type MealProtocolMode = "bodyforge" | "custom";

export type CustomMealSlotFields = {
  label: string;
  composition: string;
  protocolTip: string;
  estimatedKcal: string;
  realExamples: string;
  logHint: string;
  side?: string;
  purpose?: string;
};

export type CustomMealProtocol = {
  meal1: CustomMealSlotFields;
  snack: CustomMealSlotFields & { enabled: boolean };
  meal2: CustomMealSlotFields;
};

const MAX_FIELD = 2000;

function trimField(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/** Predvolený vlastný protokol — východisko z BodyForge šablóny (SK). */
export const DEFAULT_CUSTOM_MEAL_PROTOCOL: CustomMealProtocol = {
  meal1: {
    label: "Jedlo 1 — Otvorenie okna",
    composition:
      "3–4 vajíčka (omeleta / praženica) alebo 150 g kuracích pŕs.",
    side: "Veľká hrsť listovej zeleniny pokvapkaná olivovým olejom.",
    protocolTip:
      "Prvé jedlo po otvorení okna — bielkovina + tuk, minimum sacharidov.",
    estimatedKcal: "cca 400–550 kcal",
    realExamples:
      "4 vajcia + šalát · kurací steak + zelenina · jogurt s orechmi.",
    logHint: "Kalórie → Jedlo 1 → pridaj položky.",
  },
  snack: {
    enabled: true,
    label: "Snack — Voliteľné",
    composition: "Hrst vlašských orechov alebo mandlí (nesolené).",
    purpose: "Udržanie energie počas dňa.",
    protocolTip: "Len ak ťa prepadne hlad medzi hlavnými jedlami.",
    estimatedKcal: "cca 150–200 kcal",
    realExamples: "Hrst orechov · jablko · jogurt.",
    logHint: "Kalórie → Snack → každý kus zvlášť.",
  },
  meal2: {
    label: "Jedlo 2 — Uzavretie okna",
    composition:
      "200 g bieleho mäsa alebo bielej ryby (treska).",
    side: "Dusená zelenina na olivovom oleji.",
    protocolTip:
      "Posledné jedlo pred zatvorením okna — bielkovina + zelenina.",
    estimatedKcal: "cca 400–500 kcal",
    realExamples: "Treska + zemiaky + zelenina · kuracie prsia + brokolica.",
    logHint: "Kalórie → Jedlo 2 → pridaj položky zvlášť.",
  },
};

export function sanitizeCustomMealProtocol(
  raw: unknown
): CustomMealProtocol | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const meal1 = o.meal1;
  const snack = o.snack;
  const meal2 = o.meal2;
  if (!meal1 || !snack || !meal2 || typeof meal1 !== "object") return null;

  const slot = (
    src: Record<string, unknown>,
    defaults: CustomMealSlotFields
  ): CustomMealSlotFields => ({
    label: trimField(src.label, 120) || defaults.label,
    composition: trimField(src.composition, MAX_FIELD) || defaults.composition,
    protocolTip: trimField(src.protocolTip, MAX_FIELD) || defaults.protocolTip,
    estimatedKcal:
      trimField(src.estimatedKcal, 80) || defaults.estimatedKcal,
    realExamples:
      trimField(src.realExamples, MAX_FIELD) || defaults.realExamples,
    logHint: trimField(src.logHint, MAX_FIELD) || defaults.logHint,
    side: trimField(src.side, MAX_FIELD) || defaults.side,
    purpose: trimField(src.purpose, MAX_FIELD) || defaults.purpose,
  });

  const snackSrc = snack as Record<string, unknown>;

  return {
    meal1: slot(meal1 as Record<string, unknown>, DEFAULT_CUSTOM_MEAL_PROTOCOL.meal1),
    snack: {
      ...slot(snackSrc, DEFAULT_CUSTOM_MEAL_PROTOCOL.snack),
      enabled: snackSrc.enabled !== false,
    },
    meal2: slot(meal2 as Record<string, unknown>, DEFAULT_CUSTOM_MEAL_PROTOCOL.meal2),
  };
}

export function parseMealProtocolMode(value: unknown): MealProtocolMode {
  return value === "custom" ? "custom" : "bodyforge";
}

function slotToBlock(
  id: string,
  taskKey: MealTaskKey,
  time: string,
  fields: CustomMealSlotFields,
  optional?: boolean
): MealBlock {
  return {
    id,
    taskKey,
    time,
    label: fields.label,
    optional,
    composition: fields.composition,
    side: fields.side,
    purpose: fields.purpose,
    protocolTip: fields.protocolTip,
    estimatedKcal: fields.estimatedKcal,
    realExamples: fields.realExamples,
    logHint: fields.logHint,
    technicalNote: fields.purpose,
  };
}

export function buildMealBlocksFromCustomProtocol(
  window: EatingWindow,
  custom: CustomMealProtocol
): MealBlock[] {
  const times = buildMealTimesFromWindow(window);
  const range = formatEatingWindowRange(window);

  const blocks: MealBlock[] = [
    slotToBlock("meal-1", "meal_1_done", times.meal1, custom.meal1),
  ];

  if (custom.snack.enabled) {
    blocks.push(
      slotToBlock("snack", "meal_snack_done", times.snack, custom.snack, true)
    );
  }

  blocks.push(
    slotToBlock("meal-2", "meal_2_done", times.meal2, {
      ...custom.meal2,
      protocolTip: `${custom.meal2.protocolTip} Jedálne okno: ${range}.`,
    })
  );

  return blocks;
}
