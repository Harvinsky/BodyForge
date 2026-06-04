"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyGoal } from "@/hooks/use-body-goal";
import {
  clampDailyCalorieTarget,
  DAILY_CALORIE_MAX,
  DAILY_CALORIE_MIN,
} from "@/lib/body-goal";
import { useI18n } from "@/providers/locale-provider";

type Props = {
  compact?: boolean;
};

export function DailyCalorieTargetControl({ compact = false }: Props) {
  const { settings, saving, updateDailyCalorieTarget } = useBodyGoal();
  const { t } = useI18n();
  const [draft, setDraft] = useState(
    settings.dailyCalorieTarget != null ? String(settings.dailyCalorieTarget) : ""
  );
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(
      settings.dailyCalorieTarget != null
        ? String(settings.dailyCalorieTarget)
        : ""
    );
  }, [settings.dailyCalorieTarget]);

  const save = async () => {
    const next = clampDailyCalorieTarget(Number(draft));
    if (next == null) return;
    setDraft(String(next));
    await updateDailyCalorieTarget(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[7rem] flex-1 space-y-1">
          <Label
            htmlFor="daily-kcal-compact"
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            {t("calories.compactLabel")}
          </Label>
          <Input
            id="daily-kcal-compact"
            type="number"
            min={DAILY_CALORIE_MIN}
            max={DAILY_CALORIE_MAX}
            placeholder={`${DAILY_CALORIE_MIN}`}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
            className="h-9 border-primary/30 bg-background/60 font-mono text-sm"
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void save()}
          className="font-mono text-[10px] uppercase tracking-wider"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("common.save")}
        </Button>
        {savedFlash && (
          <span className="font-mono text-[10px] text-emerald-400">
            {t("calories.saved")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/25 bg-background/40 p-3 sm:p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
        {t("calories.dailyLimitTitle")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("calories.dailyLimitHint")}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[8rem] flex-1 space-y-1.5 sm:max-w-[12rem]">
          <Label
            htmlFor="daily-kcal"
            className="font-mono text-[10px] uppercase tracking-wider"
          >
            {t("calories.limitLabel")}
          </Label>
          <Input
            id="daily-kcal"
            type="number"
            min={DAILY_CALORIE_MIN}
            max={DAILY_CALORIE_MAX}
            placeholder={`${DAILY_CALORIE_MIN}`}
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="font-mono text-xs uppercase tracking-wider"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.saving")}
            </>
          ) : (
            t("calories.saveLimit")
          )}
        </Button>
        {savedFlash && (
          <span className="self-center font-mono text-xs text-emerald-400">
            {t("calories.savedAccount")}
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        {t("calories.activeLimit")}{" "}
        <strong>
          {settings.dailyCalorieTarget != null
            ? `${settings.dailyCalorieTarget} kcal`
            : t("calories.unset")}
        </strong>{" "}
        · {t("calories.range", { min: DAILY_CALORIE_MIN, max: DAILY_CALORIE_MAX })}
      </p>
    </div>
  );
}
