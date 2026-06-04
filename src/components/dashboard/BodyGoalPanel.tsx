"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyGoal } from "@/hooks/use-body-goal";
import {
  clampDailyCalorieTarget,
  formatGoalDateLabel,
  getWeightProgressPercent,
  isBodyGoalConfigured,
  parseDateInput,
  parseWeightInput,
} from "@/lib/body-goal";
import { DailyCalorieTargetControl } from "@/components/dashboard/daily-calorie-target-control";
import { EatingWindowControl } from "@/components/dashboard/EatingWindowControl";
import { MealProtocolSettings } from "@/components/dashboard/MealProtocolSettings";
import { getGoalProgressPercent } from "@/lib/goal";
import { useI18n } from "@/providers/locale-provider";

function weightField(value: number | null): string {
  return value != null ? String(value) : "";
}

export function BodyGoalPanel({ compact = false }: { compact?: boolean }) {
  const { settings, saving, updateSettings } = useBodyGoal();
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState({
    startWeightKg: weightField(settings.startWeightKg),
    goalWeightKg: weightField(settings.goalWeightKg),
    currentWeightKg: weightField(settings.currentWeightKg),
    programStartDate: settings.programStartDate ?? "",
    goalDate: settings.goalDate ?? "",
    dailyCalorieTarget:
      settings.dailyCalorieTarget != null
        ? String(settings.dailyCalorieTarget)
        : "",
  });

  useEffect(() => {
    setDraft({
      startWeightKg: weightField(settings.startWeightKg),
      goalWeightKg: weightField(settings.goalWeightKg),
      currentWeightKg: weightField(settings.currentWeightKg),
      programStartDate: settings.programStartDate ?? "",
      goalDate: settings.goalDate ?? "",
      dailyCalorieTarget:
        settings.dailyCalorieTarget != null
          ? String(settings.dailyCalorieTarget)
          : "",
    });
  }, [settings]);

  const weightProgress = getWeightProgressPercent(settings);
  const timeProgress = getGoalProgressPercent(settings);
  const configured = isBodyGoalConfigured(settings);
  const goalDateLabel = formatGoalDateLabel(settings.goalDate, locale);

  const save = () => {
    void updateSettings({
      startWeightKg: parseWeightInput(draft.startWeightKg),
      goalWeightKg: parseWeightInput(draft.goalWeightKg),
      currentWeightKg: draft.currentWeightKg.trim()
        ? parseWeightInput(draft.currentWeightKg)
        : null,
      goalDate: parseDateInput(draft.goalDate),
      programStartDate: parseDateInput(draft.programStartDate),
      dailyCalorieTarget: draft.dailyCalorieTarget.trim()
        ? clampDailyCalorieTarget(Number(draft.dailyCalorieTarget))
        : null,
    });
  };

  if (compact) {
    return (
      <div className="border border-primary/25 bg-background/40 p-3 text-xs">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          {t("goal.bodyTitle")}
        </p>
        {configured ? (
          <>
            <p className="mt-1 text-[#e8d5a3]">
              {settings.startWeightKg} → {settings.goalWeightKg} kg
              {settings.currentWeightKg != null &&
                ` · ${t("goal.currentNow", { weight: settings.currentWeightKg })}`}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {t("goal.progressUntil", {
                date: goalDateLabel,
                weightPct: weightProgress,
                timePct: timeProgress,
              })}
            </p>
          </>
        ) : (
          <p className="mt-1 text-muted-foreground">{t("goal.notConfigured")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="mb-4 flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-sm uppercase tracking-widest text-[#e8d5a3]">
          {t("goal.title")}
        </h3>
      </div>

      {!configured && (
        <p className="mb-4 text-xs text-muted-foreground">{t("goal.onboarding")}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            {t("goal.startWeight")}
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder={t("goal.placeholderStart")}
            value={draft.startWeightKg}
            onChange={(e) =>
              setDraft((d) => ({ ...d, startWeightKg: e.target.value }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            {t("goal.goalWeight")}
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder={t("goal.placeholderGoal")}
            value={draft.goalWeightKg}
            onChange={(e) =>
              setDraft((d) => ({ ...d, goalWeightKg: e.target.value }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            {t("goal.currentWeight")}
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder={t("common.optional")}
            value={draft.currentWeightKg}
            onChange={(e) =>
              setDraft((d) => ({ ...d, currentWeightKg: e.target.value }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            {t("goal.programStart")}
          </Label>
          <Input
            type="date"
            value={draft.programStartDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, programStartDate: e.target.value }))
            }
            className="border-primary/30 bg-background/60 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            {t("goal.goalDate")}
          </Label>
          <Input
            type="date"
            value={draft.goalDate}
            onChange={(e) =>
              setDraft((d) => ({ ...d, goalDate: e.target.value }))
            }
            className="border-primary/30 bg-background/60 font-mono text-sm"
          />
        </div>
      </div>

      <div className="mt-4">
        <EatingWindowControl />
      </div>

      <div className="mt-4">
        <DailyCalorieTargetControl />
      </div>

      <MealProtocolSettings />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="font-mono text-xs uppercase tracking-wider"
        >
          {saving ? t("common.saving") : t("goal.saveGoal")}
        </Button>
        <p className="font-mono text-[10px] text-muted-foreground">
          {configured ? (
            t("goal.summaryWeight", {
              pct: weightProgress,
              timePct: timeProgress,
              kcal: settings.dailyCalorieTarget ?? "—",
            })
          ) : (
            t("goal.noGoalSaved")
          )}
        </p>
      </div>
    </div>
  );
}
