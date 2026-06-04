import { Capacitor } from "@capacitor/core";
import {
  eachDayOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";

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

export type StepsByDateResult = StepSyncResult & {
  byDate: Map<string, number>;
};

const LAST_SYNC_KEY = "bodyforge-steps-last-sync";
const MAX_HISTORY_SYNC_DAYS = 120;

type HealthConnectModule = typeof import("capacitor-health-connect");

let healthConnectModule: HealthConnectModule | null = null;

async function getHealthConnect(): Promise<HealthConnectModule["HealthConnect"]> {
  if (!healthConnectModule) {
    healthConnectModule = await import("capacitor-health-connect");
  }
  return healthConnectModule.HealthConnect;
}

function stepRecordDateKey(record: {
  startTime?: Date | string;
  endTime?: Date | string;
}): string {
  const raw = record.startTime ?? record.endTime;
  if (!raw) return format(startOfDay(new Date()), "yyyy-MM-dd");
  const parsed = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return format(startOfDay(new Date()), "yyyy-MM-dd");
  }
  return format(startOfDay(parsed), "yyyy-MM-dd");
}

async function ensureHealthConnectReady(): Promise<StepSyncResult | null> {
  const HealthConnect = await getHealthConnect();
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

  return null;
}

async function readStepsRecordsInRange(
  rangeStart: Date,
  rangeEnd: Date
): Promise<Map<string, number>> {
  const HealthConnect = await getHealthConnect();
  const byDate = new Map<string, number>();
  let pageToken: string | undefined;

  do {
    const page = await HealthConnect.readRecords({
      type: "Steps",
      timeRangeFilter: {
        type: "between",
        startTime: rangeStart,
        endTime: rangeEnd,
      },
      pageSize: 500,
      pageToken,
    });

    for (const record of page.records) {
      if (record.type === "Steps") {
        const key = stepRecordDateKey(record);
        byDate.set(key, (byDate.get(key) ?? 0) + record.count);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return byDate;
}

function clampHistoryRange(
  startDate: string,
  endDate: string
): { start: Date; end: Date; dates: string[] } | null {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const dates = eachDayOfInterval({ start, end }).map((d) =>
    format(d, "yyyy-MM-dd")
  );
  if (dates.length > MAX_HISTORY_SYNC_DAYS) {
    const trimmed = dates.slice(-MAX_HISTORY_SYNC_DAYS);
    return {
      start: startOfDay(parseISO(trimmed[0]!)),
      end: endOfDay(parseISO(trimmed[trimmed.length - 1]!)),
      dates: trimmed,
    };
  }

  return {
    start: startOfDay(start),
    end: endOfDay(end),
    dates,
  };
}

/** Kroky z Health Connect pre jeden deň (ISO dátum). */
export async function readStepsForDate(
  dateIso: string
): Promise<StepsByDateResult | null> {
  if (typeof window === "undefined") return null;

  if (!Capacitor.isNativePlatform()) {
    return {
      steps: 0,
      source: "unavailable",
      message:
        "Automatické kroky fungujú v Android appke cez Health Connect. V prehliadači môžeš doplniť ručne (záloha).",
      byDate: new Map(),
    };
  }

  try {
    const blocked = await ensureHealthConnectReady();
    if (blocked) return { ...blocked, byDate: new Map() };

    const day = parseISO(dateIso);
    const byDate = await readStepsRecordsInRange(
      startOfDay(day),
      endOfDay(day)
    );
    const steps = byDate.get(dateIso) ?? 0;
    if (steps > 0) markStepsSynced();

    return {
      steps,
      source: "health_connect",
      message: `Sync z Health Connect · ${steps.toLocaleString("sk-SK")} krokov`,
      byDate,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "neznáma chyba";
    return {
      steps: 0,
      source: "unavailable",
      message: `Sync krokov zlyhal: ${detail}`,
      byDate: new Map(),
    };
  }
}

/** Kroky pre každý deň v rozsahu (max ${MAX_HISTORY_SYNC_DAYS} dní). */
export async function readStepsForDateRange(
  startDate: string,
  endDate: string
): Promise<StepsByDateResult | null> {
  if (typeof window === "undefined") return null;

  if (!Capacitor.isNativePlatform()) {
    return {
      steps: 0,
      source: "unavailable",
      message:
        "Automatické kroky fungujú v Android appke cez Health Connect. V prehliadači môžeš doplniť ručne (záloha).",
      byDate: new Map(),
    };
  }

  const range = clampHistoryRange(startDate, endDate);
  if (!range) {
    return {
      steps: 0,
      source: "unavailable",
      message: "Neplatný rozsah dátumov pre sync krokov.",
      byDate: new Map(),
    };
  }

  try {
    const blocked = await ensureHealthConnectReady();
    if (blocked) return { ...blocked, byDate: new Map() };

    const allByDate = await readStepsRecordsInRange(range.start, range.end);
    const byDate = new Map<string, number>();
    for (const date of range.dates) {
      const count = allByDate.get(date) ?? 0;
      if (count > 0) byDate.set(date, count);
    }

    const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
    const todaySteps = byDate.get(todayKey) ?? 0;
    if (byDate.size > 0) markStepsSynced();

    return {
      steps: todaySteps,
      source: "health_connect",
      message:
        byDate.size > 0
          ? `Sync z Health Connect · ${byDate.size} dní s krokmi`
          : "Health Connect nemá v tomto období žiadne kroky.",
      byDate,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "neznáma chyba";
    return {
      steps: 0,
      source: "unavailable",
      message: `Sync krokov zlyhal: ${detail}`,
      byDate: new Map(),
    };
  }
}

/** Načíta dnešné kroky z telefónu (Health Connect) v natívnej appke. */
export async function syncTodayStepsFromDevice(): Promise<StepSyncResult | null> {
  const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
  const result = await readStepsForDate(todayKey);
  if (!result) return null;
  return {
    steps: result.byDate.get(todayKey) ?? result.steps,
    source: result.source,
    message:
      result.source === "health_connect"
        ? `Sync z Health Connect · ${(result.byDate.get(todayKey) ?? 0).toLocaleString("sk-SK")} krokov dnes`
        : result.message,
  };
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
