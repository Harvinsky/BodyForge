import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applySecurityHeaders } from "@/lib/security/headers";
import { httpsRedirectIfNeeded } from "@/lib/security/redirect";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const oauthError =
    searchParams.get("error_code") ?? searchParams.get("error");
  if (
    (pathname === "/" || pathname === "/login") &&
    oauthError &&
    (searchParams.get("error_description") ||
      searchParams.get("error_code") === "bad_oauth_callback")
  ) {
    // Only pass safe, known error codes — never forward user-controlled error_description
    const errorCode = searchParams.get("error_code") === "bad_oauth_callback"
      ? "bad_oauth_callback"
      : "auth_error";
    const loginUrl = new URL(`/login?error=auth&error_code=${errorCode}`, request.url);
    const redirect = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirect);
    return redirect;
  }

  const httpsRedirect = httpsRedirectIfNeeded(request);
  if (httpsRedirect) {
    applySecurityHeaders(httpsRedirect);
    return httpsRedirect;
  }

  const response = await updateSession(request);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    // Exclude static assets, image optimiser, auth callbacks and OAuth API routes
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api/auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
