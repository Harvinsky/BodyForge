import { APP_NAME } from "@/lib/brand";import {
  DEFAULT_EATING_WINDOW,
  formatEatingWindowLabel,
  parseTimeToMinutes,
} from "@/lib/eating-window";

export { parseTimeToMinutes } from "@/lib/eating-window";

/** Záložný plán, ak ešte nie je načítaný kontext (hydratácia / kalendár). */
export const NOTIFICATION_SCHEDULE = [
  {
    id: "window-open-fallback",
    time: "11:30",
    title: `${APP_NAME} · Jedlo o ${DEFAULT_EATING_WINDOW.start}`,
    body: `Za 30 min otváraš jedálne okno (${formatEatingWindowLabel(DEFAULT_EATING_WINDOW)}).`,
  },
  {
    id: "window-close-fallback",
    time: DEFAULT_EATING_WINDOW.end,
    title: `${APP_NAME} · Koniec jedenia`,
    body: "Koniec jedenia — začína fasting okno.",
  },
];

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

/** Prehliadačové notifikácie fungujú len na localhost / HTTPS. */
export function canUseBrowserNotifications(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  return window.isSecureContext === true;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseBrowserNotifications()) {
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
