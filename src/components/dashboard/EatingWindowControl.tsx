"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useEatingWindow } from "@/hooks/use-eating-window";
import { clampEatingWindow } from "@/lib/body-goal";
import {
  eatingWindowDurationHours,
  eatingWindowFromSettings,
  formatEatingWindowRange,
  normalizeEatingWindow,
  parseTimeInput,
} from "@/lib/eating-window";
import { useI18n } from "@/providers/locale-provider";

export function EatingWindowControl({ compact = false }: { compact?: boolean }) {
  const { settings, saving, updateSettings } = useBodyGoal();
  const { label, fastingLabel } = useEatingWindow();
  const { t } = useI18n();
  const [start, setStart] = useState(settings.eatingWindowStart ?? "");
  const [end, setEnd] = useState(settings.eatingWindowEnd ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStart(settings.eatingWindowStart ?? "");
    setEnd(settings.eatingWindowEnd ?? "");
  }, [settings.eatingWindowStart, settings.eatingWindowEnd]);

  const preview =
    normalizeEatingWindow(start, end) ??
    (settings.eatingWindowStart && settings.eatingWindowEnd
      ? normalizeEatingWindow(
          settings.eatingWindowStart,
          settings.eatingWindowEnd
        )
      : null);

  const save = async () => {
    const parsedStart = parseTimeInput(start);
    const parsedEnd = parseTimeInput(end);
    if (!parsedStart || !parsedEnd) {
      setError(t("eatingWindow.invalidTime"));
      return;
    }

    const normalized = normalizeEatingWindow(parsedStart, parsedEnd);
    if (!normalized) {
      setError(t("eatingWindow.invalidRange"));
      return;
    }

    setError(null);
    const clamped = clampEatingWindow(normalized.start, normalized.end);
    if (!clamped) return;
    await updateSettings(clamped);
  };

  if (compact) {
    const window = eatingWindowFromSettings(settings);
    return (
      <p className="font-mono text-[10px] text-muted-foreground">
        {t("eatingWindow.compact", {
          range: window ? formatEatingWindowRange(window) : t("eatingWindow.unset"),
          fasting: fastingLabel,
        })}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-background/35 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[#e8d5a3]">
            {t("eatingWindow.title")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("eatingWindow.hint", { label })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="eating-start" className="text-xs">
            {t("eatingWindow.start")}
          </Label>
          <Input
            id="eating-start"
            type="time"
            value={start}
            placeholder="12:00"
            onChange={(e) => setStart(e.target.value)}
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eating-end" className="text-xs">
            {t("eatingWindow.end")}
          </Label>
          <Input
            id="eating-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
      </div>

      {preview && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {t("eatingWindow.preview", {
            range: formatEatingWindowRange(preview),
            hours: eatingWindowDurationHours(preview),
            end: preview.end,
            start: preview.start,
          })}
        </p>
      )}

      {error && <p className="text-[11px] text-amber-200">{error}</p>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void save()}
        disabled={saving}
        className="border-primary/40 text-xs"
      >
        {saving ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            {t("common.saving")}
          </>
        ) : (
          t("eatingWindow.save")
        )}
      </Button>
    </div>
  );
}
