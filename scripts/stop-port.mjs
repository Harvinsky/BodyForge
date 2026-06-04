import { execSync } from "node:child_process";

const port = process.argv[2] ?? process.env.PORT ?? "3000";

function pidsOnPortWindows(p) {
  try {
    const out = execSync(`netstat -ano | findstr ":${p}.*LISTENING"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const ids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== "0") ids.add(pid);
    }
    return [...ids];
  } catch {
    return [];
  }
}

const pids = pidsOnPortWindows(port);
if (pids.length === 0) {
  console.log(`Port ${port} je volný.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    console.log(`Ukončený proces ${pid} (port ${port}).`);
  } catch {
    console.warn(`Nepodarilo sa ukončiť PID ${pid}.`);
  }
}
