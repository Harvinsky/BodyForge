import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { mergeCookieOptions } from "@/lib/security/cookies";

type AuthSuccess = { userId: string };
type AuthFailure = { response: NextResponse };

export async function requireApiUser(): Promise<
  AuthSuccess | AuthFailure
> {
  if (!isSupabaseConfigured()) {
    return {
      response: NextResponse.json(
        { error: "Supabase nie je nakonfigurované" },
        { status: 503 }
      ),
    };
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
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: "Prihlásenie je povinné", configured: true, events: [] },
        { status: 401 }
      ),
    };
  }

  return { userId: user.id };
}
