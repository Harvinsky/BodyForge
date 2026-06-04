import type { EnMessages } from "@/lib/i18n/locales/en";

export type AppLocale = "sk" | "en";

/** Same keys as English catalog; values may be translated strings. */
type Stringify<T> = {
  [K in keyof T]: T[K] extends string ? string : Stringify<T[K]>;
};

export type Messages = Stringify<EnMessages>;

export type MessageKey = string;

export type TranslateParams = Record<string, string | number | null | undefined>;
