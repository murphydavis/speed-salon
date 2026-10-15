import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { after, before, describe, test } from "node:test";
import { MODERATOR_HEADER } from "@speed-salon/shared";
import { createApp } from "./app.js";
import { createPool, type Pool } from "./db/pool.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://speedsalon:speedsalon@127.0.0.1:5432/speedsalon";

const SM64 = "00000000-0000-4000-a000-000000000001";
const ALICE = "00000000-0000-4000-a200-000000000001";
const BOB = "00000000-0000-4000-a200-000000000002";
const UNKNOWN = "00000000-0000-4000-a200-000000009999";
const PENDING_SM64 = "00000000-0000-4000-a500-000000000301";
const REJECTED_SM64 = "00000000-0000-4000-a500-000000000302";
const CELESTE_PENDING = "00000000-0000-4000-a500-000000000502";
const DASH_PB = "00000000-0000-4000-a500-000000000001";

let pool: Pool;
let server: Server;
let base: string;

before(async () => {
  pool = createPool(DATABASE_URL);
  const app = createApp(pool);
  server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  server.close();
  await pool.end();
});

describe("openapi explorer", () => {
  test("serves the spec and swagger page", async () => {
    const spec = await fetch(`${base}/openapi.yaml`);
    assert.equal(spec.status, 200);
    assert.match(await spec.text(), /^openapi:/);
    const docs = await fetch(`${base}/docs`);
    assert.equal(docs.status, 200);
    assert.match(await docs.text(), /swagger-ui/i);
  });
});

describe("lists for the console", () => {
  test("moderators include Alice assignments", async () => {
    const body = await json("/moderators");
    const alice = body.items.find((m: { displayName: string }) => m.displayName === "Alice Koopa");
    assert.ok(alice);
    assert.ok(alice.assignedGameIds.includes(SM64));
  });

  test("SM64 pending queue includes PendingPatty", async () => {
    const body = await json(`/games/${SM64}/runs?status=pending`, { [MODERATOR_HEADER]: ALICE });
    const names = body.items.map((row: { runnerName: string }) => row.runnerName);
    assert.ok(names.includes("PendingPatty"));
    assert.ok(body.items.some((row: { id: string }) => row.id === PENDING_SM64));
  });
});

describe("leaderboard", () => {
  test("player mode: one DashMain place, no pending/rejected/active bans", async () => {
    const body = await json(`/games/${SM64}/leaderboard?limit=50`);
    assert.equal(body.mode, "players");
    assert.ok(body.limit <= 100);
    assert.ok(body.items.length <= body.limit);
    const names = body.items.map((row: { runner: { name: string } }) => row.runner.name);
    assert.equal(names.filter((n: string) => n === "DashMain").length, 1);
    assert.equal(body.items[0].runner.name, "DashMain");
    assert.ok(!names.includes("PendingPatty"));
    assert.ok(!names.includes("RejectRay"));
    assert.ok(!names.includes("BannedNoAppeal"));
    assert.ok(!names.includes("BannedPendingAppeal"));
    assert.ok(!names.includes("BannedAppealDenied"));
    assert.ok(names.includes("BannedAppealWon"));
  });

  test("includePending without header is 401", async () => {
    const res = await fetch(`${base}/games/${SM64}/leaderboard?includePending=true`);
    assert.equal(res.status, 401);
  });

  test("Bob cannot include SM64 pending", async () => {
    const res = await fetch(`${base}/games/${SM64}/leaderboard?includePending=true`, {
      headers: { [MODERATOR_HEADER]: BOB },
    });
    assert.equal(res.status, 403);
  });

  test("Alice can mix pending and banned without changing places", async () => {
    const body = await json(
      `/games/${SM64}/leaderboard?limit=50&includePending=true&includeBanned=true`,
      { [MODERATOR_HEADER]: ALICE },
    );
    const dash = body.items.find((row: { runner: { name: string } }) => row.runner.name === "DashMain");
    assert.equal(dash.place, 1);
    const pending = body.items.find((row: { runId: string }) => row.runId === PENDING_SM64);
    assert.equal(pending.kind, "pending");
    assert.equal(pending.place, null);
    const banned = body.items.find((row: { runner: { name: string } }) => row.runner.name === "BannedNoAppeal");
    assert.equal(banned.kind, "banned");
    assert.equal(banned.place, null);
  });

  test("run mode lists multiple DashMain times", async () => {
    const body = await json(`/games/${SM64}/leaderboard?mode=runs&limit=50`);
    assert.equal(body.mode, "runs");
    const dash = body.items.filter((row: { runner: { name: string } }) => row.runner.name === "DashMain");
    assert.ok(dash.length >= 8);
    assert.equal(body.items[0].runId, DASH_PB);
    assert.equal(dash[0].isPb, true);
    assert.equal(dash[0].playerPlace, 1);
    assert.ok(dash.slice(1).every((row: { isPb: boolean }) => row.isPb === false));
    const won = body.items.find(
      (row: { runner: { name: string }; isPb: boolean }) =>
        row.runner.name === "BannedAppealWon" && row.isPb,
    );
    assert.equal(won.playerPlace, 2);
    const second = body.items.find(
      (row: { runner: { name: string }; isPb: boolean }) =>
        row.runner.name === "SecondPlace" && row.isPb,
    );
    assert.equal(second.playerPlace, 3);
  });
});

describe("moderation", () => {
  test("mutation without header is 401", async () => {
    const res = await fetch(`${base}/runs/${PENDING_SM64}/approval`, { method: "POST" });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, "unauthorized");
  });

  test("unknown moderator is 401", async () => {
    const res = await fetch(`${base}/runs/${PENDING_SM64}/approval`, {
      method: "POST",
      headers: { [MODERATOR_HEADER]: UNKNOWN, "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 401);
  });

  test("Alice cannot reject Celeste pending", async () => {
    const res = await fetch(`${base}/runs/${CELESTE_PENDING}/rejection`, {
      method: "POST",
      headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
      body: JSON.stringify({ reason: "invalid_proof", comment: "nope" }),
    });
    assert.equal(res.status, 403);
  });

  test("reject with empty comment is 400", async () => {
    const res = await fetch(`${base}/runs/${PENDING_SM64}/rejection`, {
      method: "POST",
      headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
      body: JSON.stringify({ reason: "invalid_proof", comment: "   " }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "invalid_reject");
  });

  test("reject already-rejected run is 409", async () => {
    const res = await fetch(`${base}/runs/${REJECTED_SM64}/rejection`, {
      method: "POST",
      headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
      body: JSON.stringify({ reason: "invalid_proof", comment: "again" }),
    });
    assert.equal(res.status, 409);
  });

  test("Alice can approve SM64 pending", async () => {
    try {
      const res = await fetch(`${base}/runs/${PENDING_SM64}/approval`, {
        method: "POST",
        headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
        body: "{}",
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, "approved");
      assert.ok(body.reviewEvents.some((e: { action: string }) => e.action === "approve"));
    } finally {
      await pool.query(`DELETE FROM review_events WHERE run_id = $1 AND action = 'approve'`, [
        PENDING_SM64,
      ]);
      await pool.query(`UPDATE runs SET status = 'pending' WHERE id = $1`, [PENDING_SM64]);
    }
  });
});

async function json(path: string, headers?: Record<string, string>) {
  const res = await fetch(`${base}${path}`, { headers });
  assert.equal(res.status, 200);
  return res.json();
}
