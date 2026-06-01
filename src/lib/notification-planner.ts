import { format, isSameDay, parseISO, startOfDay } from "date-fns";
import { APP_NAME } from "@/lib/brand";
import { HYDRATION_GOAL_ML } from "@/lib/hydration";
import { MEAL_PLAN_BLOCKS } from "@/lib/meal-plan-protocol";
import { EATING_WINDOW_CLOSE_HOUR } from "@/lib/meals";
import type { CalendarEvent } from "@/lib/types";
import { parseTimeToMinutes } from "@/lib/notifications";

export interface PlannedNotification {
  id: string;
  time: string;
  title: string;
  body: string;
  kind: "meal" | "water" | "protocol";
}

export interface NotificationPlanInput {
  now?: Date;
  events?: CalendarEvent[];
  hydrationMl?: number;
  isFastingDay?: boolean;
  mealLeadMinutes?: number;
  waterRemindersPerDay?: number;
}

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getTodayEvents(events: CalendarEvent[], now: Date): CalendarEvent[] {
  return events.filter((ev) => {
    try {
      return isSameDay(parseISO(ev.start), now);
    } catch {
      return false;
    }
  });
}

function isBusyNearMinute(
  events: CalendarEvent[],
  minuteOfDay: number,
  windowMin = 25
): CalendarEvent | null {
  const dayStart = startOfDay(new Date());
  const target = new Date(dayStart);
  target.setMinutes(minuteOfDay);

  for (const ev of events) {
    if (!ev.isBusy || ev.isAllDay) continue;
    try {
      const start = parseISO(ev.start);
      const diffMin = (start.getTime() - target.getTime()) / 60_000;
      if (diffMin >= -windowMin && diffMin <= windowMin) {
        return ev;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function calendarHint(
  events: CalendarEvent[],
  reminderMinute: number
): string {
  const conflict = isBusyNearMinute(events, reminderMinute, 35);
  if (!conflict) return "";

  try {
    const start = parseISO(conflict.start);
    return ` · Kalendár ${format(start, "HH:mm")}: ${conflict.title}`;
  } catch {
    return ` · Kalendár: ${conflict.title}`;
  }
}

const WATER_BODIES = [
  "Doplň vodu — malé dávky počas dňa fungujú najlepšie.",
  "Čas na hydratáciu. +300 ml ťa posunie bližšie k cieľu.",
  "Protokol vody: vypi pohár teraz, nie až večer naraz.",
  "Pripomienka vody — skontroluj dnešný objem v záložke VODA.",
];

function pickWaterTimes(
  dateKey: string,
  count: number,
  startMin: number,
  endMin: number
): number[] {
  const rand = seededRandom(`${dateKey}-water`);
  const slots: number[] = [];
  const span = endMin - startMin;
  const attempts = count * 8;

  for (let i = 0; i < attempts && slots.length < count; i++) {
    const candidate = startMin + Math.floor(rand() * span);
    const rounded = Math.floor(candidate / 15) * 15;
    const tooClose = slots.some((s) => Math.abs(s - rounded) < 75);
    if (!tooClose) slots.push(rounded);
  }

  return slots.sort((a, b) => a - b);
}

export function buildNotificationPlan(
  input: NotificationPlanInput = {}
): PlannedNotification[] {
  const now = input.now ?? new Date();
  const dateKey = format(now, "yyyy-MM-dd");
  const todayEvents = getTodayEvents(input.events ?? [], now);
  const lead = input.mealLeadMinutes ?? 30;
  const hydrationMl = input.hydrationMl ?? 0;
  const hydrationPct = Math.round((hydrationMl / HYDRATION_GOAL_ML) * 100);
  const plan: PlannedNotification[] = [];

  if (!input.isFastingDay) {
    for (const block of MEAL_PLAN_BLOCKS) {
      const mealMin = parseTimeToMinutes(block.time);
      const remindMin = mealMin - lead;
      if (remindMin < 6 * 60) continue;

      const hint = calendarHint(todayEvents, remindMin);
      const optional = block.optional ? " (voliteľné)" : "";

      plan.push({
        id: `meal-${block.id}-lead`,
        time: minutesToTime(remindMin),
        kind: "meal",
        title: `${APP_NAME} · Jedlo o ${block.time}`,
        body: `Za ${lead} min: ${block.label}${optional}.${hint}`,
      });
    }

    plan.push({
      id: "window-close",
      time: `${String(EATING_WINDOW_CLOSE_HOUR).padStart(2, "0")}:00`,
      kind: "protocol",
      title: `${APP_NAME} · Koniec jedenia`,
      body: `16:8 okno sa zatvára — posledné jedlo do ${EATING_WINDOW_CLOSE_HOUR}:00.${calendarHint(todayEvents, EATING_WINDOW_CLOSE_HOUR * 60)}`,
    });
  } else {
    plan.push({
      id: "fasting-day",
      time: "12:00",
      kind: "protocol",
      title: `${APP_NAME} · Fasting deň`,
      body: "Dnes bez jedla — voda a protokol podľa plánu.",
    });
  }

  if (hydrationMl < HYDRATION_GOAL_ML * 0.85) {
    const waterCount = input.waterRemindersPerDay ?? 3;
    const rand = seededRandom(`${dateKey}-water-msg`);
    const times = pickWaterTimes(dateKey, waterCount, 10 * 60, 17 * 60 + 30);

    times.forEach((min, index) => {
      if (isBusyNearMinute(todayEvents, min, 20)) return;

      const msg =
        WATER_BODIES[Math.floor(rand() * WATER_BODIES.length)] ??
        WATER_BODIES[0];

      plan.push({
        id: `water-${dateKey}-${index}`,
        time: minutesToTime(min),
        kind: "water",
        title: `${APP_NAME} · Voda (${hydrationPct} % cieľa)`,
        body: msg,
      });
    });

    plan.push({
      id: "water-deadline",
      time: "18:30",
      kind: "water",
      title: `${APP_NAME} · Voda pred večerom`,
      body: `Do ${EATING_WINDOW_CLOSE_HOUR}:00 doplň aspoň 80 % denného cieľa (4 L). Teraz ${hydrationPct} %.`,
    });
  }

  return plan.sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  );
}
