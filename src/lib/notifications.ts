import { APP_NAME } from "@/lib/brand";

export interface ScheduledNotification {
  id: string;
  time: string;
  title: string;
  body: string;
}

/** Záložný plán, ak ešte nie je načítaný kontext (hydratácia / kalendár). */
export const NOTIFICATION_SCHEDULE: ScheduledNotification[] = [
  {
    id: "window-open-fallback",
    time: "11:30",
    title: `${APP_NAME} · Jedlo o 12:00`,
    body: "Za 30 min otváraš jedálne okno (16:8).",
  },
  {
    id: "window-close-fallback",
    time: "19:00",
    title: `${APP_NAME} · Koniec jedenia`,
    body: "Koniec jedenia — začína fasting okno.",
  },
];

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function shouldFireNotification(
  notificationId: string,
  scheduledTime: string,
  firedIdsToday: string[],
  todayKey: string,
  windowMinutes = 3
): boolean {
  const firedKey = `${todayKey}-${notificationId}`;
  if (firedIdsToday.includes(firedKey)) {
    return false;
  }

  const current = getCurrentMinutes();
  const target = parseTimeToMinutes(scheduledTime);

  return current >= target && current < target + windowMinutes;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    return Notification.requestPermission();
  }

  return Notification.permission;
}

export function showNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: title,
  });
}
