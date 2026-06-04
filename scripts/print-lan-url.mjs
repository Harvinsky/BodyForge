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

console.log("\n  BodyForge — adresy (server musí bežať):\n");
console.log(`  PC (tento počítač):     http://localhost:${port}`);
console.log(`  PC (alternatíva):      http://127.0.0.1:${port}`);
console.log("");
if (ips.length === 0) {
  console.log(`  Mobile (Wi‑Fi):        http://<tvoja-IP>:${port}  (ipconfig)`);
} else {
  console.log("  Mobile (rovnaká Wi‑Fi):");
  for (const { ip, iface } of ips) {
    console.log(`                         http://${ip}:${port}  (${iface})`);
  }
}
console.log("");
console.log("  Na mobile NEOTVÁRAJ http://0.0.0.0 — len IP vyššie alebo localhost na PC.");
console.log("  Login: pridaj /login   Dashboard: /\n");
