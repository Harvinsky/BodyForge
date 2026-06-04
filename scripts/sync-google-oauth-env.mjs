import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Chýba .env.local");
  process.exit(1);
}

const content = fs.readFileSync(envPath, "utf8");
const vars = {};
for (const line of content.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) vars[m[1].trim()] = m[2].trim();
}

const additions = [];
const clientId = vars.GOOGLE_OAUTH_CLIENT_ID || vars.GOOGLE_CLIENT_ID;
const clientSecret =
  vars.GOOGLE_OAUTH_CLIENT_SECRET || vars.GOOGLE_CLIENT_SECRET;

if (clientId && !vars.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  additions.push(`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=${clientId}`);
}
if (clientId && !vars.GOOGLE_OAUTH_CLIENT_ID) {
  additions.push(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
}
if (clientSecret && !vars.GOOGLE_OAUTH_CLIENT_SECRET) {
  additions.push(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
}
if (
  clientId &&
  clientSecret &&
  vars.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED !== "true"
) {
  additions.push("NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true");
}

if (additions.length === 0) {
  console.log("Google OAuth env OK — nič netreba doplniť.");
  process.exit(0);
}

fs.appendFileSync(
  envPath,
  `\n# Google login (sync z GOOGLE_CLIENT_*)\n${additions.join("\n")}\n`
);
console.log("Doplnené do .env.local:", additions.map((a) => a.split("=")[0]).join(", "));
