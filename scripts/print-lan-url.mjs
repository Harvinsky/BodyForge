import os from "node:os";

const port = process.env.PORT || "3000";

function lanAddresses() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push({ ip: net.address, iface: name });
      }
    }
  }
  return ips;
}

const ips = lanAddresses();
console.log("\n  BodyForge — na mobile otvor (NIE 0.0.0.0 ani localhost):");
if (ips.length === 0) {
  console.log(`  http://<tvoja-IP>:${port}  (ipconfig)\n`);
} else {
  for (const { ip, iface } of ips) {
    console.log(`  http://${ip}:${port}  (${iface})`);
  }
  console.log("");
}
