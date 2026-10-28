import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { z } from "zod";
import { Store } from "./store.js";
import { Jira } from "./jira.js";
import { Engine } from "./engine.js";
import { Discord } from "./discord.js";
import { PermanentError, UncertainWrite } from "./domain.js";
const env = z
  .object({
    DATABASE_URL: z.string(),
    DISCORD_TOKEN: z.string(),
    DISCORD_GUILD_ID: z.string().regex(/^\d+$/),
    JIRA_BASE_URL: z
      .string()
      .url()
      .refine((v) => new URL(v).protocol === "https:"),
    JIRA_EMAIL: z.string().email(),
    JIRA_API_TOKEN: z.string(),
    USER_MAP_PATH: z.string().default("config/users.json"),
    PORT: z.coerce.number().default(3000),
  })
  .parse(process.env);
const users = z
  .record(z.string(), z.string())
  .parse(JSON.parse(await readFile(env.USER_MAP_PATH, "utf8")));
const store = new Store(env.DATABASE_URL);
await store.init();
// Dedicated session advisory lock: one ingestor/worker per database.
const lock = await store.db.connect();
if (
  !(await lock.query("SELECT pg_try_advisory_lock(940512) AS acquired")).rows[0]
    ?.acquired
)
  throw new Error("Another instance owns the database");
lock.on("error", () => process.exit(1));
const discord = new Discord(store, env.DISCORD_GUILD_ID);
const engine = new Engine(
  store,
  new Jira(
    env.JIRA_BASE_URL.replace(/\/$/, ""),
    env.JIRA_EMAIL,
    env.JIRA_API_TOKEN,
    users,
  ),
);
let stopping = false;
let workerAlive = Date.now();
const server = createServer((req, res) => {
  void (async () => {
    if (req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }
    await store.db.query("SELECT 1");
    const ok =
      discord.ready &&
      discord.client.isReady() &&
      Date.now() - workerAlive < 90000;
    res
      .writeHead(ok ? 200 : 503, { "Content-Type": "application/json" })
      .end(JSON.stringify({ status: ok ? "ok" : "starting-or-degraded" }));
  })().catch(() => res.writeHead(503).end());
}).listen(env.PORT);
await discord.start(env.DISCORD_TOKEN);
const sweep = setInterval(() => {
  void discord
    .scan()
    .catch((e) =>
      console.error({ event: "history_scan_failed", error: String(e) }),
    );
}, 300000);
async function worker() {
  while (!stopping) {
    workerAlive = Date.now();
    if (!discord.ready || discord.scanning) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    const row = await store.next();
    if (!row) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    try {
      await engine.sync(row.payload);
      await store.db.query(
        "UPDATE events SET state='done',error=NULL WHERE id=$1",
        [row.id],
      );
    } catch (error) {
      const state =
        error instanceof UncertainWrite
          ? "uncertain"
          : error instanceof PermanentError
            ? "failed"
            : row.attempts >= 9
              ? "failed"
              : "pending";
      await store.db.query(
        "UPDATE events SET state=$2,attempts=attempts+1,error=$3,available_at=now()+($4 * interval '1 second') WHERE id=$1",
        [
          row.id,
          state,
          String(error),
          Math.min(300, 2 ** row.attempts + Math.random() * 3),
        ],
      );
      console.error({
        event: "sync_failed",
        id: row.id,
        state,
        error: String(error),
      });
    }
  }
}
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stopping = true;
    clearInterval(sweep);
    discord.client.destroy();
    server.close();
  });
await worker();
await lock.release();
await store.db.end();
