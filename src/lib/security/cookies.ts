import type { CookieOptions } from "@supabase/ssr";
import { isProduction } from "@/lib/security/env";

/** Harden Supabase session cookies in production (HTTPS). */
export function secureCookieDefaults(): CookieOptions {
  return {
    secure: isProduction(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  };
}

/** In dev, pass Supabase cookie options through unchanged (PKCE must survive). */
export function mergeCookieOptions(options?: CookieOptions): CookieOptions {
  if (!isProduction()) {
    return options ?? { path: "/", sameSite: "lax", secure: false };
  }
  if (!options) {
    return secureCookieDefaults();
  }
  return {
    ...options,
    secure: options.secure ?? true,
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
  };
}
