"use client";

import { useEffect, useState } from "react";
import { Droplets, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalorieLogList } from "@/components/dashboard/calorie-log-list";
import { CircularGauge } from "@/components/dashboard/circular-gauge";
import { FoodCaloriePicker } from "@/components/dashboard/food-calorie-picker";
import { DailyCalorieTargetControl } from "@/components/dashboard/daily-calorie-target-control";
import { useCalories } from "@/hooks/use-calories";
import { useEatingWindow } from "@/hooks/use-eating-window";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import {
  formatCalorieStatusMessage,
} from "@/lib/i18n/calories-ui";
import { inferMealKeyFromBlocks } from "@/lib/meal-calorie-link";
import type { MealTaskKey } from "@/lib/meals";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

export function CalorieTracker({ embedded = false }: { embedded?: boolean }) {
  const {
    logs,
    totalCalories,
    caloriesBurned,
    netCalories,
    status,
    isFastingDay,
    loading,
    saving,
    addEntry,
    addMealEntries,
    removeEntry,
    setFastingDay,
  } = useCalories();
  const { mealBlocks } = useEatingWindow();
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [customMeal, setCustomMeal] = useState<MealTaskKey>("meal_1_done");

  useEffect(() => {
    if (mealBlocks.length > 0) {
      setCustomMeal(inferMealKeyFromBlocks(mealBlocks));
    }
  }, [mealBlocks]);
  const [addError, setAddError] = useState<string | null>(null);

  const inputsDisabled = saving || loading || isFastingDay;
  const statusMessage = formatCalorieStatusMessage(status, t);

  const handleCustom = async () => {
    const calories = Number(kcal);
    if (!label.trim() || calories <= 0) return;
    setAddError(null);
    const proteinVal = protein.trim() ? Number(protein) : null;
    const fatVal = fat.trim() ? Number(fat) : null;
    const carbsVal = carbs.trim() ? Number(carbs) : null;
    const ok = await addEntry(label.trim(), Math.round(calories), customMeal, {
      protein_g: proteinVal && proteinVal > 0 ? proteinVal : null,
      fat_g: fatVal && fatVal > 0 ? fatVal : null,
      carbs_g: carbsVal && carbsVal > 0 ? carbsVal : null,
    });
    if (!ok) {
      setAddError(t("calories.fastingBlockError"));
      return;
    }
    setLabel("");
    setKcal("");
    setProtein("");
    setFat("");
    setCarbs("");
  };

  const gaugeCenter = status.isFastingDay
    ? status.fastingValid
      ? t("common.fasting")
      : t("calories.violated")
    : status.inDeficit
      ? t("common.deficit")
      : t("calories.exceededLabel");

  const gaugeVariant = status.isFastingDay
    ? status.fastingValid
      ? "emerald"
      : "gold"
    : status.inDeficit
      ? "emerald"
      : "rose";

  const gaugeSublabel = status.isFastingDay
    ? `${status.consumed} kcal`
    : status.inDeficit
      ? `${status.deficit} kcal · ${status.consumed}/${status.target}`
      : `+${status.overBy} kcal · ${status.consumed}/${status.target}`;

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
                {APP_MODULE_PREFIX} · {t("calories.moduleEnergy")}
              </p>
              <CardTitle className="mt-1 font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                {t("calories.titleToday")}
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("calories.limitGaugeHint", { target: status.target })}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {t("calories.netFormula", {
                  intake: totalCalories,
                  burned: caloriesBurned,
                  net: netCalories,
                })}
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
              label={t("calories.intake")}
              size={120}
              variant={gaugeVariant}
              center="text"
              centerText={gaugeCenter}
              over={!status.isFastingDay && status.overTarget}
              sublabel={gaugeSublabel}
            />
          )}
        </div>

        <DailyCalorieTargetControl compact />

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
              {t("calories.fastingDaySwitch")}
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
          {statusMessage}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        {isFastingDay ? (
          <p className="border border-dashed border-cyan-500/30 px-3 py-4 text-center font-mono text-xs uppercase tracking-wider text-cyan-200/90">
            {t("calories.fastingModeDisabled")}
          </p>
        ) : (
          <>
            <FoodCaloriePicker
              mealBlocks={mealBlocks}
              disabled={inputsDisabled}
              onAddEntry={async (l, c, mealKey, macros) => {
                setAddError(null);
                const ok = await addEntry(l, c, mealKey, {
                  protein_g: macros?.protein ?? null,
                  fat_g: macros?.fat ?? null,
                  carbs_g: macros?.carbs ?? null,
                });
                if (!ok) setAddError(t("calories.addEntryError"));
              }}
              onAddMeal={async (items, mealKey) => {
                setAddError(null);
                const ok = await addMealEntries(items, mealKey);
                if (!ok) setAddError(t("calories.saveMealError"));
                return ok;
              }}
            />

            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("calories.customEntry")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={customMeal}
                onChange={(e) => setCustomMeal(e.target.value as MealTaskKey)}
                disabled={inputsDisabled}
                className="h-9 rounded-md border border-primary/30 bg-background/60 px-2 font-mono text-[10px] uppercase"
              >
                <option value="meal_1_done">{t("common.meal1")}</option>
                <option value="meal_snack_done">{t("common.snack")}</option>
                <option value="meal_2_done">{t("common.meal2")}</option>
              </select>
              <Input
                placeholder={t("calories.namePlaceholder")}
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
            </div>
            {/* Optional macro inputs — P / F / C */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("calories.macrosOptional")}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">P</span>
                <Input
                  type="number"
                  placeholder="0g"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  disabled={inputsDisabled}
                  className="w-16 border-emerald-500/30 bg-background/60 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">F</span>
                <Input
                  type="number"
                  placeholder="0g"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  disabled={inputsDisabled}
                  className="w-16 border-amber-500/30 bg-background/60 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-400">C</span>
                <Input
                  type="number"
                  placeholder="0g"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleCustom()}
                  disabled={inputsDisabled}
                  className="w-16 border-sky-500/30 bg-background/60 font-mono text-sm"
                />
              </div>
              <Button
                type="button"
                disabled={inputsDisabled}
                onClick={() => void handleCustom()}
                className="font-mono text-xs uppercase tracking-wider"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.add")
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
