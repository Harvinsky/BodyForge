import type { CalorieDayStatus } from "@/lib/calories";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";
import type { MealTaskKey } from "@/lib/meals";

type TFn = (key: MessageKey, params?: TranslateParams) => string;

export function formatCalorieStatusMessage(
  status: CalorieDayStatus,
  t: TFn
): string {
  if (status.target === 0) {
    return t("calories.statusNoLimit");
  }
  if (status.isFastingDay) {
    return status.fastingValid
      ? t("calories.statusFastingOk")
      : t("calories.statusFastingBroken", { kcal: status.consumed });
  }
  if (status.inDeficit) {
    return t("calories.statusRemaining", {
      deficit: status.deficit,
      target: status.target,
    });
  }
  return t("calories.statusOver", {
    over: status.consumed - status.target,
    target: status.target,
  });
}

export function mealKeyLabel(key: MealTaskKey, t: TFn): string {
  switch (key) {
    case "meal_1_done":
      return t("common.meal1");
    case "meal_snack_done":
      return t("common.snack");
    case "meal_2_done":
      return t("common.meal2");
  }
}

export function mealKeyShort(key: MealTaskKey, t: TFn): string {
  switch (key) {
    case "meal_1_done":
      return t("calories.mealShortMeal1");
    case "meal_snack_done":
      return t("calories.mealShortSnack");
    case "meal_2_done":
      return t("calories.mealShortMeal2");
  }
}
