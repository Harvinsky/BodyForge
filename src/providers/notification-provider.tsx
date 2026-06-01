"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format } from "date-fns";
import { useCalendar } from "@/hooks/use-calendar";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useHydration } from "@/hooks/use-hydration";
import {
  buildNotificationPlan,
  type PlannedNotification,
} from "@/lib/notification-planner";
import {
  cancelNativeNotifications,
  ensureNativeNotificationPermission,
  isNativeApp,
  syncNativeNotificationSchedule,
} from "@/lib/notification-native";
import {
  NOTIFICATION_SCHEDULE,
  requestNotificationPermission,
  shouldFireNotification,
  showNotification,
} from "@/lib/notifications";

const ENABLED_KEY = "t800-notifications-enabled";
const FIRED_KEY = "t800-notifications-fired-ids";

interface NotificationContextValue {
  enabled: boolean;
  permission: NotificationPermission;
  supported: boolean;
  isNative: boolean;
  todayPlan: PlannedNotification[];
  enableNotifications: () => Promise<void>;
  disableNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

function loadFiredIds(todayKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed[todayKey] ?? [];
  } catch {
    return [];
  }
}

function markFired(todayKey: string, firedKey: string): void {
  const all: Record<string, string[]> = {};
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (raw) Object.assign(all, JSON.parse(raw));
  } catch {
    // ignore
  }
  const list = new Set(all[todayKey] ?? []);
  list.add(firedKey);
  all[todayKey] = [...list];
  localStorage.setItem(FIRED_KEY, JSON.stringify(all));
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);
  const native = isNativeApp();

  const { events } = useCalendar();
  const { totalMl } = useHydration();
  const { tasks } = useDailyTracker();

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const todayPlan = useMemo(
    () =>
      buildNotificationPlan({
        now: new Date(),
        events,
        hydrationMl: totalMl,
        isFastingDay: tasks.is_fasting_day,
        mealLeadMinutes: 30,
        waterRemindersPerDay: 3,
      }),
    [events, totalMl, tasks.is_fasting_day]
  );

  const schedule: PlannedNotification[] =
    todayPlan.length > 0
      ? todayPlan
      : NOTIFICATION_SCHEDULE.map((item) => ({
          ...item,
          kind: "protocol" as const,
        }));

  useEffect(() => {
    const browserSupported =
      typeof window !== "undefined" && "Notification" in window;
    setSupported(native || browserSupported);

    if (localStorage.getItem(ENABLED_KEY) === "true") {
      setEnabled(true);
    }

    if (native) {
      void ensureNativeNotificationPermission().then((ok) => {
        setPermission(ok ? "granted" : "default");
      });
      return;
    }

    if (browserSupported) {
      setPermission(Notification.permission);
    }
  }, [native]);

  const enableNotifications = useCallback(async () => {
    if (native) {
      const ok = await ensureNativeNotificationPermission();
      setPermission(ok ? "granted" : "denied");
      if (ok) {
        setEnabled(true);
        localStorage.setItem(ENABLED_KEY, "true");
        await syncNativeNotificationSchedule(schedule);
      }
      return;
    }

    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
      localStorage.setItem(ENABLED_KEY, "true");
    }
  }, [native, schedule]);

  const disableNotifications = useCallback(() => {
    setEnabled(false);
    localStorage.setItem(ENABLED_KEY, "false");
    if (native) {
      void cancelNativeNotifications();
    }
  }, [native]);

  useEffect(() => {
    if (!enabled) return;

    if (native) {
      void syncNativeNotificationSchedule(schedule);
      return;
    }

    if (permission !== "granted") return;

    const tick = () => {
      const fired = loadFiredIds(todayKey);

      for (const item of schedule) {
        if (
          shouldFireNotification(item.id, item.time, fired, todayKey)
        ) {
          showNotification(item.title, item.body);
          markFired(todayKey, `${todayKey}-${item.id}`);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [enabled, permission, schedule, todayKey, native]);

  const value = useMemo(
    () => ({
      enabled,
      permission,
      supported,
      isNative: native,
      todayPlan: schedule,
      enableNotifications,
      disableNotifications,
    }),
    [
      enabled,
      permission,
      supported,
      native,
      schedule,
      enableNotifications,
      disableNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return ctx;
}
