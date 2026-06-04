"use client";

import { useMemo } from "react";
import { useBodyGoal } from "@/hooks/use-body-goal";
import {
  buildMealTimesFromWindow,
  eatingWindowDurationHours,
  eatingWindowFromSettings,
  formatEatingWindowRange,
  formatFastingPeriodLabel,
  type EatingWindow,
} from "@/lib/eating-window";
import { buildBodyforgeSchedule } from "@/lib/bodyforge-schedule";
import { getMealBlocksForSettings } from "@/lib/meal-blocks-for-settings";
import type { MessageKey, TranslateParams } from "@/lib/i18n/types";
import { useI18n } from "@/providers/locale-provider";

type TFn = (key: MessageKey, params?: TranslateParams) => string;

function formatWindowLabel(window: EatingWindow, t: TFn): string {
  const hours = eatingWindowDurationHours(window);
  if (Math.abs(hours - 8) < 0.01) return "16:8";
  return t("eatingWindow.labelHours", { hours });
}

export function useEatingWindow() {
  const { settings } = useBodyGoal();
  const { t } = useI18n();

  return useMemo(() => {
    const window = eatingWindowFromSettings(settings);
    if (!window) {
      return {
        configured: false as const,
        window: null as EatingWindow | null,
        start: null as string | null,
        end: null as string | null,
        label: t("common.notSet"),
        rangeLabel: "—",
        fastingLabel: "—",
        durationHours: 0,
        mealTimes: null,
        mealBlocks: [] as ReturnType<typeof getMealBlocksForSettings>,
        bodyforgeSchedule: [] as ReturnType<typeof buildBodyforgeSchedule>,
      };
    }

    const mealTimes = buildMealTimesFromWindow(window);

    return {
      configured: true as const,
      window,
      start: window.start,
      end: window.end,
      label: formatWindowLabel(window, t),
      rangeLabel: formatEatingWindowRange(window),
      fastingLabel: formatFastingPeriodLabel(window),
      durationHours: eatingWindowDurationHours(window),
      mealTimes,
      mealBlocks: getMealBlocksForSettings(settings, window, t),
      bodyforgeSchedule: buildBodyforgeSchedule(
        window,
        getMealBlocksForSettings(settings, window, t)
      ),
    };
  }, [
    settings.eatingWindowStart,
    settings.eatingWindowEnd,
    settings.mealProtocolMode,
    settings.mealProtocolCustom,
    t,
  ]);
}
