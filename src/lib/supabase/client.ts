import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function browserCookieOptions() {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return {
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key";

  return createBrowserClient(url, key, {
    cookieOptions: browserCookieOptions(),
    auth: {
      // We exchange OAuth code manually in /auth/callback page.
      // Auto-detection can consume PKCE verifier before our explicit exchange.
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
    },
  });
}
