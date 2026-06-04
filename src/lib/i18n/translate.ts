import { enMessages } from "@/lib/i18n/locales/en";
import { skMessages } from "@/lib/i18n/locales/sk";
import type { AppLocale, MessageKey, Messages, TranslateParams } from "@/lib/i18n/types";

const CATALOG: Record<AppLocale, Messages> = {
  sk: skMessages,
  en: enMessages,
};

export function getMessages(locale: AppLocale): Messages {
  return CATALOG[locale] ?? enMessages;
}

function resolvePath(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = messages;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(locale: AppLocale) {
  const primary = getMessages(locale);
  const fallback = locale === "sk" ? enMessages : skMessages;

  return function t(key: MessageKey, params?: TranslateParams): string {
    let template =
      resolvePath(primary, key) ??
      resolvePath(fallback, key) ??
      resolvePath(enMessages, key) ??
      key;

    if (params) {
      for (const [name, value] of Object.entries(params)) {
        template = template.replace(
          new RegExp(`\\{${name}\\}`, "g"),
          value == null ? "" : String(value)
        );
      }
    }

    return template;
  };
}
