import { NextResponse, type NextRequest } from "next/server";
import { isProduction } from "@/lib/security/env";

function isPrivateOrLocalHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname) return false;
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return true;
  }

  if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
    return true;
  }

  const parts = hostname.split(".");
  if (parts.length === 4 && parts[0] === "172") {
    const second = Number(parts[1]);
    if (Number.isInteger(second) && second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

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
  if (isPrivateOrLocalHost(host)) return null;

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}
