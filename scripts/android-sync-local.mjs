import os from "node:os";
import { execSync } from "node:child_process";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const port = process.env.PORT || "3000";

function detectLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

const ip = detectLanIp();
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  (ip ? `http://${ip}:${port}` : `http://localhost:${port}`);

console.log("\nBodyForge Android — sync");
console.log(`  Server URL v APK: ${serverUrl}`);
console.log("  (PC musí bežať: npm run start:mobile, rovnaká Wi‑Fi)\n");

if (!ip && !process.env.CAPACITOR_SERVER_URL) {
  console.warn(
    "  Varovanie: nenašiel som LAN IP. Nastav ručne:\n" +
      `  $env:CAPACITOR_SERVER_URL = "http://192.168.1.10:${port}"\n`
  );
}

execSync("npx cap sync android", {
  stdio: "inherit",
  env: {
    ...process.env,
    CAPACITOR_SERVER_URL: serverUrl,
  },
});

console.log("\nHotovo.");
console.log("  Test v Chrome na mobile: URL vyššie + /login");
console.log("  Natívny test (bez APK): npm run android:open → Run v Android Studio");
console.log("  Finálne APK až keď všetko funguje: npm run android:apk\n");
