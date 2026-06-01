"use client";

import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { sk } from "date-fns/locale";
import { Calendar, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCalendar } from "@/hooks/use-calendar";
import type { CalendarEvent } from "@/lib/types";

const HOURS = [8, 10, 12, 14, 16, 18, 20];

function eventOnDay(event: CalendarEvent, day: Date): boolean {
  try {
    const start = parseISO(event.start);
    return isSameDay(start, day);
  } catch {
    return false;
  }
}

function isHoliday(event: CalendarEvent): boolean {
  const t = event.title.toLowerCase();
  return (
    t.includes("dovolenka") ||
    t.includes("holiday") ||
    t.includes("voľno")
  );
}

export function CalendarEvents() {
  const { events, loading, error, configured, needsLogin, refetch } =
    useCalendar();

  const days = Array.from({ length: 5 }, (_, i) =>
    addDays(startOfDay(new Date()), i)
  );

  return (
    <Card className="min-h-[280px]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle>Calendar (Prepojenie)</CardTitle>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={loading}
          className="h-8 w-8 border-primary/40"
          aria-label="Obnoviť"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!configured && (
          <p className="mb-4 text-xs text-muted-foreground">
            Google Calendar nie je v .env.local — zobrazujem demo mriežku.
          </p>
        )}

        {needsLogin && (
          <p className="mb-4 text-xs text-muted-foreground">
            Kalendár: prihlás sa v hlavičke (Google).
          </p>
        )}

        {error && (
          <p className="mb-4 text-xs text-destructive">{error}</p>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-1 border-b border-primary/20 pb-2">
              <div />
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="text-center text-xs font-semibold text-[#e8d5a3]"
                >
                  {format(day, "d", { locale: sk })}
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {format(day, "EEE", { locale: sk })}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative mt-1 grid grid-cols-[40px_repeat(5,1fr)] gap-1">
              {HOURS.map((hour) => (
                <div key={hour} className="contents">
                  <div className="py-3 text-right text-[10px] text-muted-foreground">
                    {hour}:00
                  </div>
                  {days.map((day) => {
                    const dayEvents = events.filter((e) =>
                      eventOnDay(e, day)
                    );
                    const busy = dayEvents.some(
                      (e) =>
                        e.isBusy &&
                        !isHoliday(e) &&
                        (() => {
                          try {
                            const h = parseISO(e.start).getHours();
                            return Math.abs(h - hour) <= 1;
                          } catch {
                            return false;
                          }
                        })()
                    );
                    const holiday = dayEvents.some(
                      (e) => isHoliday(e) && hour === 12
                    );

                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={`min-h-[28px] border border-primary/10 ${
                          holiday
                            ? "bg-destructive/40"
                            : busy
                              ? "bg-muted"
                              : "bg-background/30"
                        }`}
                      >
                        {holiday && hour === 12 && (
                          <span className="block p-0.5 text-[8px] font-bold uppercase text-white">
                            Holiday
                          </span>
                        )}
                        {busy && !holiday && hour === 10 && (
                          <span className="block p-0.5 text-[8px] uppercase text-muted-foreground">
                            Busy
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {configured && events.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-primary/20 pt-3">
            {events.slice(0, 4).map((e) => (
              <li
                key={e.id}
                className="flex justify-between text-xs text-muted-foreground"
              >
                <span className="truncate text-foreground">{e.title}</span>
                <span className="shrink-0 pl-2">
                  {format(parseISO(e.start), "d.M. HH:mm", { locale: sk })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
