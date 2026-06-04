import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeDailyBurn,
  trainingDaySummaryFromSessions,
} from "@/lib/activity-burn";
import {
  loadLocalActivityMetrics,
  loadLocalTrainingSessions,
  notifyActivityUpdated,
  saveLocalActivityMetrics,
} from "@/lib/activity-storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** Uloží kroky pre deň; Health Connect má prednosť len ak je počet vyšší než uložený. */
export async function persistStepsForLogDate(
  supabase: SupabaseClient,
  userId: string | null,
  logDate: string,
  steps: number,
  weightKg: number
): Promise<boolean> {
  const nextSteps = Math.min(100_000, Math.max(0, Math.round(steps)));
  if (nextSteps <= 0) return false;

  const existing = loadLocalActivityMetrics(userId, logDate);

  if (userId && isSupabaseConfigured()) {
    const { data } = await supabase
      .from("daily_activity_metrics")
      .select(
        "steps, calories_burned_manual, calories_burned_estimated, notes"
      )
      .eq("user_id", userId)
      .eq("log_date", logDate)
      .maybeSingle();

    if (data) {
      existing.steps = Math.max(existing.steps, Number(data.steps ?? 0));
      existing.calories_burned_manual = Number(
        data.calories_burned_manual ?? existing.calories_burned_manual
      );
      existing.calories_burned_estimated = Number(
        data.calories_burned_estimated ?? existing.calories_burned_estimated
      );
      if (typeof data.notes === "string" && data.notes.trim()) {
        existing.notes = data.notes;
      }
    }
  }

  if (nextSteps < existing.steps) return false;
  if (nextSteps === existing.steps) return false;

  const sessions = loadLocalTrainingSessions(userId, logDate).map((s) => ({
    activity: s.activity,
    durationMinutes: s.durationMinutes,
  }));
  const training = trainingDaySummaryFromSessions(sessions);
  const burn = computeDailyBurn(
    {
      steps: nextSteps,
      calories_burned_manual: existing.calories_burned_manual,
      calories_burned_estimated: existing.calories_burned_estimated,
    },
    training,
    weightKg
  );

  const payload = {
    steps: nextSteps,
    calories_burned_manual: existing.calories_burned_manual,
    calories_burned_estimated: burn.estimatedBurned,
    notes: existing.notes,
  };

  saveLocalActivityMetrics(userId, logDate, payload);

  if (userId && isSupabaseConfigured()) {
    await supabase.from("daily_activity_metrics").upsert(
      {
        user_id: userId,
        log_date: logDate,
        ...payload,
      },
      { onConflict: "user_id,log_date" }
    );
  }

  return true;
}

export async function backfillStepsForDateRange(
  supabase: SupabaseClient,
  userId: string | null,
  stepsByDate: Map<string, number>,
  weightKg: number
): Promise<number> {
  let updated = 0;
  for (const [logDate, steps] of stepsByDate) {
    const changed = await persistStepsForLogDate(
      supabase,
      userId,
      logDate,
      steps,
      weightKg
    );
    if (changed) updated += 1;
  }
  if (updated > 0) notifyActivityUpdated();
  return updated;
}
