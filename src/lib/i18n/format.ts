import { enUS, sk } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

import type { AppLocale } from "@/lib/i18n/types";
import { bcp47Tag } from "@/lib/i18n/detect";

export function dateFnsLocale(locale: AppLocale): DateFnsLocale {
  return locale === "sk" ? sk : enUS;
}

export function formatNumber(value: number, locale: AppLocale): string {
  return value.toLocaleString(bcp47Tag(locale));
}
