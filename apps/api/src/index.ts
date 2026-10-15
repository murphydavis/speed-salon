import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";

const url =
  process.env.DATABASE_URL ??
  "postgresql://speedsalon:speedsalon@127.0.0.1:5432/speedsalon";
const port = Number(process.env.PORT ?? 3000);

const pool = createPool(url);
const app = createApp(pool);

app.listen(port, () => {
  console.log(`api listening on ${port} — docs http://localhost:${port}/docs`);
});
