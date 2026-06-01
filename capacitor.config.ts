import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Natívna appka načítava nasadený Next.js (Vercel) alebo lokálny dev server.
 * Nastav CAPACITOR_SERVER_URL pred `npm run cap:sync`.
 *
 * Príklady:
 *   Produkcia: https://tvoja-app.vercel.app
 *   Dev LAN:   http://192.168.1.10:3000
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const isHttp = serverUrl.startsWith("http://");

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
      "https://*.vercel.app",
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
  },
};

export default config;
