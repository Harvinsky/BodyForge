export const MEAL_PLAN_TITLE = "Nutričný Protokol";

export const MEAL_PLAN_HEADLINE = "Protokol: Palivo pre BodyForge";

export const MEAL_PLAN_GOAL =
  "Cieľ: Maximálna regenerácia, nulové nadúvanie, stabilná energia.";

import type { MealTaskKey } from "@/lib/meals";

export type MealBlock = {
  id: string;
  taskKey: MealTaskKey;
  time: string;
  label: string;
  optional?: boolean;
  composition: string;
  side?: string;
  purpose?: string;
  technicalNote?: string;
};

export const MEAL_PLAN_BLOCKS: MealBlock[] = [
  {
    id: "meal-1",
    taskKey: "meal_1_done",
    time: "12:00",
    label: "Jedlo 1 — Otvorenie okna",
    composition:
      "3–4 vajíčka (omeleta / praženica) alebo 150 g kuracích pŕs.",
    side:
      "Veľká hrsť listovej zeleniny (špenát, rukola, poľníček) pokvapkaná olivovým olejom.",
    technicalNote:
      "Žiadne pečivo, žiadne sacharidy. Iba čistá bielkovina a tuk pre naštartovanie metabolizmu.",
  },
  {
    id: "snack",
    taskKey: "meal_snack_done",
    time: "16:00",
    label: "Snack — Voliteľné",
    optional: true,
    composition: "Hrst vlašských orechov alebo mandlí (nesolené).",
    purpose: "Udržanie hladiny energie počas dňa.",
  },
  {
    id: "meal-2",
    taskKey: "meal_2_done",
    time: "19:00",
    label: "Jedlo 2 — Uzavretie okna",
    composition:
      "200 g bieleho mäsa (kuracie / morčacie) alebo bielej ryby (treska).",
    side:
      "Dusená cuketa alebo zelené fazuľky na masle / olivovom oleji.",
    technicalNote:
      "Toto je posledné jedlo. Musí byť ľahko stráviteľné, aby si v noci netrávil energiu na spracovanie potravy, ale na regeneráciu.",
  },
];
