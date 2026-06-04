import { isAfter, isBefore, parseISO, startOfDay, subDays } from "date-fns";

/** Posledných maxDays kalendárnych dní od dnes, ale nie skôr ako začiatok plánu. */
export function planRollingDayDates(
  programStartDate: string | null,
  maxDays = 7,
  referenceDate = new Date()
): Date[] {
  const today = startOfDay(referenceDate);
  let planStart: Date | null = null;

  if (programStartDate) {
    try {
      planStart = startOfDay(parseISO(programStartDate));
    } catch {
      planStart = null;
    }
  }

  const dates: Date[] = [];
  for (let i = maxDays - 1; i >= 0; i--) {
    const day = startOfDay(subDays(today, i));
    if (planStart && isBefore(day, planStart)) continue;
    if (isAfter(day, today)) continue;
    dates.push(day);
  }
  return dates;
}
