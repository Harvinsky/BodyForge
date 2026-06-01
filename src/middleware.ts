import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applySecurityHeaders } from "@/lib/security/headers";
import { httpsRedirectIfNeeded } from "@/lib/security/redirect";

export async function middleware(request: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
