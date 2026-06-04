import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mergeCookieOptions } from "@/lib/security/cookies";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  // In Next.js dev mode request.url may be normalised to localhost even when
  // the browser connected via a LAN IP.  Use the Host header so the final
  // redirect goes back to the same origin the client used.
  const hostHeader = request.headers.get("host") ?? requestUrl.host;
  const origin = `${requestUrl.protocol}//${hostHeader}`;

  // Chyba priamo z Google / Supabase OAuth
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const desc = searchParams.get("error_description") ?? oauthError;
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth");
    url.searchParams.set("message", desc);
    return NextResponse.redirect(url);
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth&message=no_code", origin));
  }

  // Detekcia Google OAuth kódu priamo (nie cez Supabase) — patrí do /api/auth/google/callback
  if (code.startsWith("4/")) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth");
    url.searchParams.set("message", "google_config_error");
    return NextResponse.redirect(url);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, mergeCookieOptions(options))
            );
          } catch {
            // Read-only context — ignoruj
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "auth");
    url.searchParams.set("message", error.message);
    return NextResponse.redirect(url);
  }

  // Úspešné prihlásenie → dashboard
  return NextResponse.redirect(new URL("/", origin));
}
