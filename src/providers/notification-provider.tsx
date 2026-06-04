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
import { useBodyGoal } from "@/hooks/use-body-goal";
import { useDailyTracker } from "@/hooks/use-daily-tracker";
import { useHydration } from "@/hooks/use-hydration";
import { eatingWindowFromSettings } from "@/lib/eating-window";
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
  canUseBrowserNotifications,
  requestNotificationPermission,
  shouldFireNotification,
  showNotification,
} from "@/lib/notifications";
import { useI18n } from "@/providers/locale-provider";

const ENABLED_KEY = "bodyforge-notifications-enabled";
const LEGACY_ENABLED_KEY = "t800-notifications-enabled";
const FIRED_KEY = "t800-notifications-fired-ids";

interface NotificationContextValue {
  enabled: boolean;
  permission: NotificationPermission;
  supported: boolean;
  canEnable: boolean;
  isNative: boolean;
  statusMessage: string | null;
  todayPlan: PlannedNotification[];
  enableNotifications: () => Promise<void>;
  disableNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(ENABLED_KEY) === "true") return true;
  return localStorage.getItem(LEGACY_ENABLED_KEY) === "true";
}

function writeStoredEnabled(value: boolean): void {
  localStorage.setItem(ENABLED_KEY, value ? "true" : "false");
  localStorage.setItem(LEGACY_ENABLED_KEY, value ? "true" : "false");
}

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
  const [canEnable, setCanEnable] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const native = isNativeApp();

  const { events } = useCalendar();
  const { totalMl } = useHydration();
  const { tasks } = useDailyTracker();
  const { settings } = useBodyGoal();
  const eatingWindow = eatingWindowFromSettings(settings);
  const { t } = useI18n();

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
        eatingWindow,
      }),
    [events, totalMl, tasks.is_fasting_day, settings.eatingWindowStart, settings.eatingWindowEnd]
  );

  const schedule: PlannedNotification[] = todayPlan;

  useEffect(() => {
    const browserOk = canUseBrowserNotifications();
    setSupported(true);
    setCanEnable(native || browserOk);

    const storedEnabled = readStoredEnabled();

    if (native) {
      void ensureNativeNotificationPermission().then((ok) => {
        setPermission(ok ? "granted" : "default");
        if (storedEnabled && ok) {
          setEnabled(true);
          setStatusMessage(null);
        } else if (storedEnabled && !ok) {
          setEnabled(false);
          writeStoredEnabled(false);
          setStatusMessage(t("notifications.nativePermission"));
        }
      });
      return;
    }

    if (browserOk) {
      setPermission(Notification.permission);
      if (storedEnabled && Notification.permission === "granted") {
        setEnabled(true);
        setStatusMessage(null);
      } else if (storedEnabled && Notification.permission !== "granted") {
        setEnabled(false);
        writeStoredEnabled(false);
      }
      return;
    }

    setPermission("denied");
    if (storedEnabled) {
      setEnabled(false);
      writeStoredEnabled(false);
    }
    setStatusMessage(t("notifications.browserBlocked"));
  }, [native, t]);

  const enableNotifications = useCallback(async () => {
    setStatusMessage(null);

    if (native) {
      const ok = await ensureNativeNotificationPermission();
      setPermission(ok ? "granted" : "denied");
      if (!ok) {
        setEnabled(false);
        writeStoredEnabled(false);
        setStatusMessage(t("notifications.nativeDenied"));
        return;
      }

      try {
        setEnabled(true);
        writeStoredEnabled(true);
        await syncNativeNotificationSchedule(schedule);
        setStatusMessage(t("notifications.nativeScheduled"));
      } catch {
        setEnabled(false);
        writeStoredEnabled(false);
        setStatusMessage(t("notifications.nativeScheduleFailed"));
      }
      return;
    }

    if (!canUseBrowserNotifications()) {
      setEnabled(false);
      writeStoredEnabled(false);
      setPermission("denied");
      setStatusMessage(t("notifications.browserUnsupported"));
      return;
    }

    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
      writeStoredEnabled(true);
      setStatusMessage(t("notifications.browserEnabled"));
      return;
    }

    setEnabled(false);
    writeStoredEnabled(false);
    setStatusMessage(
      result === "denied"
        ? t("notifications.browserDenied")
        : t("notifications.permissionDenied")
    );
  }, [native, schedule, t]);

  const disableNotifications = useCallback(() => {
    setEnabled(false);
    writeStoredEnabled(false);
    setStatusMessage(null);
    if (native) {
      void cancelNativeNotifications();
    }
  }, [native]);

  useEffect(() => {
    if (!enabled) return;

    if (native) {
      if (permission !== "granted") return;
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
      canEnable,
      isNative: native,
      statusMessage,
      todayPlan: schedule,
      enableNotifications,
      disableNotifications,
    }),
    [
      enabled,
      permission,
      supported,
      canEnable,
      native,
      statusMessage,
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
