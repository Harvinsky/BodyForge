/** Google OAuth — prihlásenie cez doménu appky (bez supabase.co v Google okne). */

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function resolveGoogleOAuthClientId(): string | undefined {
  return readEnv(
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_CLIENT_ID",
    "NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID"
  );
}

export function resolveGoogleOAuthClientSecret(): string | undefined {
  return readEnv("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET");
}

export function isDirectGoogleOAuthConfigured(): boolean {
  return Boolean(
    resolveGoogleOAuthClientId() && resolveGoogleOAuthClientSecret()
  );
}

export function googleOAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const clientId = resolveGoogleOAuthClientId()!;
  const redirectUri = googleOAuthRedirectUri(origin);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const clientId = resolveGoogleOAuthClientId()!;
  const clientSecret = resolveGoogleOAuthClientSecret()!;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return (await res.json()) as GoogleTokenResponse;
}

export function isDirectGoogleOAuthConfiguredPublic(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" ||
      process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim()
  );
}
