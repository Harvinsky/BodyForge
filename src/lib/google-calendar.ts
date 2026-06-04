import { addDays, startOfDay } from "date-fns";
import { google } from "googleapis";
import type { CalendarEvent } from "@/lib/types";

const GRID_DAYS = 5;

function getOAuth2Client(accessToken: string) {
  if (!accessToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

function mapGoogleEvent(
  event: {
    id?: string | null;
    summary?: string | null;
    start?: { dateTime?: string | null; date?: string | null } | null;
    end?: { dateTime?: string | null; date?: string | null } | null;
    transparency?: string | null;
  },
  calendarId: string
): CalendarEvent | null {
  const start = event.start?.dateTime ?? event.start?.date ?? "";
  const end = event.end?.dateTime ?? event.end?.date ?? "";
  if (!start) return null;

  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
  const eventId = event.id ?? crypto.randomUUID();

  return {
    id: `${calendarId}::${eventId}`,
    title: event.summary ?? "Bez názvu",
    start,
    end,
    isBusy: event.transparency !== "transparent",
    isAllDay,
  };
}

async function resolveCalendarIds(
  calendar: ReturnType<typeof google.calendar>
): Promise<string[]> {
  const multi = process.env.GOOGLE_CALENDAR_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (multi?.length) return multi;

  const single = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (single && single !== "primary") return [single];

  try {
    const list = await calendar.calendarList.list({
      minAccessRole: "reader",
      maxResults: 100,
      showHidden: false,
    });
    const items = list.data.items ?? [];
    const selected = items
      .filter((c) => c.selected !== false && c.id)
      .map((c) => c.id as string);

    if (selected.length > 0) return selected;
  } catch (error) {
    console.warn("Calendar list failed, falling back to primary:", error);
  }

  return ["primary"];
}

export async function fetchUpcomingEventsForUser(
  accessToken: string,
  maxResults = 80
): Promise<CalendarEvent[]> {
  const auth = getOAuth2Client(accessToken);
  if (!auth) return [];

  const calendar = google.calendar({ version: "v3", auth });
  const calendarIds = await resolveCalendarIds(calendar);

  const timeMin = startOfDay(new Date()).toISOString();
  const timeMax = addDays(startOfDay(new Date()), GRID_DAYS + 1).toISOString();

  const perCalendar = Math.max(
    15,
    Math.ceil(maxResults / Math.max(1, calendarIds.length))
  );

  const fetchAll = Promise.all(
    calendarIds.map(async (calendarId) => {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults: perCalendar,
          singleEvents: true,
          orderBy: "startTime",
          showDeleted: false,
        });
        return (response.data.items ?? [])
          .map((item) => mapGoogleEvent(item, calendarId))
          .filter((e): e is CalendarEvent => e !== null);
      } catch (error) {
        console.warn(`Calendar ${calendarId} fetch failed:`, error);
        return [] as CalendarEvent[];
      }
    })
  );

  const timeout = new Promise<CalendarEvent[][]>((_, reject) => {
    setTimeout(() => reject(new Error("calendar_fetch_timeout")), 12_000);
  });

  let batches: CalendarEvent[][];
  try {
    batches = await Promise.race([fetchAll, timeout]);
  } catch {
    batches = [];
  }

  const merged = batches
    .flat()
    .sort((a, b) => {
      try {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, maxResults);

  return merged;
}

export function isGoogleCalendarConfigured(): boolean {
  return true;
}
