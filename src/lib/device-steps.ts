import { Capacitor } from "@capacitor/core";
import { endOfDay, format, startOfDay } from "date-fns";

export type StepSyncSource =
  | "health_connect"
  | "stored"
  | "manual"
  | "unavailable";

export type StepSyncResult = {
  steps: number;
  source: StepSyncSource;
  message: string;
};

const LAST_SYNC_KEY = "bodyforge-steps-last-sync";

async function sumTodayStepsFromHealthConnect(): Promise<StepSyncResult> {
  const { HealthConnect } = await import("capacitor-health-connect");
  const { availability } = await HealthConnect.checkAvailability();

  if (availability === "NotInstalled") {
    return {
      steps: 0,
      source: "unavailable",
      message:
        "Nainštaluj Health Connect z Google Play (potom znova otvor appku a povol kroky).",
    };
  }

  if (availability === "NotSupported") {
    return {
      steps: 0,
      source: "unavailable",
      message: "Toto zariadenie nepodporuje Health Connect.",
    };
  }

  const permCheck = await HealthConnect.checkHealthPermissions({
    read: ["Steps"],
    write: [],
  });

  if (!permCheck.hasAllPermissions) {
    const permReq = await HealthConnect.requestHealthPermissions({
      read: ["Steps"],
      write: [],
    });
    if (!permReq.hasAllPermissions) {
      return {
        steps: 0,
        source: "unavailable",
        message:
          "Bez povolenia krokov v Health Connect sync nefunguje — otvor Nastavenia → Health Connect.",
      };
    }
  }

  const startTime = startOfDay(new Date());
  const endTime = endOfDay(new Date());
  let total = 0;
  let pageToken: string | undefined;

  do {
    const page = await HealthConnect.readRecords({
      type: "Steps",
      timeRangeFilter: { type: "between", startTime, endTime },
      pageSize: 500,
      pageToken,
    });

    for (const record of page.records) {
      if (record.type === "Steps") {
        total += record.count;
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  markStepsSynced();
  return {
    steps: total,
    source: "health_connect",
    message: `Sync z Health Connect · ${total.toLocaleString("sk-SK")} krokov dnes`,
  };
}

/** Načíta dnešné kroky z telefónu (Health Connect) v natívnej appke. */
export async function syncTodayStepsFromDevice(): Promise<StepSyncResult | null> {
  if (typeof window === "undefined") return null;

  if (!Capacitor.isNativePlatform()) {
    return {
      steps: 0,
      source: "unavailable",
      message:
        "Automatické kroky fungujú v Android appke cez Health Connect. V prehliadači môžeš doplniť ručne (záloha).",
    };
  }

  try {
    return await sumTodayStepsFromHealthConnect();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "neznáma chyba";
    return {
      steps: 0,
      source: "unavailable",
      message: `Sync krokov zlyhal: ${detail}`,
    };
  }
}

export function markStepsSynced(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

export function lastStepsSyncLabel(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return format(d, "HH:mm");
  } catch {
    return null;
  }
}

export function todayDateKey(): string {
  return format(startOfDay(new Date()), "yyyy-MM-dd");
}
