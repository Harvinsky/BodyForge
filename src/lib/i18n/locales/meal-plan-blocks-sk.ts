/** Meal protocol copy — Slovak */
export const mealPlanBlockMessagesSk = {
  meal1: {
    composition: "3–4 vajíčka (omeleta / praženica) alebo 150 g kuracích pŕs.",
    side: "Veľká hrsť listovej zeleniny pokvapkaná olivovým olejom.",
    protocolTip:
      "Prvé jedlo po otvorení okna — bielkovina + tuk, minimum sacharidov.",
    estimatedKcal: "cca 400–550 kcal",
    realExamples:
      "4 vajcia + šalát · kurací steak + zelenina · grécky jogurt s orechmi.",
    logHint:
      "Kalórie → Jedlo 1 → pridaj položky. Zaškrtne sa automaticky.",
    technicalNote:
      "Žiadne pečivo — čistá bielkovina a tuk pre metabolizmus.",
  },
  snack: {
    composition: "Hrst vlašských orechov alebo mandlí (nesolené).",
    purpose: "Udržanie energie počas dňa.",
    protocolTip:
      "Voliteľné — len pri hlade medzi jedlami. Malá porcia.",
    estimatedKcal: "cca 150–200 kcal",
    realExamples: "Orechy · jablko · jogurt · malá dobrota pri hlade.",
    logHint: "Kalórie → Snack → každá položka zvlášť.",
  },
  meal2: {
    composition: "200 g bieleho mäsa alebo ryby (treska).",
    side: "Dusená cuketa alebo fazuľky na masle / olivovom oleji.",
    protocolTip:
      "Posledné jedlo pred zatvorením okna — ľahko stráviteľné. Potom len voda.",
    estimatedKcal: "cca 400–500 kcal",
    realExamples:
      "Treska + zemiaky + paradajky · kuracie prsia + brokolica.",
    logHint:
      "Kalórie → Jedlo 2 → pridaj rybu a prílohy zvlášť (košík → uložiť).",
    technicalNote:
      "Posledné jedlo — ľahké pre regeneráciu v noci. Okno: {range}.",
  },
} as const;
