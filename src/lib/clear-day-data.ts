import type { SupabaseClient } from "@supabase/supabase-js";

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

const LOCAL_KEYS = (
  userId: string | null,
  dateStr: string
): string[] => [
  `t800-daily-log-${localScope(userId)}:${dateStr}`,
  `t800-hydration-log-${localScope(userId)}:${dateStr}`,
  `bodyforge-calorie-log-${localScope(userId)}:${dateStr}`,
  `bodyforge-training-log-${localScope(userId)}:${dateStr}`,
  `bodyforge-activity-metrics-${localScope(userId)}:${dateStr}`,
];

export function clearLocalDayData(
  userId: string | null,
  dateStr: string
): void {
  if (typeof window === "undefined") return;
  for (const key of LOCAL_KEYS(userId, dateStr)) {
    localStorage.removeItem(key);
  }
}

export function clearLocalDayRange(
  userId: string | null,
  dates: string[]
): void {
  for (const dateStr of dates) {
    clearLocalDayData(userId, dateStr);
  }
}

export async function deleteDayFromSupabase(
  supabase: SupabaseClient,
  userId: string,
  dateStr: string
): Promise<void> {
  await Promise.all([
    supabase
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .eq("log_date", dateStr),
    supabase
      .from("calorie_logs")
      .delete()
      .eq("user_id", userId)
      .eq("log_date", dateStr),
    supabase
      .from("hydration_logs")
      .delete()
      .eq("user_id", userId)
      .eq("log_date", dateStr),
    supabase
      .from("training_logs")
      .delete()
      .eq("user_id", userId)
      .eq("log_date", dateStr),
    supabase
      .from("daily_activity_metrics")
      .delete()
      .eq("user_id", userId)
      .eq("log_date", dateStr),
  ]);
}

export async function deleteDayRangeFromSupabase(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  await Promise.all([
    supabase
      .from("daily_logs")
      .delete()
      .eq("user_id", userId)
      .gte("log_date", startDate)
      .lte("log_date", endDate),
    supabase
      .from("calorie_logs")
      .delete()
      .eq("user_id", userId)
      .gte("log_date", startDate)
      .lte("log_date", endDate),
    supabase
      .from("hydration_logs")
      .delete()
      .eq("user_id", userId)
      .gte("log_date", startDate)
      .lte("log_date", endDate),
    supabase
      .from("training_logs")
      .delete()
      .eq("user_id", userId)
      .gte("log_date", startDate)
      .lte("log_date", endDate),
    supabase
      .from("daily_activity_metrics")
      .delete()
      .eq("user_id", userId)
      .gte("log_date", startDate)
      .lte("log_date", endDate),
  ]);
}
