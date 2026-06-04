import type { MealBlock } from "@/lib/meal-plan-protocol";
import {
  buildMealTimesFromWindow,
  formatEatingWindowRange,
  type EatingWindow,
} from "@/lib/eating-window";
import type { MealTaskKey } from "@/lib/meals";

export const MEAL_PROTOCOL_PRESETS = [
  "bodyforge",
  "keto",
  "vegetarian",
  "girls",
  "athlete",
  "custom",
] as const;

export type MealProtocolPresetId = (typeof MEAL_PROTOCOL_PRESETS)[number];

/** @deprecated alias */
export type MealProtocolMode = MealProtocolPresetId;

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

/** Východisko pre vlastnú úpravu (BodyForge texty). */
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

export const BUILT_IN_MEAL_PROTOCOLS: Record<
  Exclude<MealProtocolPresetId, "bodyforge" | "custom">,
  CustomMealProtocol
> = {
  keto: {
    meal1: {
      label: "Jedlo 1 — nízkosacharidové",
      composition:
        "Vajcia, avokádo, syr alebo losos — minimum sacharidov, vyšší tuk.",
      side: "Listová zelenina s olivovým olejom.",
      protocolTip: "Drž sacharidy nízko celé okno — bielkovina + zdravý tuk.",
      estimatedKcal: "cca 450–600 kcal",
      realExamples: "Omeleta + avokádo · losos + šalát.",
      logHint: "Kalórie → Jedlo 1.",
    },
    snack: {
      enabled: true,
      label: "Snack — tuk / bielkovina",
      composition: "Orechy, olivy alebo malý jogurt bez cukru.",
      purpose: "Udržanie ketózy bez cukru.",
      protocolTip: "Bez ovocia a pečiva medzi jedlami.",
      estimatedKcal: "cca 150–250 kcal",
      realExamples: "Mandle · cottage · 85% čokoláda (malá porcia).",
      logHint: "Kalórie → Snack.",
    },
    meal2: {
      label: "Jedlo 2 — večera keto",
      composition: "Mäso / ryba + dusená zelenina, bez príloh z obilia.",
      side: "Maslo alebo olej na zeleninu.",
      protocolTip: "Posledné jedlo — žiadne sacharidy pred fastingom.",
      estimatedKcal: "cca 450–550 kcal",
      realExamples: "Steak + brokolica · treska + špenát.",
      logHint: "Kalórie → Jedlo 2.",
    },
  },
  vegetarian: {
    meal1: {
      label: "Jedlo 1 — rastlinné",
      composition:
        "Tofu / tempeh / vajcia / strukoviny + zelenina (doplň B12 podľa potreby).",
      side: "Celozrnná príloha malá alebo hrsť orechov.",
      protocolTip: "Kombinuj bielkoviny rastlinného pôvodu v jednej porcii.",
      estimatedKcal: "cca 400–550 kcal",
      realExamples: "Tofu stir-fry · šošovica + ryža · omeleta + šalát.",
      logHint: "Kalórie → Jedlo 1.",
    },
    snack: {
      enabled: true,
      label: "Snack — orechy / ovocie",
      composition: "Jogurt, orechy alebo sezónne ovocie.",
      purpose: "Doplnenie energie medzi jedlami.",
      protocolTip: "Malá porcia — nie druhé hlavné jedlo.",
      estimatedKcal: "cca 150–220 kcal",
      realExamples: "Grécky jogurt · banán · hummus + mrkva.",
      logHint: "Kalórie → Snack.",
    },
    meal2: {
      label: "Jedlo 2 — večera bez mäsa",
      composition: "Strukoviny, tofu alebo vajcia + veľa zeleniny.",
      side: "Ryža / quinoa v menšej porcii.",
      protocolTip: "Ľahšia večera — dobre stráviteľné pred fastingom.",
      estimatedKcal: "cca 400–500 kcal",
      realExamples: "Cícer curry · špagety s cuketou · vajíčková omeleta.",
      logHint: "Kalórie → Jedlo 2.",
    },
  },
  girls: {
    meal1: {
      label: "Jedlo 1 — ľahký štart",
      composition:
        "Jogurt, ovsená kaša, vajce alebo smoothie — vyvážená bielkovina bez ťažkosti.",
      side: "Ovocie alebo hrsť orechov.",
      protocolTip:
        "Jemnejší režim — dostatok energie, nie príliš tučné ráno.",
      estimatedKcal: "cca 350–500 kcal",
      realExamples: "Grécky jogurt + ovocie · ovsené s bobuľami · omeleta.",
      logHint: "Kalórie → Jedlo 1.",
    },
    snack: {
      enabled: true,
      label: "Snack — ľahký",
      composition: "Ovocie, kefír, malý protein bar alebo hummus s zeleninou.",
      purpose: "Udržanie energie bez prejedania.",
      protocolTip: "Malá porcia — nie náhrada hlavného jedla.",
      estimatedKcal: "cca 120–200 kcal",
      realExamples: "Jablko · smoothie · cottage s ovocím.",
      logHint: "Kalórie → Snack.",
    },
    meal2: {
      label: "Jedlo 2 — ľahšia večera",
      composition:
        "Ryba / kuracie / tofu + zelenina — menšia príloha, viac šalátu.",
      side: "Olivový olej alebo avokádo v malom množstve.",
      protocolTip: "Ľahšia večera — lepší spánok a trávenie.",
      estimatedKcal: "cca 380–480 kcal",
      realExamples: "Treska + šalát · bowl s quinoa · zeleninová polievka.",
      logHint: "Kalórie → Jedlo 2.",
    },
  },
  athlete: {
    meal1: {
      label: "Jedlo 1 — energia pred dňom",
      composition:
        "Bielkoviny + komplexné sacharidy (ovsené, ryža, vajcia, kuracie).",
      side: "Ovocie alebo jogurt ak treba doplniť energiu.",
      protocolTip: "Dostatok sacharidov okolo tréningu — hydratácia.",
      estimatedKcal: "cca 500–700 kcal",
      realExamples: "Ovsené + banán · vajcia + toast · kurací wrap.",
      logHint: "Kalórie → Jedlo 1.",
    },
    snack: {
      enabled: true,
      label: "Snack — okolo tréningu",
      composition: "Proteín + sacharid (shake, jogurt, tyčinka, ovocie).",
      purpose: "Regenerácia a doplnenie glykogénu.",
      protocolTip: "Do 2 h po tréningu — bielkovina + sacharid.",
      estimatedKcal: "cca 200–350 kcal",
      realExamples: "Proteín shake · banán + arašidové maslo.",
      logHint: "Kalórie → Snack.",
    },
    meal2: {
      label: "Jedlo 2 — regenerácia",
      composition:
        "Väčšia porcia bielkovín (mäso / ryba / tofu) + príloha + zelenina.",
      side: "Dostatok zeleniny a tekutín.",
      protocolTip: "Večera doplní bielkoviny po dni — nie príliš neskoro.",
      estimatedKcal: "cca 550–750 kcal",
      realExamples: "Kurací steak + ryža · ryba + zemiaky · cícer bowl.",
      logHint: "Kalórie → Jedlo 2.",
    },
  },
};

export function getBuiltInProtocol(
  preset: Exclude<MealProtocolPresetId, "bodyforge" | "custom">
): CustomMealProtocol {
  return BUILT_IN_MEAL_PROTOCOLS[preset];
}

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

export function parseMealProtocolMode(value: unknown): MealProtocolPresetId {
  if (value === "baby") return "girls";
  if (
    typeof value === "string" &&
    (MEAL_PROTOCOL_PRESETS as readonly string[]).includes(value)
  ) {
    return value as MealProtocolPresetId;
  }
  return "bodyforge";
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

export function resolveMealProtocolContent(
  preset: MealProtocolPresetId,
  custom: CustomMealProtocol | null
): CustomMealProtocol | null {
  if (preset === "bodyforge") return null;
  if (preset === "custom") return custom;
  return getBuiltInProtocol(preset);
}
