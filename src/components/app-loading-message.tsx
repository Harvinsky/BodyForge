"use client";

import { useI18n } from "@/providers/locale-provider";

export function AppLoadingMessage() {
  const { t } = useI18n();
  return (
    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
      {t("shell.loading")}
    </p>
  );
}
