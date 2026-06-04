/** Shared security headers (importable from next.config and middleware). */

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** HTTPS + HSTS only on Vercel — LAN http://192.168.x.x must stay plain HTTP. */
function isDeployedHttps(): boolean {
  return isProduction() && Boolean(process.env.VERCEL);
}

function supabaseConnectSources(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return "https://*.supabase.co wss://*.supabase.co";
  }
  try {
    const host = new URL(url).host;
    return `https://${host} wss://${host}`;
  } catch {
    return "https://*.supabase.co wss://*.supabase.co";
  }
}

function buildContentSecurityPolicy(): string {
  const connectSrc = ["'self'", supabaseConnectSources()].join(" ");

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${isProduction() ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    // Allow Open Food Facts product images (proxied results include external image URLs)
    "img-src 'self' data: blob: https://images.openfoodfacts.org https://static.openfoodfacts.org",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isDeployedHttps()) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-DNS-Prefetch-Control": "off",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": buildContentSecurityPolicy(),
  };

  if (isDeployedHttps()) {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

export function applySecurityHeaders(response: Response): void {
  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }
}
