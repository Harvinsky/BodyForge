"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format as formatDateFns } from "date-fns";
import type { Locale as DateFnsLocale } from "date-fns";

import { detectAppLocale, bcp47Tag } from "@/lib/i18n/detect";
import { dateFnsLocale, formatNumber } from "@/lib/i18n/format";
import { createTranslator, getMessages } from "@/lib/i18n/translate";
import type { AppLocale, MessageKey, Messages, TranslateParams } from "@/lib/i18n/types";

interface LocaleContextValue {
  locale: AppLocale;
  messages: Messages;
  t: (key: MessageKey, params?: TranslateParams) => string;
  dateLocale: DateFnsLocale;
  formatNumber: (value: number) => string;
  formatDate: (date: Date | number, pattern: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>("en");

  useEffect(() => {
    setLocale(detectAppLocale());
  }, []);

  const messages = useMemo(() => getMessages(locale), [locale]);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const dateLoc = useMemo(() => dateFnsLocale(locale), [locale]);

  const formatNum = useCallback(
    (value: number) => formatNumber(value, locale),
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | number, pattern: string) =>
      formatDateFns(date, pattern, { locale: dateLoc }),
    [dateLoc]
  );

  useEffect(() => {
    document.documentElement.lang = locale === "sk" ? "sk" : "en";
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      messages,
      t,
      dateLocale: dateLoc,
      formatNumber: formatNum,
      formatDate,
    }),
    [locale, messages, t, dateLoc, formatNum, formatDate]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function useFormatLocale() {
  const { locale, dateLocale, formatNumber, formatDate } = useI18n();
  return { locale, dateLocale, formatNumber, formatDate, bcp47: bcp47Tag(locale) };
}
