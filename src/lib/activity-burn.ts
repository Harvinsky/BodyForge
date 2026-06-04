import { estimatedKcalFromSteps } from "@/lib/activity-metrics";
import {
  DEFAULT_TRAINING_BURN_RATE,
  trainingBurnRateForActivity,
} from "@/lib/training-presets";

export type ActivityDayMetrics = {
  steps: number;
  calories_burned_manual: number;
  calories_burned_estimated: number;
};

export type TrainingSession = {
  activity: string;
  durationMinutes: number;
};

export type TrainingDaySummary = {
  sessions: TrainingSession[];
  totalMinutes: number;
  sessionCount: number;
};

export type DailyBurnSummary = {
  steps: number;
  trainingMinutes: number;
  trainingSessions: number;
  estimatedBurned: number;
  manualBurned: number;
  totalBurned: number;
};

export function estimatedKcalFromTrainingSession(
  activity: string,
  durationMinutes: number,
  weightKg: number
): number {
  if (durationMinutes <= 0 || weightKg <= 0) return 0;
  const rate = trainingBurnRateForActivity(activity);
  return Math.round((durationMinutes * weightKg * rate) / 60);
}

export function estimatedKcalFromTrainingSessions(
  sessions: TrainingSession[],
  weightKg: number
): number {
  return sessions.reduce(
    (sum, session) =>
      sum +
      estimatedKcalFromTrainingSession(
        session.activity,
        session.durationMinutes,
        weightKg
      ),
    0
  );
}

/** @deprecated Použi estimatedKcalFromTrainingSession — rovnaký priemer 6 kcal/kg/h */
export function estimatedKcalFromTraining(
  durationMinutes: number,
  weightKg: number,
  burnRate = DEFAULT_TRAINING_BURN_RATE
): number {
  if (durationMinutes <= 0 || weightKg <= 0) return 0;
  return Math.round((durationMinutes * weightKg * burnRate) / 60);
}

export function trainingDaySummaryFromSessions(
  sessions: TrainingSession[]
): TrainingDaySummary {
  const totalMinutes = sessions.reduce(
    (sum, s) => sum + Math.max(0, s.durationMinutes),
    0
  );
  return {
    sessions,
    totalMinutes,
    sessionCount: sessions.length,
  };
}

export function computeDailyBurn(
  metrics: ActivityDayMetrics,
  training: TrainingDaySummary,
  weightKg: number
): DailyBurnSummary {
  const steps = Math.max(0, metrics.steps);
  const trainingMinutes = Math.max(0, training.totalMinutes);
  const fromSteps = estimatedKcalFromSteps(steps);
  const fromTraining =
    training.sessions.length > 0
      ? estimatedKcalFromTrainingSessions(training.sessions, weightKg)
      : estimatedKcalFromTraining(trainingMinutes, weightKg);
  const estimatedBurned = fromSteps + fromTraining;
  const manualBurned = Math.max(0, metrics.calories_burned_manual);
  const totalBurned = Math.max(manualBurned, estimatedBurned);

  return {
    steps,
    trainingMinutes,
    trainingSessions: training.sessionCount,
    estimatedBurned,
    manualBurned,
    totalBurned,
  };
}

export function burnedPercentOfTarget(
  burned: number,
  dailyTarget: number
): number {
  if (dailyTarget <= 0) return 0;
  return Math.min(100, Math.round((burned / dailyTarget) * 100));
}
