export type DailyTaskKey =
  | "fasting_window"
  | "is_fasting_day"
  | "hydration_1l"
  | "hydration_2l"
  | "hydration_3l"
  | "morning_vacuum"
  | "evening_tech_off";

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  fasting_window: boolean;
  is_fasting_day: boolean;
  hydration_1l: boolean;
  hydration_2l: boolean;
  hydration_3l: boolean;
  morning_vacuum: boolean;
  evening_tech_off: boolean;
  meal_1_done: boolean;
  meal_snack_done: boolean;
  meal_2_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyTasks {
  fasting_window: boolean;
  is_fasting_day: boolean;
  hydration_1l: boolean;
  hydration_2l: boolean;
  hydration_3l: boolean;
  morning_vacuum: boolean;
  evening_tech_off: boolean;
  meal_1_done: boolean;
  meal_snack_done: boolean;
  meal_2_done: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isBusy: boolean;
  isAllDay: boolean;
}

export interface ProgressDay {
  date: string;
  label: string;
  completion: number;
  completed: number;
  total: number;
}

export const DAILY_TASK_KEYS: DailyTaskKey[] = [
  "fasting_window",
  "hydration_1l",
  "hydration_2l",
  "hydration_3l",
  "morning_vacuum",
  "evening_tech_off",
];

export const TOTAL_DAILY_TASKS = DAILY_TASK_KEYS.length;

export function emptyDailyTasks(): DailyTasks {
  return {
    fasting_window: false,
    is_fasting_day: false,
    hydration_1l: false,
    hydration_2l: false,
    hydration_3l: false,
    morning_vacuum: false,
    evening_tech_off: false,
    meal_1_done: false,
    meal_snack_done: false,
    meal_2_done: false,
  };
}

export function countCompletedTasks(tasks: DailyTasks): number {
  return DAILY_TASK_KEYS.filter((key) => tasks[key]).length;
}

export function calculateCompletion(tasks: DailyTasks): number {
  return Math.round((countCompletedTasks(tasks) / TOTAL_DAILY_TASKS) * 100);
}

export function dailyLogToTasks(log: DailyLog): DailyTasks {
  return {
    fasting_window: log.fasting_window,
    is_fasting_day: log.is_fasting_day ?? false,
    hydration_1l: log.hydration_1l,
    hydration_2l: log.hydration_2l,
    hydration_3l: log.hydration_3l,
    morning_vacuum: log.morning_vacuum,
    evening_tech_off: log.evening_tech_off,
    meal_1_done: log.meal_1_done ?? false,
    meal_snack_done: log.meal_snack_done ?? false,
    meal_2_done: log.meal_2_done ?? false,
  };
}
