"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Clock, Lock, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useCalories } from "@/hooks/use-calories";
import { useEatingWindow } from "@/hooks/use-eating-window";
import { isHabitDone } from "@/lib/habits";
import {
  allMealsComplete,
  countCompletedMeals,
  isEatingWindowClosed,
  MEAL_TASK_KEYS,
} from "@/lib/meals";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import type { MealBlock } from "@/lib/meal-plan-protocol";
import {
  activeMealBlockId,
  buildLocalizedMealBlocks,
} from "@/lib/i18n/meal-plan-blocks";
import { EatingWindowControl } from "@/components/dashboard/EatingWindowControl";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

function MealBlockCard({
  block,
  checked,
  disabled,
  isActive,
  loggedKcal,
  loggedLabels,
  onToggle,
}: {
  block: MealBlock;
  checked: boolean;
  disabled: boolean;
  isActive: boolean;
  loggedKcal: number;
  loggedLabels: { id: string; label: string; calories: number }[];
  onToggle: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const hasLog = loggedLabels.length > 0;
  const [protocolOpen, setProtocolOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setProtocolOpen(true);
  }, [isActive]);

  const protocolBody = (
    <dl className="space-y-2.5 border-t border-primary/10 px-2.5 py-2.5 text-xs">
      <div>
        <dt className="font-mono text-[10px] uppercase text-primary">
          {t("mealPlan.tip")}
        </dt>
        <dd className="mt-0.5 leading-relaxed text-foreground/90">
          {block.protocolTip}
        </dd>
      </div>
      {block.side && (
        <div>
          <dt className="font-mono text-[10px] uppercase text-muted-foreground">
            {t("mealPlan.sideIdeal")}
          </dt>
          <dd className="mt-0.5 text-foreground/85">{block.side}</dd>
        </div>
      )}
      {block.purpose && (
        <div>
          <dt className="font-mono text-[10px] uppercase text-muted-foreground">
            {t("mealPlan.purpose")}
          </dt>
          <dd className="mt-0.5 text-foreground/85">{block.purpose}</dd>
        </div>
      )}
      <div>
        <dt className="font-mono text-[10px] uppercase text-[#e8d5a3]">
          {t("mealPlan.realExamples")}
        </dt>
        <dd className="mt-0.5 leading-relaxed text-foreground/85">
          {block.realExamples}
        </dd>
      </div>
      <div>
        <dt className="font-mono text-[10px] uppercase text-cyan-200/90">
          {t("mealPlan.logHint")}
        </dt>
        <dd className="mt-0.5 leading-relaxed text-foreground/85">
          {block.logHint}
        </dd>
      </div>
      {block.technicalNote && (
        <div className="border-l-2 border-primary/30 pl-2">
          <dt className="font-mono text-[10px] uppercase text-muted-foreground">
            {t("mealPlan.note")}
          </dt>
          <dd className="mt-0.5 italic text-muted-foreground">
            {block.technicalNote}
          </dd>
        </div>
      )}
    </dl>
  );

  if (checked) {
    return (
      <article className="flex items-center gap-3 border border-primary/40 bg-primary/5 px-3 py-2.5 sm:px-4">
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#e8d5a3]">
          <Clock className="h-3 w-3 text-primary" />
          {block.time}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold uppercase tracking-wide text-[#e8d5a3]">
            {block.label}
          </p>
          {hasLog && (
            <p className="truncate font-mono text-[10px] text-emerald-200/90">
              {t("mealPlan.eatenToday", { kcal: loggedKcal })}
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase text-primary">
          <Check className="h-3.5 w-3.5" />
          {t("mealPlan.done")}
        </span>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "border bg-background/30 p-3 transition-colors sm:p-4",
        isActive ? "border-primary/50 ring-1 ring-primary/20" : "border-primary/20",
        disabled && "opacity-75"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#e8d5a3]">
              <Clock className="h-3 w-3 text-primary" />
              {block.time}
            </span>
            {block.optional && (
              <Badge
                variant="outline"
                className="border-primary/30 font-mono text-[10px] uppercase"
              >
                {t("mealPlan.optional")}
              </Badge>
            )}
            {isActive && (
              <span className="font-mono text-[10px] uppercase text-primary">
                {t("mealPlan.upNext")}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-mono text-sm font-semibold uppercase tracking-wide text-[#e8d5a3]">
            {block.label}
          </h3>
          <p
            className={cn(
              "mt-1 text-xs leading-snug text-muted-foreground",
              isActive ? "line-clamp-2" : "line-clamp-1"
            )}
          >
            {block.composition}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {t("mealPlan.estimated")} {block.estimatedKcal}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <Checkbox
            id={`meal-${block.id}`}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(v) => void onToggle(v === true)}
            className="h-5 w-5 rounded-none border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label
            htmlFor={`meal-${block.id}`}
            className={cn(
              "sr-only sm:not-sr-only sm:cursor-pointer sm:font-mono sm:text-[10px] sm:uppercase sm:tracking-widest",
              disabled
                ? "sm:cursor-not-allowed sm:text-muted-foreground"
                : "sm:text-[#e8d5a3]"
            )}
          >
            {t("mealPlan.done")}
          </Label>
        </div>
      </div>

      {hasLog ? (
        <div className="mt-2 rounded border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5">
          <p className="font-mono text-[10px] uppercase text-emerald-200/90">
            {t("mealPlan.eatenToday", { kcal: loggedKcal })}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-foreground/80">
            {loggedLabels
              .slice(0, 2)
              .map((e) => `${e.label} (${e.calories})`)
              .join(" · ")}
            {loggedLabels.length > 2 ? " …" : ""}
          </p>
        </div>
      ) : (
        isActive && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("mealPlan.nothingLoggedShort")}
          </p>
        )
      )}

      {isActive ? (
        <details
          className="group mt-2 rounded border border-primary/15 bg-background/25"
          open={protocolOpen}
          onToggle={(e) =>
            setProtocolOpen((e.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider text-primary marker:content-none [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
            {t("mealPlan.showProtocol")}
          </summary>
          {protocolBody}
        </details>
      ) : (
        <button
          type="button"
          onClick={() => setProtocolOpen((open) => !open)}
          className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary/80 hover:text-primary"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              protocolOpen && "rotate-180"
            )}
          />
          {protocolOpen ? t("common.collapse") : t("mealPlan.showProtocol")}
        </button>
      )}

      {!isActive && protocolOpen && (
        <div className="mt-1 rounded border border-primary/15 bg-background/25">
          {protocolBody}
        </div>
      )}
    </article>
  );
}

export function MealPlan() {
  const { tasks, toggleMeal, syncing, loading } = useDailyTracker();
  const { logs, mealCalories } = useCalories();
  const { window: eatingWindow, label, rangeLabel } = useEatingWindow();
  const { t } = useI18n();
  const [windowClosed, setWindowClosed] = useState(false);

  const mealBlocks = useMemo(
    () => (eatingWindow ? buildLocalizedMealBlocks(eatingWindow, t) : []),
    [eatingWindow, t]
  );

  useEffect(() => {
    const update = () =>
      setWindowClosed(
        eatingWindow ? isEatingWindowClosed(eatingWindow) : false
      );
    update();
    const id = globalThis.window.setInterval(update, 60_000);
    return () => globalThis.window.clearInterval(id);
  }, [eatingWindow]);

  const mealsDone = countCompletedMeals(tasks);
  const allDone = allMealsComplete(tasks);
  const fastingDone = isHabitDone(tasks, "fasting");
  const mealProgress = Math.round((mealsDone / MEAL_TASK_KEYS.length) * 100);
  const isFastingDay = tasks.is_fasting_day;

  const canToggleMeal = (checked: boolean) =>
    !isFastingDay &&
    !loading &&
    !syncing &&
    (!windowClosed || checked);

  const openBlockId = useMemo(
    () =>
      activeMealBlockId(mealBlocks, tasks, windowClosed, isFastingDay),
    [mealBlocks, tasks, windowClosed, isFastingDay]
  );

  return (
    <Card className="harvin-panel border-0 shadow-none">
      <CardHeader className="border-b border-primary/20 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/40 bg-background/80">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {APP_MODULE_PREFIX} · {t("mealPlan.modulePrefix")}
              </p>
              <CardTitle className="mt-1 font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                {t("mealPlan.title")}
              </CardTitle>
              <details className="mt-2">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary">
                  {t("mealPlan.aboutProtocol")}
                </summary>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t("mealPlan.headline")} — {t("mealPlan.goal")}
                </p>
              </details>
            </div>
          </div>

          <div className="min-w-[180px] space-y-2 sm:text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {label} · {rangeLabel}
            </p>
            <p
              className={cn(
                "font-mono text-lg font-bold tabular-nums",
                fastingDone ? "text-[#e8d5a3]" : "text-muted-foreground"
              )}
            >
              {fastingDone ? "100 %" : `${mealProgress} %`}
            </p>
            <Progress value={mealProgress} className="h-1.5 bg-muted" />
            <p className="text-xs text-muted-foreground">
              {t("mealPlan.mealsProgress", {
                done: mealsDone,
                total: MEAL_TASK_KEYS.length,
              })}{" "}
              ·{" "}
              {fastingDone
                ? t("mealPlan.windowComplete")
                : t("mealPlan.finishAll")}
            </p>
          </div>
        </div>

        <EatingWindowControl compact />

        {isFastingDay && (
          <div className="mt-4 flex items-start gap-2 border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-200/90">
              {t("mealPlan.fastingDay")}
            </p>
          </div>
        )}

        {windowClosed && !isFastingDay && (
          <div
            className="mt-4 flex items-start gap-2 border border-primary/30 bg-primary/5 px-3 py-2.5"
            role="status"
          >
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="font-mono text-xs uppercase tracking-wider text-[#e8d5a3]">
              {t("mealPlan.windowClosed")}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-6">
        {!eatingWindow && (
          <p className="text-sm text-muted-foreground">
            {t("mealPlan.unsetWindow")}
          </p>
        )}
        {mealBlocks.map((block) => {
          const checked = tasks[block.taskKey];
          const disabled = !canToggleMeal(checked);
          const logged = logs.filter((l) => l.meal_key === block.taskKey);

          return (
            <MealBlockCard
              key={block.id}
              block={block}
              checked={checked}
              disabled={disabled}
              isActive={block.id === openBlockId}
              loggedKcal={mealCalories(block.taskKey)}
              loggedLabels={logged}
              onToggle={(v) => void toggleMeal(block.taskKey, v)}
            />
          );
        })}

        {allDone && !windowClosed && (
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-primary">
            {t("mealPlan.allMealsDone", { label })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
