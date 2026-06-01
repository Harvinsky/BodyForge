"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyGoal } from "@/hooks/use-body-goal";
import {
  formatGoalDateLabel,
  getWeightProgressPercent,
  parseDateInput,
  parseWeightInput,
} from "@/lib/body-goal";
import { getGoalProgressPercent } from "@/lib/goal";

export function BodyGoalPanel({ compact = false }: { compact?: boolean }) {
  const { settings, saving, updateSettings } = useBodyGoal();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const weightProgress = getWeightProgressPercent(settings);
  const timeProgress = getGoalProgressPercent(settings);

  const save = () => {
    void updateSettings({
      startWeightKg:
        parseWeightInput(String(draft.startWeightKg)) ?? settings.startWeightKg,
      goalWeightKg:
        parseWeightInput(String(draft.goalWeightKg)) ?? settings.goalWeightKg,
      currentWeightKg: draft.currentWeightKg
        ? parseWeightInput(String(draft.currentWeightKg))
        : null,
      goalDate: parseDateInput(draft.goalDate) ?? settings.goalDate,
      programStartDate:
        parseDateInput(draft.programStartDate) ?? settings.programStartDate,
      dailyCalorieTarget: Math.min(
        6000,
        Math.max(1200, Number(draft.dailyCalorieTarget) || 2000)
      ),
    });
  };

  if (compact) {
    return (
      <div className="border border-primary/25 bg-background/40 p-3 text-xs">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Cieľ tela
        </p>
        <p className="mt-1 text-[#e8d5a3]">
          {settings.startWeightKg} → {settings.goalWeightKg} kg
          {settings.currentWeightKg != null &&
            ` · teraz ${settings.currentWeightKg} kg`}
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Do {formatGoalDateLabel(settings.goalDate)} · váha {weightProgress}%
          · čas {timeProgress}%
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="mb-4 flex items-center gap-2">
        <Scale className="h-4 w-4 text-primary" />
        <h3 className="font-mono text-sm uppercase tracking-widest text-[#e8d5a3]">
          Môj cieľ · BodyForge
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            Počiatočná váha (kg)
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.startWeightKg}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                startWeightKg: Number(e.target.value) || 0,
              }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            Cieľová váha (kg)
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            value={draft.goalWeightKg}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                goalWeightKg: Number(e.target.value) || 0,
              }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            Aktuálna váha (kg)
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="voliteľné"
            value={draft.currentWeightKg ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                currentWeightKg: e.target.value
                  ? Number(e.target.value)
                  : null,
              }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            Začiatok programu
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
            Dátum cieľa
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
        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider">
            Denný limit kalórií (kcal)
          </Label>
          <Input
            type="number"
            min={1200}
            max={6000}
            value={draft.dailyCalorieTarget}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                dailyCalorieTarget: Number(e.target.value) || 2000,
              }))
            }
            className="border-primary/30 bg-background/60 font-mono"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="font-mono text-xs uppercase tracking-wider"
        >
          {saving ? "Ukladám…" : "Uložiť cieľ"}
        </Button>
        <p className="font-mono text-[10px] text-muted-foreground">
          Váha {weightProgress}% · časový plán {timeProgress}% · deficit podľa
          limitu {settings.dailyCalorieTarget} kcal
        </p>
      </div>
    </div>
  );
}
