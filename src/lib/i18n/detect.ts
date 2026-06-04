import type { AppLocale } from "@/lib/i18n/types";

/** Map device language tags to app locales (more languages → en until translated). */
export function detectAppLocale(): AppLocale {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);

  for (const tag of candidates) {
    const base = tag.split("-")[0]?.toLowerCase();
    if (base === "sk") {
      return "sk";
    }
  }

  return "en";
}

export function bcp47Tag(locale: AppLocale): string {
  return locale === "sk" ? "sk-SK" : "en-US";
}
