"use client";

import {
  Check,
  Clock,
  Droplets,
  Dumbbell,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { HydrationControls } from "@/components/dashboard/hydration-controls";
import { useHydration } from "@/hooks/use-hydration";
import { useEatingWindow } from "@/hooks/use-eating-window";
import {
  HYDRATION_MILESTONE_ML,
  hydrationProgressPercent,
  isHydrationMilestoneDone,
  mlToLiters,
  type HydrationMilestoneKey,
} from "@/lib/hydration";
import {
  type DailyTaskKey,
  countCompletedTasks,
  calculateCompletion,
  TOTAL_DAILY_TASKS,
} from "@/lib/types";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface TaskItemProps {
  id: DailyTaskKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function TaskItem({
  id,
  label,
  description,
  icon,
  checked,
  onCheckedChange,
}: TaskItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3.5 transition-colors hover:border-border sm:gap-4 sm:p-4">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div className="flex flex-1 items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="space-y-1">
          <Label
            htmlFor={id}
            className="cursor-pointer font-mono text-sm uppercase tracking-wide"
          >
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

const HYDRATION_MILESTONES: {
  key: HydrationMilestoneKey;
  label: string;
  ml: number;
}[] = [
  { key: "hydration_1l", label: "1L", ml: HYDRATION_MILESTONE_ML.hydration_1l },
  { key: "hydration_2l", label: "2L", ml: HYDRATION_MILESTONE_ML.hydration_2l },
  {
    key: "hydration_3l",
    label: "3,5L",
    ml: HYDRATION_MILESTONE_ML.hydration_3l,
  },
];

function HydrationCompactRow() {
  const { totalMl, goalMl, addWater, saving, loading, lastError } = useHydration();
  const { tasks, toggleTask } = useDailyTracker();
  const { t } = useI18n();
  const percent = hydrationProgressPercent(totalMl, goalMl);

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-sm uppercase tracking-wide">
            {t("tracker.hydration")}
          </span>
        </div>
        <span className="font-mono text-sm tabular-nums text-cyan-200">
          {mlToLiters(totalMl, 1)} / {mlToLiters(goalMl, 1)} L
        </span>
      </div>
      <Progress value={percent} className="mt-3 h-1.5" />
      <div className="mt-4">
        <HydrationControls
          compact
          onAdd={addWater}
          disabled={saving || loading}
          error={lastError}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {HYDRATION_MILESTONES.map((m) => {
          const manual = tasks[m.key];
          const autoMet = totalMl >= m.ml;
          const active = isHydrationMilestoneDone(m.key, tasks, totalMl);
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={active}
              onClick={() => void toggleTask(m.key, !manual)}
              className={cn(
                "inline-flex min-h-[32px] items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-200",
                manual &&
                  "border-cyan-400 bg-cyan-500/30 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.35)] ring-1 ring-cyan-400/50",
                !manual &&
                  autoMet &&
                  "border-cyan-500/45 bg-cyan-500/15 text-cyan-100",
                !active &&
                  "border-primary/20 bg-background/50 text-muted-foreground hover:border-cyan-500/35 hover:bg-cyan-500/10 hover:text-cyan-100"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  manual
                    ? "border-cyan-300 bg-cyan-400 text-background"
                    : autoMet
                      ? "border-cyan-400/70 bg-cyan-500/40"
                      : "border-muted-foreground/40 bg-muted-foreground/20"
                )}
              >
                {(manual || autoMet) && (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                )}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("tracker.hydrationHint")}
      </p>
    </div>
  );
}

export function DailyTracker() {
  const {
    tasks,
    toggleTask,
    loading,
    syncing,
  } = useDailyTracker();
  const { totalMl } = useHydration();
  const { label, rangeLabel, fastingLabel } = useEatingWindow();
  const { t } = useI18n();

  // Derive completion from both manual task flags AND actual water logged —
  // this keeps the counter correct regardless of any async flag-sync timing.
  const { completedCount, completion, totalTasks } = useMemo(() => {
    const effectiveTasks = {
      ...tasks,
      hydration_1l: tasks.hydration_1l || totalMl >= HYDRATION_MILESTONE_ML.hydration_1l,
      hydration_2l: tasks.hydration_2l || totalMl >= HYDRATION_MILESTONE_ML.hydration_2l,
      hydration_3l: tasks.hydration_3l || totalMl >= HYDRATION_MILESTONE_ML.hydration_3l,
    };
    return {
      completedCount: countCompletedTasks(effectiveTasks),
      completion: calculateCompletion(effectiveTasks),
      totalTasks: TOTAL_DAILY_TASKS,
    };
  }, [tasks, totalMl]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("tracker.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm text-muted-foreground">
            {t("tracker.loading")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <CardTitle>{t("tracker.title")}</CardTitle>
            <CardDescription className="mt-1">
              {t("tracker.consistency")}
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">
              {completion}%
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {t("tracker.tasksProgress", {
                done: completedCount,
                total: totalTasks,
              })}
              {syncing && t("tracker.syncing")}
            </p>
          </div>
        </div>
        <Progress value={completion} className="mt-4 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-3">
        <TaskItem
          id="fasting_window"
          label={t("tracker.windowLabel", { label })}
          description={t("tracker.eatingOnly", { range: rangeLabel })}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          checked={tasks.fasting_window}
          onCheckedChange={(v) => toggleTask("fasting_window", v)}
        />
        <HydrationCompactRow />
        <TaskItem
          id="training_done"
          label={t("tracker.trainingToday")}
          description={t("tracker.trainingHint")}
          icon={<Dumbbell className="h-4 w-4" />}
          checked={tasks.training_done}
          onCheckedChange={(v) => toggleTask("training_done", v)}
        />
        <div className="industrial-divider mt-4" />
        <div className="flex items-center gap-2 pt-2 font-mono text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{t("tracker.fasting", { label: fastingLabel })}</span>
          <Sun className="ml-auto h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}
