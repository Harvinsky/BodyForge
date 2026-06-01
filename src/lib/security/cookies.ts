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

export function mergeCookieOptions(options?: CookieOptions): CookieOptions {
  const defaults = secureCookieDefaults();
  return {
    ...options,
    secure: defaults.secure,
    httpOnly: options?.httpOnly ?? defaults.httpOnly,
    sameSite: options?.sameSite ?? defaults.sameSite,
    path: options?.path ?? defaults.path,
  };
}
