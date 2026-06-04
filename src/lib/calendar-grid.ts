import {
  addDays,
  addHours,
  format,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from "date-fns";
import { sk } from "date-fns/locale";
import type { CalendarEvent } from "@/lib/types";

/** Hodiny zobrazené v týždennej mriežke. */
export const CALENDAR_GRID_HOURS = [
  7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
] as const;

export type CalendarGridHour = (typeof CALENDAR_GRID_HOURS)[number];

function hourSlotBounds(day: Date, hour: number): { start: Date; end: Date } {
  const start = setSeconds(
    setMinutes(setHours(startOfDay(day), hour), 0),
    0
  );
  return { start, end: addHours(start, 1) };
}

function parseAllDayDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseEventBounds(event: CalendarEvent): {
  start: Date;
  end: Date;
} | null {
  try {
    if (event.isAllDay) {
      const start = /^\d{4}-\d{2}-\d{2}$/.test(event.start)
        ? parseAllDayDate(event.start)
        : startOfDay(parseISO(event.start));
      let end = event.end
        ? /^\d{4}-\d{2}-\d{2}$/.test(event.end)
          ? parseAllDayDate(event.end)
          : startOfDay(parseISO(event.end))
        : addDays(start, 1);
      if (end <= start) {
        end = addDays(start, 1);
      }
      return { start, end };
    }

    const start = parseISO(event.start);
    let end = parseISO(event.end);

    if (!Number.isFinite(end.getTime()) || end <= start) {
      end = addHours(start, 1);
    }

    return { start, end };
  } catch {
    return null;
  }
}

export function eventOnDay(event: CalendarEvent, day: Date): boolean {
  const bounds = parseEventBounds(event);
  if (!bounds) return false;

  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);

  return bounds.start < dayEnd && bounds.end > dayStart;
}

/** Udalosť prekrýva hodinu [hour:00, hour+1:00) v daný deň. */
export function eventOverlapsHour(
  event: CalendarEvent,
  day: Date,
  hour: number
): boolean {
  if (!eventOnDay(event, day)) return false;

  const bounds = parseEventBounds(event);
  if (!bounds) return false;

  if (event.isAllDay) return true;

  const slot = hourSlotBounds(day, hour);
  return bounds.start < slot.end && bounds.end > slot.start;
}

/** Prvá hodina slotu v mriežke, kde udalosť na daný deň začína (alebo 8:00 ak začala skôr). */
export function eventLabelHourOnDay(
  event: CalendarEvent,
  day: Date
): number | null {
  if (!eventOnDay(event, day)) return null;

  const bounds = parseEventBounds(event);
  if (!bounds) return null;

  if (event.isAllDay) return CALENDAR_GRID_HOURS[0];

  const dayStart = startOfDay(day);
  const visibleStart =
    bounds.start < dayStart ? dayStart : bounds.start;

  let hour = visibleStart.getHours();
  if (hour < CALENDAR_GRID_HOURS[0]) {
    hour = CALENDAR_GRID_HOURS[0];
  } else if (hour > CALENDAR_GRID_HOURS[CALENDAR_GRID_HOURS.length - 1]) {
    return null;
  }
  return hour;
}

export function formatEventTimeRange(event: CalendarEvent): string {
  if (event.isAllDay) return "Celý deň";

  try {
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    return `${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
  } catch {
    return "";
  }
}

export function formatEventListLine(event: CalendarEvent): string {
  try {
    const start = parseISO(event.start);
    const day = format(start, "d.M.", { locale: sk });
    if (event.isAllDay) return `${day} · Celý deň`;
    return `${day} ${formatEventTimeRange(event)}`;
  } catch {
    return "";
  }
}

export function isHolidayEvent(event: CalendarEvent): boolean {
  const t = event.title.toLowerCase();
  return (
    t.includes("dovolenka") ||
    t.includes("holiday") ||
    t.includes("voľno")
  );
}

/** Všetky kalendárne udalosti v danom hodinom slote (aj „voľné“ — napr. aktivity detí). */
export function calendarEventsForHourSlot(
  events: CalendarEvent[],
  day: Date,
  hour: number
): CalendarEvent[] {
  return events
    .filter(
      (e) => !isHolidayEvent(e) && eventOverlapsHour(e, day, hour)
    )
    .sort((a, b) => {
      try {
        return parseISO(a.start).getTime() - parseISO(b.start).getTime();
      } catch {
        return 0;
      }
    });
}

/** @deprecated Použi calendarEventsForHourSlot — zachované pre busy-only filter */
export function eventsForHourSlot(
  events: CalendarEvent[],
  day: Date,
  hour: number
): CalendarEvent[] {
  return calendarEventsForHourSlot(events, day, hour).filter((e) => e.isBusy);
}

export function isPersonalCalendarEvent(event: CalendarEvent): boolean {
  return !event.isBusy && !event.isAllDay;
}

export type CalendarEventTone = "busy" | "personal" | "holiday" | "allday";

export function calendarEventTone(event: CalendarEvent): CalendarEventTone {
  if (isHolidayEvent(event)) return "holiday";
  if (event.isAllDay) return "allday";
  if (isPersonalCalendarEvent(event)) return "personal";
  return "busy";
}

export function calendarEventChipClass(tone: CalendarEventTone): string {
  switch (tone) {
    case "holiday":
      return "bg-emerald-500/45 ring-1 ring-emerald-400/55 text-emerald-50";
    case "personal":
      return "bg-rose-500/35 ring-1 ring-rose-400/55 text-rose-50";
    case "allday":
      return "bg-primary/30 ring-1 ring-primary/45 text-foreground";
    default:
      return "bg-primary/40 ring-1 ring-primary/50 text-foreground";
  }
}

export function eventStartTimestamp(event: CalendarEvent): number {
  const bounds = parseEventBounds(event);
  return bounds?.start.getTime() ?? 0;
}

/** Udalosti pre konkrétny deň, zoradené podľa začiatku. */
export function eventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events
    .filter((e) => eventOnDay(e, day))
    .sort((a, b) => eventStartTimestamp(a) - eventStartTimestamp(b));
}
