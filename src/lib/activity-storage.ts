export type StoredActivityMetrics = {
  steps: number;
  calories_burned_manual: number;
  calories_burned_estimated: number;
  notes: string;
};

const LOCAL_ACTIVITY_PREFIX = "bodyforge-activity-metrics-";
const LOCAL_TRAINING_PREFIX = "bodyforge-training-log-";

function localScope(userId: string | null): string {
  return userId ? `user:${userId}` : "anon";
}

function activityKey(userId: string | null, logDate: string): string {
  return `${LOCAL_ACTIVITY_PREFIX}${localScope(userId)}:${logDate}`;
}

function trainingKey(userId: string | null, logDate: string): string {
  return `${LOCAL_TRAINING_PREFIX}${localScope(userId)}:${logDate}`;
}

export function saveLocalActivityMetrics(
  userId: string | null,
  logDate: string,
  metrics: StoredActivityMetrics
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(activityKey(userId, logDate), JSON.stringify(metrics));
}

export function loadLocalActivityMetrics(
  userId: string | null,
  logDate: string
): StoredActivityMetrics {
  if (typeof window === "undefined") {
    return {
      steps: 0,
      calories_burned_manual: 0,
      calories_burned_estimated: 0,
      notes: "",
    };
  }
  try {
    const raw = localStorage.getItem(activityKey(userId, logDate));
    if (raw) {
      return {
        steps: 0,
        calories_burned_manual: 0,
        calories_burned_estimated: 0,
        notes: "",
        ...(JSON.parse(raw) as Partial<StoredActivityMetrics>),
      };
    }
  } catch {
    // ignore invalid cache
  }
  return {
    steps: 0,
    calories_burned_manual: 0,
    calories_burned_estimated: 0,
    notes: "",
  };
}

export function notifyActivityUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bodyforge-activity-updated"));
  }
}

export function loadLocalTrainingMinutes(
  userId: string | null,
  logDate: string
): number {
  return loadLocalTrainingSessions(userId, logDate).reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
}

export type LocalTrainingSession = {
  activity: string;
  durationMinutes: number;
};

export function loadLocalTrainingSessions(
  userId: string | null,
  logDate: string
): LocalTrainingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(trainingKey(userId, logDate));
    if (!raw) return [];
    const entries = JSON.parse(raw) as Array<{
      activity?: string;
      duration_minutes: number;
    }>;
    return entries.map((e) => ({
      activity: e.activity?.trim() || "Vlastný šport",
      durationMinutes: e.duration_minutes ?? 0,
    }));
  } catch {
    return [];
  }
}
