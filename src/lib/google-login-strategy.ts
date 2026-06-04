import type { SupabaseClient } from "@supabase/supabase-js";

import { isDirectGoogleOAuthConfigured } from "@/lib/google-oauth-config";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/** Direct Google OAuth redirect URIs work only on localhost — not on LAN IP. */
export function isLocalhostBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export function canUseDirectGoogleOAuth(): boolean {
  return isLocalhostBrowser() && isDirectGoogleOAuthConfigured();
}

/** Browser Google login — direct on localhost, Supabase OAuth elsewhere (LAN / mobile Chrome). */
export async function signInWithGoogleBrowser(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  if (canUseDirectGoogleOAuth()) {
    window.location.href = "/api/auth/google";
    return { error: null };
  }

  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: CALENDAR_SCOPE,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  return { error: error?.message ?? null };
}
