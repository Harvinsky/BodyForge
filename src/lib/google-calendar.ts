import { google } from "googleapis";
import type { CalendarEvent } from "@/lib/types";

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function fetchUpcomingEvents(
  maxResults = 10
): Promise<CalendarEvent[]> {
  const auth = getOAuth2Client();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  if (!auth) {
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = response.data.items ?? [];

  return events.map((event) => {
    const start = event.start?.dateTime ?? event.start?.date ?? "";
    const end = event.end?.dateTime ?? event.end?.date ?? "";
    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);

    return {
      id: event.id ?? crypto.randomUUID(),
      title: event.summary ?? "Bez názvu",
      start,
      end,
      isBusy: event.transparency !== "transparent",
      isAllDay,
    };
  });
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}
