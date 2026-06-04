import { format, isSameDay, parseISO, startOfDay } from "date-fns";

import { APP_NAME } from "@/lib/brand";

import {
  formatEatingWindowLabel,
  formatEatingWindowRange,
  parseTimeToMinutes,
  type EatingWindow,
} from "@/lib/eating-window";

import { HYDRATION_GOAL_ML } from "@/lib/hydration";

import { buildMealPlanBlocks, type MealBlock } from "@/lib/meal-plan-protocol";

import type { CalendarEvent } from "@/lib/types";



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

  hydrationGoalMl?: number;

  isFastingDay?: boolean;

  mealLeadMinutes?: number;

  waterRemindersPerDay?: number;

  eatingWindow?: EatingWindow | null;

  mealBlocks?: MealBlock[];

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

  const window = input.eatingWindow ?? null;

  const dateKey = format(now, "yyyy-MM-dd");
  const todayEvents = getTodayEvents(input.events ?? [], now);
  const lead = input.mealLeadMinutes ?? 30;
  const hydrationMl = input.hydrationMl ?? 0;
  const hydrationGoalMl = input.hydrationGoalMl ?? HYDRATION_GOAL_ML;
  const hydrationPct = Math.round((hydrationMl / hydrationGoalMl) * 100);
  const plan: PlannedNotification[] = [];

  if (!input.isFastingDay && window) {
    const windowLabel = formatEatingWindowLabel(window);
    const windowRange = formatEatingWindowRange(window);
    const endMin = parseTimeToMinutes(window.end);

    const blocks = input.mealBlocks ?? buildMealPlanBlocks(window);

    for (const block of blocks) {

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
      time: window.end,
      kind: "protocol",
      title: `${APP_NAME} · Koniec jedenia`,
      body: `${windowLabel} okno sa zatvára (${windowRange}) — posledné jedlo do ${window.end}.${calendarHint(todayEvents, endMin)}`,
    });
  } else if (input.isFastingDay) {
    plan.push({
      id: "fasting-day",
      time: window?.start ?? "08:00",
      kind: "protocol",
      title: `${APP_NAME} · Fasting deň`,
      body: "Dnes bez jedla — voda a protokol podľa plánu.",
    });
  }



  if (hydrationMl < hydrationGoalMl * 0.85) {

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



    if (window) {
      plan.push({
        id: "water-deadline",
        time: window.end,
        kind: "water",
        title: `${APP_NAME} · Posledná voda`,
        body: `Do ${window.end} doplň aspoň 80 % denného cieľa (${(hydrationGoalMl / 1000).toFixed(1).replace(".0", "")} L). Teraz ${hydrationPct} %.`,
      });
    }
  }



  return plan.sort(

    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)

  );

}


