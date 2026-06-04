export const DAY_HISTORY_CHANGED = "bodyforge-history-changed";

export function notifyDayHistoryChanged(dates: string[] = []): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DAY_HISTORY_CHANGED, { detail: { dates } })
  );
}

export function dayHistoryChangedIncludesToday(
  dates: string[],
  today: string
): boolean {
  return dates.length === 0 || dates.includes(today);
}
