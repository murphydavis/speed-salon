import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const opts = { cwd: root, stdio: "inherit", shell: true };

const api = spawn("npm", ["run", "dev", "-w", "@speed-salon/api"], opts);
const web = spawn("npm", ["run", "dev", "-w", "@speed-salon/web"], opts);

function shutDown() {
  api.kill();
  web.kill();
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
