"use client";

import { useState } from "react";
import { Droplets, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalorieLogList } from "@/components/dashboard/calorie-log-list";
import { CircularGauge } from "@/components/dashboard/circular-gauge";
import { FoodCaloriePicker } from "@/components/dashboard/food-calorie-picker";
import { useCalories } from "@/hooks/use-calories";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function CalorieTracker({ embedded = false }: { embedded?: boolean }) {
  const {
    logs,
    status,
    isFastingDay,
    loading,
    saving,
    addEntry,
    removeEntry,
    setFastingDay,
  } = useCalories();
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const inputsDisabled = saving || loading || isFastingDay;

  const handleCustom = async () => {
    const calories = Number(kcal);
    if (!label.trim() || calories <= 0) return;
    setAddError(null);
    const ok = await addEntry(label.trim(), Math.round(calories));
    if (!ok) {
      setAddError("Počas fasting dňa nie je možné pridávať jedlo.");
      return;
    }
    setLabel("");
    setKcal("");
  };

  const gaugeCenter = status.isFastingDay
    ? status.fastingValid
      ? "Fasting"
      : "Porušené"
    : status.inDeficit
      ? "Deficit"
      : "Prekročené";

  const gaugeVariant = status.isFastingDay
    ? status.fastingValid
      ? "emerald"
      : "gold"
    : status.inDeficit
      ? "emerald"
      : "gold";

  return (
    <Card
      className={cn(
        "overflow-hidden",
        embedded ? "border-0 bg-transparent shadow-none" : "harvin-panel"
      )}
    >
      <CardHeader className="border-b border-primary/20 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/40 bg-primary/10">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {APP_MODULE_PREFIX} · Energia
              </p>
              <CardTitle className="mt-1 font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                Kalórie dnes
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Denný limit <strong>{status.target} kcal</strong> (nastavíš v
                Môj cieľ) · presný výpočet z kalorickej tabuľky
              </p>
            </div>
          </div>
          {!loading && (
            <CircularGauge
              value={
                status.isFastingDay
                  ? status.fastingValid
                    ? 0
                    : Math.min(100, status.percentOfTarget)
                  : Math.min(100, status.percentOfTarget)
              }
              label="Príjem"
              size={120}
              variant={gaugeVariant}
              center="text"
              centerText={gaugeCenter}
              sublabel={`${status.consumed} kcal`}
            />
          )}
        </div>

        <div
          className={cn(
            "mt-3 flex items-center justify-between gap-3 border px-3 py-2",
            isFastingDay
              ? "border-cyan-500/40 bg-cyan-500/10"
              : "border-primary/20 bg-background/40"
          )}
        >
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-400" />
            <Label
              htmlFor="fasting-day"
              className="cursor-pointer font-mono text-xs uppercase tracking-wider"
            >
              Fasting deň (iba voda)
            </Label>
          </div>
          <Switch
            id="fasting-day"
            checked={isFastingDay}
            disabled={saving || loading}
            onCheckedChange={(v) => void setFastingDay(v)}
          />
        </div>

        <div
          className={cn(
            "mt-3 border px-3 py-2 font-mono text-xs tracking-wide",
            status.isFastingDay
              ? status.fastingValid
                ? "border-emerald-500/40 bg-emerald-500/10 text-[#6ee7b7]"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : status.inDeficit
                ? "border-emerald-500/40 bg-emerald-500/10 text-[#6ee7b7]"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          )}
        >
          {status.statusMessage}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        {isFastingDay ? (
          <p className="border border-dashed border-cyan-500/30 px-3 py-4 text-center font-mono text-xs uppercase tracking-wider text-cyan-200/90">
            Režim fasting — pridávanie jedla a kalorická tabuľka sú vypnuté.
            Vypni prepínač, ak začínaš jesť.
          </p>
        ) : (
          <>
            <FoodCaloriePicker
              disabled={inputsDisabled}
              onAdd={async (l, c) => {
                setAddError(null);
                const ok = await addEntry(l, c);
                if (!ok) setAddError("Nepodarilo sa pridať zápis.");
              }}
            />

            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Vlastný zápis
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Názov"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={inputsDisabled}
                className="max-w-[180px] border-primary/30 bg-background/60 font-mono text-sm"
              />
              <Input
                type="number"
                placeholder="kcal"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCustom()}
                disabled={inputsDisabled}
                className="w-24 border-primary/30 bg-background/60 font-mono text-sm"
              />
              <Button
                type="button"
                disabled={inputsDisabled}
                onClick={() => void handleCustom()}
                className="font-mono text-xs uppercase tracking-wider"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pridať"
                )}
              </Button>
            </div>
          </>
        )}

        {addError && (
          <p className="text-xs text-destructive">{addError}</p>
        )}

        <CalorieLogList
          logs={logs}
          onRemove={(id) => void removeEntry(id)}
          disabled={saving || loading}
        />
      </CardContent>
    </Card>
  );
}
