import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";

const url =
  process.env.DATABASE_URL ??
  "postgresql://speedsalon:speedsalon@127.0.0.1:5432/speedsalon";
const port = Number(process.env.PORT ?? 3000);

const pool = createPool(url);
const logFile = process.env.LOG_FILE ?? "logs/api.log";
const app = createApp(pool, { logFile });

app.listen(port, "0.0.0.0", () => {
  console.log(`api listening on ${port} — docs http://localhost:${port}/docs`);
});
