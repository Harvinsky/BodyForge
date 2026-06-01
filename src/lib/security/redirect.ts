import type { NextRequest } from "next/server";
import { isProduction } from "@/lib/security/env";

/** Block open redirects after OAuth — only same-origin paths. */
export function safeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

/** Force HTTPS on Vercel/production when proxy reports HTTP. */
export function httpsRedirectIfNeeded(request: NextRequest): Response | null {
  if (!isProduction()) return null;

  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");
  if (proto !== "http" || !host) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  return Response.redirect(url, 308);
}
