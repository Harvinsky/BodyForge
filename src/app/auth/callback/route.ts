import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { mergeCookieOptions } from "@/lib/security/cookies";
import { safeRedirectPath } from "@/lib/security/redirect";

/** OAuth codes with "/" must be read from the raw query string. */
function extractAuthCode(request: NextRequest): string | null {
  const fromParams = request.nextUrl.searchParams.get("code");
  if (fromParams && fromParams.length > 20) {
    return fromParams;
  }

  const search = request.nextUrl.search;
  const match = search.match(/(?:^|[?&])code=([^&]+)/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  return fromParams;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const next = safeRedirectPath(searchParams.get("next"));

  if (oauthError) {
    const message = encodeURIComponent(
      errorDescription ?? oauthError
    );
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${message}`
    );
  }

  const code = extractAuthCode(request);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth&message=no_code`);
  }

  // Google auth codes start with "4/" — must NOT land on the app directly
  if (code.startsWith("4/")) {
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent(
        "Chybný OAuth tok: v Google Cloud → Redirect URIs musí byť len Supabase callback (…/auth/v1/callback), nie URL tejto appky."
      )}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=missing_env`
    );
  }

  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.redirect(`${origin}${next}`);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, mergeCookieOptions(options))
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    let hint = error.message;
    if (error.message.includes("Unable to exchange external code")) {
      hint +=
        " → V Supabase → Google skontroluj Client ID + ENABLED Client Secret (…rfwn). V Google Redirect URIs LEN Supabase callback, nie localhost.";
    }
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent(hint)}`
    );
  }

  return response;
}
