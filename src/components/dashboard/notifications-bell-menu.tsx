"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNotifications } from "@/providers/notification-provider";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

export function NotificationsBellMenu() {
  const {
    enabled,
    supported,
    canEnable,
    permission,
    isNative,
    statusMessage,
    enableNotifications,
    disableNotifications,
  } = useNotifications();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!supported) {
    return null;
  }

  const onToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        await enableNotifications();
      } else {
        disableNotifications();
      }
    } finally {
      setBusy(false);
    }
  };

  const blocked = !canEnable && !enabled;
  const statusLabel = enabled
    ? t("notifications.on")
    : blocked
      ? t("notifications.blockedHere")
      : permission === "denied"
        ? t("notifications.blockedBrowser")
        : t("notifications.off");

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={enabled ? t("notifications.ariaOn") : t("notifications.ariaOff")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-8 w-8 shrink-0 border-primary/40 transition-all duration-500",
          enabled
            ? "border-primary/70 bg-primary/15 text-[#e8d5a3] shadow-[0_0_18px_rgba(201,162,39,0.55)] hover:bg-primary/20 hover:shadow-[0_0_24px_rgba(201,162,39,0.65)]"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        )}
      >
        {enabled ? (
          <BellRing className="h-3.5 w-3.5" strokeWidth={2.25} />
        ) : blocked ? (
          <BellOff className="h-3.5 w-3.5" strokeWidth={1.75} />
        ) : (
          <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={t("notifications.title")}
          className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-primary/30 bg-card/95 p-3 shadow-xl backdrop-blur-md"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("notifications.title")}
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  enabled ? "text-[#e8d5a3]" : "text-muted-foreground"
                )}
              >
                {statusLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {enabled
                  ? isNative
                    ? t("notifications.onHintNative")
                    : t("notifications.onHintBrowser")
                  : isNative
                    ? t("notifications.offHintNative")
                    : canEnable
                      ? t("notifications.offHintBrowser")
                      : t("notifications.offHintBlocked")}
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={busy || (blocked && !enabled)}
              onCheckedChange={(checked) => void onToggle(checked)}
              aria-label={t("notifications.toggle")}
            />
          </div>

          {statusMessage && (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {statusMessage}
            </p>
          )}

          {!enabled && canEnable && permission !== "granted" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="mt-3 w-full border-primary/40 text-xs"
              onClick={() => void onToggle(true)}
            >
              {t("notifications.enable")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
