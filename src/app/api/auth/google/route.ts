import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildGoogleAuthUrl,
  isDirectGoogleOAuthConfigured,
} from "@/lib/google-oauth-config";
import { mergeCookieOptions } from "@/lib/security/cookies";

const STATE_COOKIE = "bodyforge_google_oauth_state";

export async function GET(request: Request) {
  if (!isDirectGoogleOAuthConfigured()) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "auth");
    login.searchParams.set(
      "message",
      "Chýba GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET v .env.local"
    );
    return NextResponse.redirect(login);
  }

  const reqUrl = new URL(request.url);
  const hostHeader = request.headers.get("host") ?? reqUrl.host;
  const origin = `${reqUrl.protocol}//${hostHeader}`;
  const state = randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(
    STATE_COOKIE,
    state,
    mergeCookieOptions({
      httpOnly: true,
      maxAge: 600,
      sameSite: "lax",
      path: "/",
      secure: origin.startsWith("https"),
    })
  );

  return NextResponse.redirect(buildGoogleAuthUrl(origin, state));
}
