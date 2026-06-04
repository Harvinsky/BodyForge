"use client";

import { addDays, format, isToday, startOfDay } from "date-fns";
import { Calendar, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendar } from "@/hooks/use-calendar";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useEatingWindow } from "@/hooks/use-eating-window";
import {
  isBodyforgeTaskDone,
  type BodyforgeScheduleSlot,
} from "@/lib/bodyforge-schedule";
import {
  CALENDAR_GRID_HOURS,
  calendarEventChipClass,
  calendarEventTone,
  calendarEventsForHourSlot,
  eventLabelHourOnDay,
  eventOnDay,
  eventsForDay,
  formatEventListLine,
  formatEventTimeRange,
  isHolidayEvent,
  isPersonalCalendarEvent,
} from "@/lib/calendar-grid";
import type { CalendarEvent } from "@/lib/types";
import { useI18n } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

function protocolSummaryLines(
  schedule: BodyforgeScheduleSlot[],
  isFastingDay: boolean,
  t: (key: string, params?: Record<string, string | number>) => string
): { window?: string; meals: BodyforgeScheduleSlot[]; water?: string } {
  const meals = schedule.filter(
    (s) => s.kind === "meal" && !s.id.endsWith("-lead")
  );
  const waters = schedule
    .filter((s) => s.kind === "water")
    .map((s) => s.time);
  const windowOpen = schedule.find((s) => s.id === "bf-window-open");
  const windowClose = schedule.find((s) => s.id === "bf-window-close");

  if (isFastingDay) {
    return {
      window: t("calendar.fastingDay"),
      meals: [],
      water:
        waters.length > 0
          ? t("calendar.waterAt", { times: waters.join(", ") })
          : undefined,
    };
  }

  return {
    window:
      windowOpen && windowClose
        ? t("calendar.eatingWindow", {
            range: `${windowOpen.time}–${windowClose.time}`,
          })
        : undefined,
    meals,
    water:
      waters.length > 0
        ? t("calendar.waterAt", { times: waters.join(", ") })
        : undefined,
  };
}

function EventChip({ event }: { event: CalendarEvent }) {
  const tone = calendarEventTone(event);
  return (
    <div
      title={event.title}
      className={cn(
        "rounded-md px-2 py-1 text-left leading-tight",
        calendarEventChipClass(tone)
      )}
    >
      <span className="block truncate text-[11px] font-semibold">
        {event.title}
      </span>
      <span className="block font-mono text-[10px] opacity-85">
        {formatEventTimeRange(event)}
      </span>
    </div>
  );
}

export function CalendarEvents() {
  const { events, loading, error, configured, needsLogin, refetch } =
    useCalendar();
  const { tasks } = useDailyTracker();
  const { bodyforgeSchedule, label } = useEatingWindow();
  const { t, dateLocale } = useI18n();

  const days = Array.from({ length: 5 }, (_, i) =>
    addDays(startOfDay(new Date()), i)
  );

  const isFastingDay = tasks.is_fasting_day;
  const protocol = protocolSummaryLines(bodyforgeSchedule, isFastingDay, t);

  const weekEventCount = events.filter((e) =>
    days.some((day) => eventOnDay(e, day))
  ).length;

  const calendarDisconnected = !needsLogin && !configured && !loading;

  return (
    <details
      open
      className="group min-w-0 overflow-hidden rounded-xl border border-primary/20 bg-card/30"
    >
      <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            {t("calendar.title")}
            {!loading && configured && weekEventCount > 0 && (
              <span className="hidden truncate font-mono text-[10px] normal-case tracking-normal text-muted-foreground/80 sm:inline">
                ·{" "}
                {t("calendar.eventsCount", {
                  count: weekEventCount,
                  days: days.length - 1,
                })}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] text-muted-foreground group-open:hidden">
              {t("common.expand")}
            </span>
            <span className="hidden text-[10px] text-muted-foreground group-open:inline">
              {t("common.collapse")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                void refetch();
              }}
              disabled={loading}
              className="h-8 w-8 border-primary/40"
              aria-label={t("calendar.refresh")}
              title={t("calendar.refreshTitle")}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </span>
        </span>
      </summary>

      <div className="min-w-0 border-t border-primary/15 px-4 py-4 sm:px-5">
        {needsLogin && (
          <p className="mb-4 text-xs text-amber-200/90">
            {t("calendar.signInGoogle")}
          </p>
        )}

        {calendarDisconnected && (
          <p className="mb-4 text-xs text-amber-200/90">
            {t("calendar.reconnectGoogle")}
          </p>
        )}

        {!loading && !needsLogin && configured && !error && weekEventCount === 0 && (
          <p className="mb-4 text-xs text-muted-foreground">
            {t("calendar.noEventsWeek")}
          </p>
        )}

        {error && (
          <p className="mb-4 text-xs text-destructive">{error}</p>
        )}

        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-sm bg-primary/40 ring-1 ring-primary/50" />
            {t("calendar.meeting")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-sm bg-rose-500/35 ring-1 ring-rose-400/55" />
            {t("calendar.personal")}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-sm bg-emerald-500/45 ring-1 ring-emerald-400/55" />
            {t("calendar.holiday")}
          </span>
        </div>

        <div className="space-y-3">
          {days.map((day) => {
            const dayEvents = eventsForDay(events, day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  isToday(day)
                    ? "border-primary/40 bg-primary/5"
                    : "border-primary/15 bg-background/30"
                )}
              >
                <p
                  className={cn(
                    "mb-1.5 font-mono text-[10px] uppercase tracking-wider",
                    isToday(day) ? "text-primary" : "text-[#e8d5a3]"
                  )}
                >
                  {isToday(day) ? t("common.today") : format(day, "EEE d.M.", { locale: dateLocale })}
                </p>
                {dayEvents.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{t("calendar.noEvents")}</p>
                ) : (
                  <ul className="space-y-1">
                    {dayEvents.map((ev) => (
                      <li key={ev.id}>
                        <EventChip event={ev} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <details className="group mt-4 rounded-md border border-primary/15 bg-background/40 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
            {t("calendar.hourlyGrid")}
          </summary>
          <div className="app-scroll-x -mx-1 mt-3 overflow-x-auto px-1">
            <div className="min-w-[min(100%,440px)] sm:min-w-[440px]">
              <div className="grid grid-cols-[32px_repeat(5,1fr)] gap-px border-b border-primary/20 pb-2">
                <div />
                {days.map((day) => (
                  <div
                    key={`h-${day.toISOString()}`}
                    className={cn(
                      "text-center text-[10px] font-semibold",
                      isToday(day) ? "text-primary" : "text-foreground/90"
                    )}
                  >
                    {format(day, "d", { locale: dateLocale })}
                  </div>
                ))}
              </div>
              <div className="relative mt-1 grid grid-cols-[32px_repeat(5,1fr)] gap-px">
                {CALENDAR_GRID_HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    <div className="pr-0.5 pt-0.5 text-right text-[8px] text-muted-foreground">
                      {hour}
                    </div>
                    {days.map((day) => {
                      const dayEvents = events.filter((e) => eventOnDay(e, day));
                      const calendarInSlot = calendarEventsForHourSlot(
                        dayEvents,
                        day,
                        hour
                      );
                      const holiday = dayEvents.some(
                        (e) => isHolidayEvent(e) && eventOnDay(e, day)
                      );

                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className={cn(
                            "min-h-[18px] border border-primary/10 px-px py-px",
                            holiday && "bg-emerald-500/30",
                            calendarInSlot.length > 0 &&
                              !holiday &&
                              "bg-primary/10"
                          )}
                        >
                          {calendarInSlot.map((ev) => {
                            const isStartHour =
                              eventLabelHourOnDay(ev, day) === hour;
                            if (!isStartHour) {
                              return (
                                <div
                                  key={ev.id}
                                  title={ev.title}
                                  className={cn(
                                    "mx-px h-1 rounded-full",
                                    ev.isBusy || ev.isAllDay
                                      ? "bg-primary/50"
                                      : "bg-rose-400/55"
                                  )}
                                />
                              );
                            }
                            return (
                              <div
                                key={ev.id}
                                title={ev.title}
                                className={cn(
                                  "truncate rounded px-0.5 text-[7px] font-bold leading-tight",
                                  calendarEventChipClass(calendarEventTone(ev))
                                )}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>

        <details className="group mt-3 rounded-md border border-primary/15 bg-background/40 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
            {t("calendar.protocolToday", { label })}
          </summary>
          <ul className="mt-2 space-y-1 border-t border-primary/10 pt-2 text-[11px] text-muted-foreground">
            {protocol.window && <li>{protocol.window}</li>}
            {protocol.meals.map((slot) => {
              const done = isBodyforgeTaskDone(slot, tasks);
              return (
                <li
                  key={slot.id}
                  className={cn(
                    done === true && "text-muted-foreground/60 line-through"
                  )}
                >
                  {slot.shortLabel} {slot.time}
                  {done === true ? " ✓" : ""}
                </li>
              );
            })}
            {protocol.water && <li>{protocol.water}</li>}
          </ul>
        </details>

        {configured && weekEventCount > 0 && (
          <ul className="mt-4 space-y-1 border-t border-primary/20 pt-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("calendar.allEvents")}
            </p>
            {events
              .filter((e) => days.some((day) => eventOnDay(e, day)))
              .slice(0, 15)
              .map((e) => (
                <li key={e.id} className="flex justify-between gap-2 text-xs">
                  <span
                    className={cn(
                      "truncate font-medium",
                      isPersonalCalendarEvent(e)
                        ? "text-rose-100"
                        : "text-foreground"
                    )}
                  >
                    {e.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatEventListLine(e)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </details>
  );
}
