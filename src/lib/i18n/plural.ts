import type { AppLocale } from "@/lib/i18n/types";
import type { EnMessages } from "@/lib/i18n/locales/en";

type TFn = (key: keyof EnMessages | string) => string;

/** e.g. "3 days" / "3 dni" */
export function formatDayCount(
  count: number,
  locale: AppLocale,
  t: TFn
): string {
  let word: string;
  if (locale === "sk") {
    if (count === 1) word = t("common.day");
    else if (count >= 2 && count <= 4) word = t("common.days2");
    else word = t("common.days5");
  } else {
    word = count === 1 ? t("common.day") : t("common.days2");
  }
  return `${count} ${word}`;
}
