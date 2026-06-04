import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Natívna Android appka (Capacitor).
 *
 * Dev: WebView načíta Next.js z domácej Wi‑Fi (PC: npm run prod:mobile).
 * Prihlásenie: natívny Google dialóg v APK — bez supabase.co, bez Vercel.
 *
 * CAPACITOR_SERVER_URL=http://192.168.1.10:3000 npm run android:sync
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const isHttp = serverUrl.startsWith("http://");
const googleWebClientId =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";

const config: CapacitorConfig = {
  appId: "com.bodyforge.app",
  appName: "BodyForge",
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    cleartext: isHttp,
    androidScheme: isHttp ? "http" : "https",
    allowNavigation: [
      "https://*.supabase.co",
      "https://accounts.google.com",
      "https://*.google.com",
      "http://localhost:*",
      "http://192.168.*.*:*",
      "http://10.*.*.*:*",
    ],
  },
  android: {
    allowMixedContent: isHttp,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0a1628",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a1628",
    },
    GoogleAuth: {
      scopes: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      serverClientId: googleWebClientId || undefined,
      forceCodeForRefreshToken: true,
    },
  },
};
export default config;
