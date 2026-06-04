import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

let initialized = false;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function getWebClientId(): string | null {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim() ||
    null
  );
}

async function ensureGoogleAuthInitialized(): Promise<void> {
  if (initialized) return;

  const clientId = getWebClientId();
  if (!clientId) {
    throw new Error(
      "Chýba NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID v .env.local (Web Client ID z Google Cloud)."
    );
  }

  await GoogleAuth.initialize({
    clientId,
    scopes: ["profile", "email", CALENDAR_SCOPE],
    grantOfflineAccess: true,
  });

  initialized = true;
}

export async function signInWithGoogleNative(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  if (!isNativeApp()) {
    return { error: "Natívne prihlásenie je len v Android appke." };
  }

  try {
    await ensureGoogleAuthInitialized();
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication?.idToken;
    const accessToken = result.authentication?.accessToken;

    if (!idToken) {
      return { error: "Google nevrátilo prihlasovací token." };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      access_token: accessToken,
    });

    if (error) {
      return {
        error: `${error.message} — v Supabase musí byť Google provider s rovnakým Web Client ID.`,
      };
    }

    return { error: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Natívne Google prihlásenie zlyhalo.";
    return { error: message };
  }
}
