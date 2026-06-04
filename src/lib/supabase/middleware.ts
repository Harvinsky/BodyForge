import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { mergeCookieOptions } from "@/lib/security/cookies";

const AUTH_MIDDLEWARE_MS = 5_000;

async function getUserWithTimeout(
  supabase: ReturnType<typeof createServerClient>
): Promise<void> {
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("auth_timeout")), AUTH_MIDDLEWARE_MS);
      }),
    ]);
  } catch {
    // Supabase pomalý / offline — stránka sa načíta, auth doplní klient.
  }
}

export async function updateSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Per Supabase SSR docs: first mutate request cookies, then rebuild
          // the response so session tokens survive middleware passthrough.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              mergeCookieOptions(options)
            )
          );
        },
      },
    }
  );

  await getUserWithTimeout(supabase);

  return supabaseResponse;
}
