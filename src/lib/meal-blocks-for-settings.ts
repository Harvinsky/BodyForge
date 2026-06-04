import type { BodyGoalSettings } from "@/lib/body-goal";
import type { EatingWindow } from "@/lib/eating-window";
import {
  buildMealBlocksFromCustomProtocol,
  resolveMealProtocolContent,
} from "@/lib/meal-protocol-config";
import { buildLocalizedMealBlocks } from "@/lib/i18n/meal-plan-blocks";
import type { MealBlock } from "@/lib/meal-plan-protocol";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";

type TFn = (key: MessageKey, params?: TranslateParams) => string;

export function getMealBlocksForSettings(
  settings: BodyGoalSettings,
  window: EatingWindow | null,
  t: TFn
): MealBlock[] {
  if (!window) return [];

  const protocol = resolveMealProtocolContent(
    settings.mealProtocolMode,
    settings.mealProtocolCustom
  );

  if (protocol) {
    return buildMealBlocksFromCustomProtocol(window, protocol);
  }

  return buildLocalizedMealBlocks(window, t);
}
