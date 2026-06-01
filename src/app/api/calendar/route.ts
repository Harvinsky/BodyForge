import { NextResponse } from "next/server";
import {
  fetchUpcomingEvents,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";
import { requireApiUser } from "@/lib/security/api-auth";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) {
    return auth.response;
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({
      configured: false,
      events: [],
    });
  }

  try {
    const events = await fetchUpcomingEvents(12);
    return NextResponse.json({ configured: true, events });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chyba pri načítaní Google Calendar",
        configured: true,
        events: [],
      },
      { status: 500 }
    );
  }
}
