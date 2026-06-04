import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { PlannedNotification } from "@/lib/notification-planner";
import { parseTimeToMinutes } from "@/lib/eating-window";

const CHANNEL_ID = "bodyforge-reminders";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function notificationIdFromPlanId(planId: string): number {
  let hash = 0;
  for (let i = 0; i < planId.length; i++) {
    hash = (hash << 5) - hash + planId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1_000_000) + 1;
}

function scheduleAtToday(time: string): Date | null {
  const now = new Date();
  const minutes = parseTimeToMinutes(time);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const at = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0
  );
  if (at.getTime() <= now.getTime()) {
    return null;
  }
  return at;
}

async function ensureNotificationChannel(): Promise<void> {
  if (!isNativeApp()) return;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "BodyForge pripomienky",
    description: "Jedlo, voda a denný protokol",
    importance: 4,
    visibility: 1,
    vibration: true,
  });
}

export async function ensureNativeNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;

  const { display } = await LocalNotifications.checkPermissions();
  if (display === "granted") return true;

  const req = await LocalNotifications.requestPermissions();
  return req.display === "granted";
}

export async function syncNativeNotificationSchedule(
  plan: PlannedNotification[]
): Promise<void> {
  if (!isNativeApp()) return;

  const ok = await ensureNativeNotificationPermission();
  if (!ok) return;

  await ensureNotificationChannel();

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }

  const notifications = plan
    .map((item) => {
      const at = scheduleAtToday(item.time);
      if (!at) return null;
      return {
        id: notificationIdFromPlanId(item.id),
        title: item.title,
        body: item.body,
        channelId: CHANNEL_ID,
        schedule: { at, allowWhileIdle: true },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

export async function cancelNativeNotifications(): Promise<void> {
  if (!isNativeApp()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length === 0) return;
  await LocalNotifications.cancel({
    notifications: pending.notifications.map((n) => ({ id: n.id })),
  });
}
