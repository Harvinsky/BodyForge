"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dumbbell, Footprints, Loader2, Plus, RefreshCw, Timer, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { bcp47Tag } from "@/lib/i18n/detect";
import { useI18n } from "@/providers/locale-provider";
import { withTimeout } from "@/lib/fetch-timeout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAppUser } from "@/hooks/use-app-user";
import { useBodyGoal } from "@/hooks/use-body-goal";
import { getEffectiveWeightKg } from "@/lib/body-goal";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useDeviceSteps } from "@/hooks/use-device-steps";
import {
  DEFAULT_DAILY_STEP_GOAL,
  estimatedKcalFromSteps,
  paceLabelBySteps,
} from "@/lib/activity-metrics";
import { notifyActivityUpdated } from "@/lib/activity-storage";
import { estimatedKcalFromTrainingSession } from "@/lib/activity-burn";
import {
  DAILY_TRAINING_GOAL_MIN,
  formatTrainingDuration,
  parseDurationInput,
  TRAINING_BURN_LEGEND,
  TRAINING_PRESETS,
  trainingBurnRateForActivity,
} from "@/lib/training-presets";
import { cn } from "@/lib/utils";

type TrainingEntry = {
  id: string;
  activity: string;
  duration_minutes: number;
  logged_at: string;
};

type DailyActivityMetrics = {
  steps: number;
  calories_burned_manual: number;
  calories_burned_estimated: number;
  notes: string;
};

const LOCAL_PREFIX = "bodyforge-training-log-";
const LOCAL_ACTIVITY_PREFIX = "bodyforge-activity-metrics-";

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

function localKey(userId: string | null, logDate: string): string {
  return `${LOCAL_PREFIX}${localScope(userId)}:${logDate}`;
}

function localActivityKey(userId: string | null, logDate: string): string {
  return `${LOCAL_ACTIVITY_PREFIX}${localScope(userId)}:${logDate}`;
}

function loadLocalEntries(userId: string | null, logDate: string): TrainingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKey(userId, logDate));
    if (raw) return JSON.parse(raw) as TrainingEntry[];
  } catch {
    // ignore
  }
  return [];
}

function loadLocalActivity(
  userId: string | null,
  logDate: string
): DailyActivityMetrics {
  const empty = {
    steps: 0,
    calories_burned_manual: 0,
    calories_burned_estimated: 0,
    notes: "",
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(localActivityKey(userId, logDate));
    if (raw) return { ...empty, ...(JSON.parse(raw) as Partial<DailyActivityMetrics>) };
  } catch {
    // ignore
  }
  return empty;
}

function saveLocalEntries(
  userId: string | null,
  logDate: string,
  entries: TrainingEntry[]
): void {
  localStorage.setItem(localKey(userId, logDate), JSON.stringify(entries));
}

function saveLocalActivity(
  userId: string | null,
  logDate: string,
  activity: DailyActivityMetrics
): void {
  localStorage.setItem(localActivityKey(userId, logDate), JSON.stringify(activity));
}

function MetricBar({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-xs text-[#e8d5a3]">{detail}</span>
      </div>
      <Progress value={Math.min(100, value)} className="h-2" />
    </div>
  );
}

export function TrainingTracker({ embedded = false }: { embedded?: boolean }) {
  const { userId, authReady } = useAppUser();
  const { settings } = useBodyGoal();
  const { tasks, toggleTask } = useDailyTracker();
  const { t, locale, dateLocale } = useI18n();
  const numberLocale = bcp47Tag(locale);
  const supabase = useMemo(() => createClient(), []);
  const logDate = format(new Date(), "yyyy-MM-dd");

  const [entries, setEntries] = useState<TrainingEntry[]>([]);
  const [customActivity, setCustomActivity] = useState("");
  const [customHours, setCustomHours] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [stepsInput, setStepsInput] = useState("0");
  const [manualSteps, setManualSteps] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const markTrainingDone = useCallback(async () => {
    if (!tasks.training_done) {
      await toggleTask("training_done", true);
    }
  }, [tasks.training_done, toggleTask]);

  const applySteps = useCallback((next: number) => {
    setStepsInput(String(next));
  }, []);

  const { sync: syncSteps, syncing: syncingSteps, message: stepMessage, lastSync } =
    useDeviceSteps(applySteps);

  const loadEntries = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);

    if (userId && isSupabaseConfigured()) {
      const { data, error } = await withTimeout(
        supabase
          .from("training_logs")
          .select("id, activity, duration_minutes, logged_at")
          .eq("user_id", userId)
          .eq("log_date", logDate)
          .order("logged_at", { ascending: true }),
        8_000
      ).catch(() => ({ data: null, error: { message: "timeout" } }));

      if (!error && data) {
        setEntries(data as TrainingEntry[]);
        saveLocalEntries(userId, logDate, data as TrainingEntry[]);
        if (data.length > 0) await markTrainingDone();
      } else {
        const local = loadLocalEntries(userId, logDate);
        setEntries(local);
        if (local.length > 0) await markTrainingDone();
      }

      const { data: activityData } = await withTimeout(
        supabase
          .from("daily_activity_metrics")
          .select("steps, calories_burned_manual, calories_burned_estimated, notes")
          .eq("user_id", userId)
          .eq("log_date", logDate)
          .maybeSingle(),
        6_000
      ).catch(() => ({ data: null }));

      if (activityData) {
        setStepsInput(String(activityData.steps ?? 0));
        setNotes(activityData.notes ?? "");
        saveLocalActivity(userId, logDate, {
          steps: Number(activityData.steps ?? 0),
          calories_burned_manual: Number(activityData.calories_burned_manual ?? 0),
          calories_burned_estimated: Number(
            activityData.calories_burned_estimated ?? 0
          ),
          notes: activityData.notes ?? "",
        });
      } else {
        const localActivity = loadLocalActivity(userId, logDate);
        setStepsInput(String(localActivity.steps));
        setNotes(localActivity.notes);
      }
    } else {
      const local = loadLocalEntries(userId, logDate);
      setEntries(local);
      if (local.length > 0) await markTrainingDone();
      const localActivity = loadLocalActivity(userId, logDate);
      setStepsInput(String(localActivity.steps));
      setNotes(localActivity.notes);
    }

    setLoading(false);
  }, [authReady, logDate, markTrainingDone, supabase, userId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const trainingPercent = Math.min(
    100,
    Math.round((totalMinutes / DAILY_TRAINING_GOAL_MIN) * 100)
  );
  const steps = Math.min(100_000, Math.max(0, Number(stepsInput) || 0));
  const weightKg = getEffectiveWeightKg(settings) ?? 0;
  const estimatedFromSteps = estimatedKcalFromSteps(steps);
  const estimatedFromTraining = entries.reduce(
    (sum, entry) =>
      sum +
      estimatedKcalFromTrainingSession(
        entry.activity,
        entry.duration_minutes,
        weightKg
      ),
    0
  );
  const totalBurned = estimatedFromSteps + estimatedFromTraining;
  const stepGoalPercent = Math.min(
    100,
    Math.round((steps / DEFAULT_DAILY_STEP_GOAL) * 100)
  );

  const persistActivityMetrics = useCallback(
    async (nextSteps: number, nextNotes?: string) => {
      const payload: DailyActivityMetrics = {
        steps: nextSteps,
        calories_burned_manual: 0,
        calories_burned_estimated: totalBurned,
        notes: (nextNotes ?? notes).trim(),
      };

      saveLocalActivity(userId, logDate, payload);

      if (!userId || !isSupabaseConfigured()) {
        notifyActivityUpdated();
        return;
      }
      await supabase.from("daily_activity_metrics").upsert(
        {
          user_id: userId,
          log_date: logDate,
          ...payload,
        },
        { onConflict: "user_id,log_date" }
      );
      notifyActivityUpdated();
    },
    [logDate, notes, supabase, totalBurned, userId]
  );

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      void persistActivityMetrics(steps);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [loading, persistActivityMetrics, steps, totalMinutes]);

  const insertEntry = useCallback(
    async (activityName: string, duration: number) => {
      if (duration <= 0 || duration > 24 * 60) return;
      const safeActivity = activityName.trim().slice(0, 100) || "Activity";

      setSaving(true);
      const loggedAt = new Date().toISOString();
      const localEntry: TrainingEntry = {
        id: crypto.randomUUID(),
        activity: safeActivity,
        duration_minutes: duration,
        logged_at: loggedAt,
      };

      if (userId && isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from("training_logs")
          .insert({
            user_id: userId,
            activity: safeActivity,
            duration_minutes: duration,
            logged_at: loggedAt,
            log_date: logDate,
          })
          .select("id, activity, duration_minutes, logged_at")
          .single();

        if (!error && data) {
          const next = [...entries, data as TrainingEntry];
          setEntries(next);
          saveLocalEntries(userId, logDate, next);
          notifyActivityUpdated();
          await markTrainingDone();
          setSaving(false);
          return;
        }
      }

      const next = [...entries, localEntry];
      setEntries(next);
      saveLocalEntries(userId, logDate, next);
      notifyActivityUpdated();
      await markTrainingDone();
      setSaving(false);
    },
    [entries, logDate, markTrainingDone, supabase, userId]
  );

  const addPreset = useCallback(
    async (preset: (typeof TRAINING_PRESETS)[number]) => {
      await insertEntry(preset.activity, preset.minutes);
    },
    [insertEntry]
  );

  const addCustom = useCallback(async () => {
    const duration = parseDurationInput(customHours, customMinutes);
    const name = customActivity.trim() || t("training.customSportFallback");
    await insertEntry(name, duration);
    setCustomActivity("");
    setCustomHours("");
    setCustomMinutes("");
  }, [customActivity, customHours, customMinutes, insertEntry, t]);

  const removeEntry = useCallback(
    async (id: string) => {
      setSaving(true);
      if (userId && isSupabaseConfigured()) {
        await supabase
          .from("training_logs")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
      }
      const next = entries.filter((e) => e.id !== id);
      setEntries(next);
      saveLocalEntries(userId, logDate, next);
      notifyActivityUpdated();
      setSaving(false);
    },
    [entries, logDate, supabase, userId]
  );

  const saveManualSteps = useCallback(async () => {
    const next = Math.max(0, Number(manualSteps) || 0);
    setStepsInput(String(next));
    setSaving(true);
    await persistActivityMetrics(next);
    setManualSteps("");
    setSaving(false);
  }, [manualSteps, persistActivityMetrics]);

  return (
    <div className={cn("min-w-0", embedded ? "p-4 sm:p-5" : "")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 shrink-0 text-primary" />
          <h3 className="font-mono text-sm uppercase tracking-widest text-[#e8d5a3]">
            {t("training.titleToday")}
          </h3>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {t("training.goalProgress", {
            duration: formatTrainingDuration(totalMinutes),
            goal: DAILY_TRAINING_GOAL_MIN,
          })}
        </p>
      </div>

      <div className="mb-5 space-y-4 rounded-lg border border-primary/20 bg-background/35 p-3 sm:p-4">
        <MetricBar
          label={t("training.timeLabel")}
          value={trainingPercent}
          detail={`${trainingPercent}% · ${totalMinutes} min`}
        />
        <MetricBar
          label={t("training.stepsLabel")}
          value={stepGoalPercent}
          detail={`${steps.toLocaleString(numberLocale)} / ${DEFAULT_DAILY_STEP_GOAL.toLocaleString(numberLocale)}`}
        />
      </div>

      <p className="mb-2 text-xs text-muted-foreground">
        {t("training.multiSportHint")}
      </p>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("training.quickAdd")}
      </p>
      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {TRAINING_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            onClick={() => void addPreset(preset)}
            disabled={saving}
            className="h-auto min-h-10 whitespace-normal border-primary/30 bg-background/60 py-2 text-xs leading-snug"
          >
            {t(`training.presets.${preset.id}` as "training.presets.swim")}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          {t("training.loading")}
        </p>
      ) : entries.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">{t("training.empty")}</p>
      ) : (
        <div className="mb-5 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("training.todayList", {
              count: entries.length,
              unit:
                entries.length === 1
                  ? t("training.activity")
                  : t("training.activities"),
              duration: formatTrainingDuration(totalMinutes),
            })}
          </p>
          {entries.map((entry) => {
            const rate = trainingBurnRateForActivity(entry.activity);
            const entryKcal = estimatedKcalFromTrainingSession(
              entry.activity,
              entry.duration_minutes,
              weightKg
            );
            return (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2.5"
            >
              <Timer className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.activity}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatTrainingDuration(entry.duration_minutes)}
                  {" · ~"}
                  {entryKcal} kcal
                  {" · "}
                  {rate} kcal/kg/h
                  {" · "}
                  {format(parseISO(entry.logged_at), "HH:mm", {
                    locale: dateLocale,
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void removeEntry(entry.id)}
                disabled={saving}
                aria-label={t("training.remove")}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            );
          })}
        </div>
      )}

      <details className="mb-5 rounded-lg border border-primary/20 bg-background/30 px-3 py-2 open:pb-3">
        <summary className="cursor-pointer list-none py-1 font-mono text-xs uppercase tracking-wider text-[#e8d5a3] marker:content-none [&::-webkit-details-marker]:hidden">
          {t("training.customTitle")}
        </summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-activity" className="text-xs">
              {t("training.name")}
            </Label>
            <Input
              id="custom-activity"
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              placeholder={t("training.namePlaceholder")}
              className="border-primary/30 bg-background/60"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <div className="space-y-1.5">
              <Label htmlFor="custom-hours" className="text-xs">
                {t("training.hours")}
              </Label>
              <Input
                id="custom-hours"
                type="number"
                min={0}
                max={12}
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                placeholder="0"
                className="border-primary/30 bg-background/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-minutes" className="text-xs">
                {t("training.minutes")}
              </Label>
              <Input
                id="custom-minutes"
                type="number"
                min={0}
                max={59}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="45"
                className="border-primary/30 bg-background/60"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void addCustom()}
            disabled={saving}
            className="w-full font-mono text-xs uppercase tracking-wide sm:w-auto"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("training.addCustom")}
          </Button>
        </div>
      </details>

      <div className="rounded-lg border border-primary/20 bg-background/35 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" />
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#e8d5a3]">
              {t("training.stepsBurned")}
            </h4>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void syncSteps()}
            disabled={syncingSteps || saving}
            className="border-primary/30 text-xs"
          >
            {syncingSteps ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            {t("training.syncPhone")}
          </Button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          {t("training.stepsHint")}
          {lastSync ? ` ${lastSync}.` : ""}
        </p>
        {stepMessage && (
          <p className="mb-3 rounded border border-primary/15 bg-background/50 px-2 py-1.5 text-[11px] text-muted-foreground">
            {stepMessage}
          </p>
        )}

        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p>
            {t("training.stepsCount")}{" "}
            <strong className="text-foreground">
              {steps.toLocaleString(numberLocale)}
            </strong>{" "}
            ({paceLabelBySteps(steps)})
          </p>
          <p>
            {t("training.burnedEst")}{" "}
            <strong className="text-foreground">{totalBurned} kcal</strong>
            <span className="block text-[10px]">
              {t("training.burnedBreakdown", {
                stepsKcal: estimatedFromSteps,
                trainingKcal: estimatedFromTraining,
                count: entries.length,
                unit:
                  entries.length === 1
                    ? t("training.activity")
                    : t("training.activities"),
              })}
            </span>
          </p>
        </div>

        <details className="mt-3 rounded border border-dashed border-primary/20 px-2 py-1.5">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            {t("training.kcalLegend")}
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {TRAINING_BURN_LEGEND.map((item) => (
              <li key={item.activity}>
                <strong className="text-foreground">{item.activity}</strong> —{" "}
                {item.rate} kcal / kg / hod
              </li>
            ))}
            <li>
              {t("training.customSportFallback")} —{" "}
              {trainingBurnRateForActivity(t("training.customSportFallback"))}{" "}
              kcal/kg/h
            </li>
            <li className="pt-1">{t("training.formulaHint")}</li>
          </ul>
        </details>

        <details className="mt-3 rounded border border-dashed border-primary/20 px-2 py-1.5">
          <summary className="cursor-pointer text-[11px] text-muted-foreground">
            {t("training.manualSteps")}
          </summary>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              type="number"
              min={0}
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              placeholder={
                steps > 0 ? String(steps) : t("training.stepsPlaceholder")
              }
              className="border-primary/30 bg-background/60"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void saveManualSteps()}
              disabled={saving}
              className="shrink-0 text-xs"
            >
              {t("training.saveSteps")}
            </Button>
          </div>
        </details>

        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("training.notesPlaceholder")}
          className="mt-3 border-primary/30 bg-background/60 text-sm"
        />
      </div>
    </div>
  );
}
