/** Meal protocol copy — English */
export const mealPlanBlockMessagesEn = {
  meal1: {
    composition: "3–4 eggs (omelette) or 150 g chicken breast.",
    side: "Large handful of leafy greens with olive oil.",
    protocolTip:
      "First meal when the window opens — protein + fat, minimal carbs.",
    estimatedKcal: "approx. 400–550 kcal",
    realExamples:
      "4 eggs + salad · chicken steak + veg · Greek yogurt with nuts if short on time.",
    logHint: "Calories tab → Meal 1 → add items. Checkbox updates automatically.",
    technicalNote:
      "No bread or carbs — lean protein and fat to start metabolism.",
  },
  snack: {
    composition: "Handful of walnuts or almonds (unsalted).",
    purpose: "Keeps energy stable between main meals.",
    protocolTip: "Optional — only if hungry between meals. Small portion.",
    estimatedKcal: "approx. 150–200 kcal",
    realExamples: "Nuts · apple · yogurt · small treat when needed.",
    logHint: "Calories tab → Snack → each item as a separate row.",
  },
  meal2: {
    composition: "200 g lean meat or white fish (cod).",
    side: "Steamed zucchini or green beans with butter or olive oil.",
    protocolTip:
      "Last meal before the window closes — easy to digest. After this, water only.",
    estimatedKcal: "approx. 400–500 kcal",
    realExamples:
      "Cod + potatoes + tomatoes · chicken + broccoli · omelette for dinner.",
    logHint: "Calories tab → Meal 2 → add fish, sides separately (basket → save).",
    technicalNote:
      "Last meal — keep it light for overnight recovery. Window: {range}.",
  },
} as const;
