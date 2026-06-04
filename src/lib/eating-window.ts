export interface EatingWindow {
  start: string;
  end: string;
}

export const DEFAULT_EATING_WINDOW: EatingWindow = {
  start: "12:00",
  end: "20:00",
};

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTimeInput(value: string): string | null {
  const trimmed = value.trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizeEatingWindow(
  start: string,
  end: string
): EatingWindow | null {
  const parsedStart = parseTimeInput(start);
  const parsedEnd = parseTimeInput(end);
  if (!parsedStart || !parsedEnd) return null;

  const startMin = parseTimeToMinutes(parsedStart);
  const endMin = parseTimeToMinutes(parsedEnd);
  const duration = endMin - startMin;

  if (duration < 4 * 60 || duration > 14 * 60) return null;

  return { start: parsedStart, end: parsedEnd };
}

export function eatingWindowFromSettings(settings: {
  eatingWindowStart?: string | null;
  eatingWindowEnd?: string | null;
}): EatingWindow | null {
  if (!settings.eatingWindowStart || !settings.eatingWindowEnd) return null;
  return normalizeEatingWindow(
    settings.eatingWindowStart,
    settings.eatingWindowEnd
  );
}

export function eatingWindowDurationHours(window: EatingWindow): number {
  const mins =
    parseTimeToMinutes(window.end) - parseTimeToMinutes(window.start);
  return Math.round((mins / 60) * 10) / 10;
}

export function formatEatingWindowRange(window: EatingWindow): string {
  return `${window.start} – ${window.end}`;
}

export function formatEatingWindowLabel(window: EatingWindow): string {
  const hours = eatingWindowDurationHours(window);
  if (Math.abs(hours - 8) < 0.01) return "16:8";
  return `${hours}h okno`;
}

export function formatFastingPeriodLabel(window: EatingWindow): string {
  return `${window.end} → ${window.start}`;
}

export function isEatingWindowClosed(
  window: EatingWindow,
  now = new Date()
): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= parseTimeToMinutes(window.end);
}

export function buildMealTimesFromWindow(window: EatingWindow): {
  meal1: string;
  snack: string;
  meal2: string;
} {
  const startMin = parseTimeToMinutes(window.start);
  const endMin = parseTimeToMinutes(window.end);
  const mid = startMin + Math.round((endMin - startMin) / 2 / 15) * 15;

  return {
    meal1: window.start,
    snack: minutesToTime(mid),
    meal2: window.end,
  };
}
