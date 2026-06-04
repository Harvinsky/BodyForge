export const MEAL_PLAN_TITLE = "Nutričný Protokol";

export const MEAL_PLAN_HEADLINE = "Protokol: Palivo pre BodyForge";

export const MEAL_PLAN_GOAL =
  "Cieľ: Maximálna regenerácia, nulové nadúvanie, stabilná energia.";

import type { MealTaskKey } from "@/lib/meals";
import {
  buildMealTimesFromWindow,
  DEFAULT_EATING_WINDOW,
  formatEatingWindowRange,
  type EatingWindow,
} from "@/lib/eating-window";

export type MealBlock = {
  id: string;
  taskKey: MealTaskKey;
  time: string;
  label: string;
  optional?: boolean;
  /** Ideálny návrh BodyForge protokolu */
  composition: string;
  side?: string;
  purpose?: string;
  technicalNote?: string;
  /** Krátky tip — kedy / prečo */
  protocolTip: string;
  /** Orientačné kcal pri dodržaní protokolu */
  estimatedKcal: string;
  /** Čo bežne zješ v reále — môže byť iné */
  realExamples: string;
  /** Ako to zapísať v Kalóriách */
  logHint: string;
};

const MEAL_BLOCK_DETAILS: Record<
  string,
  Omit<MealBlock, "id" | "taskKey" | "time" | "label">
> = {
  "meal-1": {
    composition:
      "3–4 vajíčka (omeleta / praženica) alebo 150 g kuracích pŕs.",
    side:
      "Veľká hrsť listovej zeleniny (špenát, rukola, poľníček) pokvapkaná olivovým olejom.",
    protocolTip:
      "Prvé jedlo po otvorení okna — bielkovina + tuk, minimum sacharidov. Naštartuje metabolizmus bez nadúvania.",
    estimatedKcal: "cca 400–550 kcal",
    realExamples:
      "4 vajcia + šalát · kurací steak + zelenina · grécky jogurt s orechmi (ak nemáš čas variť). Každý deň môže byť iné — dôležité je zalogovať skutočnosť.",
    logHint:
      "Kalórie → vyber **Jedlo 1** → pridaj položky (tabuľka alebo vlastný zápis). Zaškrtne sa automaticky.",
    technicalNote:
      "Žiadne pečivo, žiadne sacharidy. Iba čistá bielkovina a tuk pre naštartovanie metabolizmu.",
  },
  snack: {
    optional: true,
    composition: "Hrst vlašských orechov alebo mandlí (nesolené).",
    purpose: "Udržanie hladiny energie počas dňa.",
    protocolTip:
      "Voliteľné — len ak ťa prepadne hlad medzi hlavnými jedlami. Malá porcia, nie druhé hlavné jedlo.",
    estimatedKcal: "cca 150–200 kcal (hrsť orechov)",
    realExamples:
      "Hrst orechov · jablko · grécky jogurt · kúsok dobošky pri hlade · celý snack môže mať 2–3 položky za deň — každú pridaj zvlášť.",
    logHint:
      "Kalórie → vyber **Snack** (nie Jedlo 1/2) → každý extra kus jedla = nový riadok. Všetky snacky uvidíš pod jednou skupinou s celkovými kcal.",
  },
  "meal-2": {
    composition:
      "200 g bieleho mäsa (kuracie / morčacie) alebo bielej ryby (treska).",
    side:
      "Dusená cuketa alebo zelené fazuľky na masle / olivovom oleji.",
    protocolTip:
      "Posledné jedlo pred zatvorením okna — ľahko stráviteľné, bielkovina + zelenina. Po tom už len voda.",
    estimatedKcal: "cca 400–500 kcal",
    realExamples:
      "Treska + 2 uvarené zemiaky + paradajky · kuracie prsia + brokolica · omeleta na večeru. Zemiaky a prílohy zapíš ako samostatné položky v **Jedlo 2**.",
    logHint:
      "Kalórie → **Jedlo 2** → pridaj rybu, zemiaky, zeleninu zvlášť (košík → uložiť večeru). Súčet kcal = tvoja večera.",
    technicalNote:
      "Toto je posledné jedlo. Musí byť ľahko stráviteľné, aby si v noci netrávil energiu na spracovanie potravy, ale na regeneráciu.",
  },
};

export function buildMealPlanBlocks(window: EatingWindow): MealBlock[] {
  const times = buildMealTimesFromWindow(window);
  const range = formatEatingWindowRange(window);

  const blocks: MealBlock[] = [
    {
      id: "meal-1",
      taskKey: "meal_1_done",
      time: times.meal1,
      label: "Jedlo 1 — Otvorenie okna",
      ...MEAL_BLOCK_DETAILS["meal-1"],
    },
    {
      id: "snack",
      taskKey: "meal_snack_done",
      time: times.snack,
      label: "Snack — Voliteľné",
      ...MEAL_BLOCK_DETAILS.snack,
    },
    {
      id: "meal-2",
      taskKey: "meal_2_done",
      time: times.meal2,
      label: "Jedlo 2 — Uzavretie okna",
      ...MEAL_BLOCK_DETAILS["meal-2"],
    },
  ];

  return blocks.map((block) =>
    block.id === "meal-2"
      ? {
          ...block,
          technicalNote: `${block.technicalNote} Jedálne okno: ${range}.`,
        }
      : block
  );
}

/** Záloha pre statické importy — predvolené 12:00–20:00 */
export const MEAL_PLAN_BLOCKS = buildMealPlanBlocks(DEFAULT_EATING_WINDOW);
