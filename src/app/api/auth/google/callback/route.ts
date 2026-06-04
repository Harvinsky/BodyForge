import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeGoogleAuthCode,
  googleOAuthRedirectUri,
  isDirectGoogleOAuthConfigured,
} from "@/lib/google-oauth-config";
import { createClient } from "@/lib/supabase/server";

const STATE_COOKIE = "bodyforge_google_oauth_state";

function loginRedirect(request: Request, message: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "auth");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  if (!isDirectGoogleOAuthConfigured()) {
    return loginRedirect(
      request,
      "Google prihlásenie nie je nakonfigurované na serveri."
    );
  }

  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) {
    const desc =
      requestUrl.searchParams.get("error_description") ?? oauthError;
    return loginRedirect(request, desc);
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return loginRedirect(
      request,
      "Neplatná OAuth odpoveď — skús prihlásenie znova."
    );
  }

  // Use Host header for origin — Next.js dev mode may normalise request.url
  // to localhost even when the client connected via a LAN IP.
  const hostHeader = request.headers.get("host") ?? requestUrl.host;
  const origin = `${requestUrl.protocol}//${hostHeader}`;
  const redirectUri = googleOAuthRedirectUri(origin);

  const tokens = await exchangeGoogleAuthCode(code, redirectUri);
  if (!tokens.id_token) {
    return loginRedirect(
      request,
      tokens.error_description ??
        tokens.error ??
        "Google nevrátilo prihlasovací token."
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokens.id_token,
    access_token: tokens.access_token,
  });

  if (error) {
    return loginRedirect(
      request,
      `${error.message} — v Supabase musí byť zapnutý Google provider s rovnakým Client ID.`
    );
  }

  return NextResponse.redirect(new URL("/", request.url));
}
