"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Lock, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { isHabitDone } from "@/lib/habits";
import {
  allMealsComplete,
  countCompletedMeals,
  isEatingWindowClosed,
  MEAL_TASK_KEYS,
} from "@/lib/meals";
import { APP_MODULE_PREFIX } from "@/lib/brand";
import {
  MEAL_PLAN_BLOCKS,
  MEAL_PLAN_GOAL,
  MEAL_PLAN_HEADLINE,
  MEAL_PLAN_TITLE,
} from "@/lib/meal-plan-protocol";
import { cn } from "@/lib/utils";

const WINDOW_CLOSED_MSG =
  "Okno uzavreté – systém v režime regenerácie";

export function MealPlan() {
  const { tasks, toggleMeal, syncing, loading } = useDailyTracker();
  const [windowClosed, setWindowClosed] = useState(false);

  useEffect(() => {
    const update = () => setWindowClosed(isEatingWindowClosed());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

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

  return (
    <Card className="harvin-panel border-0 shadow-none">
      <CardHeader className="border-b border-primary/20 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/40 bg-background/80">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {APP_MODULE_PREFIX} · Stravovanie
              </p>
              <CardTitle className="mt-1 font-mono text-base uppercase tracking-widest text-[#e8d5a3]">
                {MEAL_PLAN_TITLE}
              </CardTitle>
              <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                {MEAL_PLAN_HEADLINE}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {MEAL_PLAN_GOAL}
              </p>
            </div>
          </div>

          <div className="min-w-[200px] space-y-2 sm:text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              16:8 okno · dnes
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
              {mealsDone}/{MEAL_TASK_KEYS.length} jedál ·{" "}
              {fastingDone ? "okno splnené" : "dokonči všetky položky"}
            </p>
          </div>
        </div>

        {isFastingDay && (
          <div className="mt-4 flex items-start gap-2 border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-200/90">
              Fasting deň — jedlá sa nezapočítavajú. Kalórie rieš v záložke
              KALÓRIE.
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
              {WINDOW_CLOSED_MSG}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        {MEAL_PLAN_BLOCKS.map((block) => {
          const checked = tasks[block.taskKey];
          const disabled = !canToggleMeal(checked);

          return (
            <article
              key={block.id}
              className={cn(
                "border bg-background/30 p-4 transition-colors sm:p-5",
                checked
                  ? "border-primary/50 bg-primary/5"
                  : "border-primary/20",
                disabled && !checked && "opacity-75"
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-[#e8d5a3]">
                    <Clock className="h-3 w-3 text-primary" />
                    {block.time}
                  </span>
                  {block.optional && (
                    <Badge
                      variant="outline"
                      className="border-primary/30 font-mono text-[10px] uppercase tracking-wider"
                    >
                      Voliteľné
                    </Badge>
                  )}
                  {checked && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                      <Check className="h-3 w-3" />
                      Splnené
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`meal-${block.id}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      void toggleMeal(block.taskKey, v === true)
                    }
                    className="h-5 w-5 rounded-none border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <Label
                    htmlFor={`meal-${block.id}`}
                    className={cn(
                      "cursor-pointer font-mono text-[10px] uppercase tracking-widest",
                      disabled && !checked
                        ? "cursor-not-allowed text-muted-foreground"
                        : "text-[#e8d5a3]"
                    )}
                  >
                    Splnené
                  </Label>
                </div>
              </div>

              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-[#e8d5a3]">
                {block.label}
              </h3>

              <dl className="mt-3 space-y-2.5 text-sm">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Zloženie
                  </dt>
                  <dd className="mt-0.5 leading-relaxed text-foreground/90">
                    {block.composition}
                  </dd>
                </div>

                {block.side && (
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-primary">
                      Príloha
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-foreground/90">
                      {block.side}
                    </dd>
                  </div>
                )}

                {block.purpose && (
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-primary">
                      Účel
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-muted-foreground">
                      {block.purpose}
                    </dd>
                  </div>
                )}

                {block.technicalNote && (
                  <div className="border-l-2 border-primary/35 pl-3 pt-1">
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-[#e8d5a3]">
                      Technická poznámka
                    </dt>
                    <dd className="mt-1 text-sm italic leading-relaxed text-muted-foreground">
                      {block.technicalNote}
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          );
        })}

        {allDone && !windowClosed && (
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-primary">
            Všetky jedlá splnené · 16:8 zapísané v progrese
          </p>
        )}
      </CardContent>
    </Card>
  );
}
