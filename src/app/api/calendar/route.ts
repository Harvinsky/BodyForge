import { NextResponse } from "next/server";
import {
  fetchUpcomingEventsForUser,
} from "@/lib/google-calendar";
import { requireApiUser } from "@/lib/security/api-auth";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mergeCookieOptions } from "@/lib/security/cookies";

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) {
    return auth.response;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, mergeCookieOptions(options))
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  if (!providerToken) {
    return NextResponse.json({
      configured: false,
      error:
        "Google Calendar nie je pripojeny k tomuto uctu. Odhlas sa a prihlas sa cez Google znova.",
      events: [],
    });
  }

  try {
    const events = await fetchUpcomingEventsForUser(providerToken, 80);
    return NextResponse.json({
      configured: true,
      events,
      meta: { count: events.length },
    });
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
