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
const DASH_RUNNER = "00000000-0000-4000-a300-000000000001";
const ANY = "00000000-0000-4000-a100-000000000001";
const HUNDO = "00000000-0000-4000-a100-000000000002";
const PENDING_APPEAL_BAN = "00000000-0000-4000-a600-000000000002";

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

  test("games list includes SM64 counts and name search", async () => {
    const body = await json("/games");
    const sm64 = body.items.find((g: { name: string }) => g.name === "Super Mario 64");
    assert.ok(sm64);
    const summed = await pool.query<{
      total: string;
      approved: string;
      pending: string;
      banned: string;
    }>(
      `SELECT
         count(*)::text AS total,
         count(*) FILTER (
           WHERE r.status = 'approved' AND NOT EXISTS (
             SELECT 1 FROM bans b
             WHERE b.runner_id = r.runner_id AND b.appeal_state <> 'approved'
           )
         )::text AS approved,
         count(*) FILTER (WHERE r.status = 'pending')::text AS pending,
         count(*) FILTER (
           WHERE r.status = 'approved' AND EXISTS (
             SELECT 1 FROM bans b
             WHERE b.runner_id = r.runner_id AND b.appeal_state <> 'approved'
           )
         )::text AS banned
       FROM runs r
       WHERE r.category_id IN ($1, $2)`,
      [ANY, HUNDO],
    );
    const anyOnly = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM runs r
       WHERE r.category_id = $1 AND r.status = 'approved' AND NOT EXISTS (
         SELECT 1 FROM bans b
         WHERE b.runner_id = r.runner_id AND b.appeal_state <> 'approved'
       )`,
      [ANY],
    );
    assert.equal(sm64.totalRuns, Number(summed.rows[0].total));
    assert.equal(sm64.approvedRuns, Number(summed.rows[0].approved));
    assert.equal(sm64.pendingRuns, Number(summed.rows[0].pending));
    assert.equal(sm64.bannedRuns, Number(summed.rows[0].banned));
    assert.ok(sm64.totalRuns > sm64.approvedRuns);
    assert.ok(Number(summed.rows[0].approved) > Number(anyOnly.rows[0].n));
    const detail = await json(`/games/${SM64}`);
    assert.equal(detail.totalRuns, sm64.totalRuns);
    assert.equal(detail.approvedRuns, sm64.approvedRuns);
    assert.equal(detail.pendingRuns, sm64.pendingRuns);
    assert.equal(detail.bannedRuns, sm64.bannedRuns);
    const anyCat = detail.categories.find((c: { slug: string }) => c.slug === "any");
    const hundoCat = detail.categories.find((c: { slug: string }) => c.slug === "100");
    assert.ok(anyCat && hundoCat);
    assert.equal(anyCat.totalRuns + hundoCat.totalRuns, detail.totalRuns);
    assert.notEqual(anyCat.totalRuns, hundoCat.totalRuns);
    const found = await json("/games?q=Mario");
    assert.ok(found.items.some((g: { name: string }) => g.name === "Super Mario 64"));
    assert.ok(found.items.every((g: { name: string }) => g.name.toLowerCase().includes("mario")));
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
    assert.equal(body.items[0].playerPlace, 1);
    assert.equal(body.items[1].playerPlace, 2);
    assert.equal(body.items[2].playerPlace, 3);
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
    const eligible = await json(`/games/${SM64}/leaderboard?limit=50`);
    const body = await json(
      `/games/${SM64}/leaderboard?limit=50&includePending=true&includeBanned=true`,
      { [MODERATOR_HEADER]: ALICE },
    );
    assert.ok(body.total > eligible.total);
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
    assert.ok(
      dash.slice(1).every(
        (row: { isPb: boolean; playerPlace: number | null }) =>
          row.isPb === false && row.playerPlace === 1,
      ),
    );
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
    assert.equal(second.isPb, true);
  });

  test("includeApproved=false omits ranked runs without promoting medals", async () => {
    const res = await fetch(
      `${base}/games/${SM64}/leaderboard?includeApproved=false&includePending=true`,
    );
    assert.equal(res.status, 401);
    const hidden = await json(
      `/games/${SM64}/leaderboard?limit=50&includeApproved=false&includePending=true&includeBanned=true`,
      { [MODERATOR_HEADER]: ALICE },
    );
    assert.ok(hidden.items.length >= 1);
    assert.ok(hidden.items.every((row: { kind: string; place: number | null }) => row.kind !== "ranked"));
    assert.ok(hidden.items.every((row: { playerPlace: number | null }) => row.playerPlace == null));
    const full = await json(`/games/${SM64}/leaderboard?limit=50`);
    const gold = full.items.find(
      (row: { isPb: boolean; playerPlace: number | null; runner: { name: string } }) =>
        row.isPb && row.playerPlace === 1,
    );
    assert.equal(gold.runner.name, "DashMain");
    const csv = await fetch(
      `${base}/games/${SM64}/leaderboard.csv?includeApproved=false&includePending=true`,
      { headers: { [MODERATOR_HEADER]: ALICE } },
    );
    assert.match(
      csv.headers.get("content-disposition") ?? "",
      /filename="sm64-leaderboard-\d{4}-\d{2}-\d{2}T\d{6}Z-pending-no-approved\.csv"/,
    );
  });

  test("search q=DashMain returns that runner", async () => {
    const body = await json(`/games/${SM64}/leaderboard?q=DashMain`);
    assert.ok(body.items.length >= 1);
    assert.ok(body.items.every((row: { runner: { name: string } }) => row.runner.name.includes("DashMain")));
  });

  test("search does not re-rank Olympic medals", async () => {
    const body = await json(`/games/${SM64}/leaderboard?q=BannedAppealWon`);
    const row = body.items.find(
      (item: { runner: { name: string }; isPb: boolean }) =>
        item.runner.name === "BannedAppealWon" && item.isPb,
    );
    assert.equal(row.playerPlace, 2);
  });
});

describe("csv and default category", () => {
  test("csv with no search exports the full board", async () => {
    const res = await fetch(`${base}/games/${SM64}/leaderboard.csv?mode=players`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /^place,runner,time_ms/);
    assert.match(text, /DashMain/);
    assert.match(text, /SecondPlace/);
    assert.doesNotMatch(text, /PendingPatty/);
    assert.match(
      res.headers.get("content-disposition") ?? "",
      /filename="sm64-leaderboard-\d{4}-\d{2}-\d{2}T\d{6}Z\.csv"/,
    );
    assert.match(text, /include_pending,include_banned,include_approved/);
  });

  test("csv include flags appear in filename and columns", async () => {
    const res = await fetch(
      `${base}/games/${SM64}/leaderboard.csv?mode=players&includePending=true&includeBanned=true`,
      { headers: { [MODERATOR_HEADER]: ALICE } },
    );
    assert.equal(res.status, 200);
    assert.match(
      res.headers.get("content-disposition") ?? "",
      /filename="sm64-leaderboard-\d{4}-\d{2}-\d{2}T\d{6}Z-pending-banned\.csv"/,
    );
    const text = await res.text();
    assert.match(text, /PendingPatty/);
    assert.match(text, /,true,true,true\r?\n/);
  });

  test("csv empty q is the full board", async () => {
    const res = await fetch(`${base}/games/${SM64}/leaderboard.csv?mode=players&q=`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /SecondPlace/);
  });

  test("csv ignoreMaxRows=true is accepted", async () => {
    const res = await fetch(
      `${base}/games/${SM64}/leaderboard.csv?mode=players&ignoreMaxRows=true`,
    );
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /^place,runner,time_ms/);
    assert.match(text, /DashMain/);
  });

  test("Bob cannot set SM64 default", async () => {
    const res = await fetch(`${base}/games/${SM64}/default-category`, {
      method: "POST",
      headers: { [MODERATOR_HEADER]: BOB, "content-type": "application/json" },
      body: JSON.stringify({ categoryId: HUNDO }),
    });
    assert.equal(res.status, 403);
  });

  test("Alice can set SM64 default category", async () => {
    try {
      const res = await fetch(`${base}/games/${SM64}/default-category`, {
        method: "POST",
        headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
        body: JSON.stringify({ categoryId: HUNDO }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.defaultCategoryId, HUNDO);
    } finally {
      await pool.query(`UPDATE games SET default_category_id = $1 WHERE id = $2`, [ANY, SM64]);
      await pool.query(
        `DELETE FROM review_events WHERE action = 'set_default_category' AND category_id = $1`,
        [HUNDO],
      );
    }
  });
});

describe("bans", () => {
  test("Bob cannot ban on SM64", async () => {
    const res = await fetch(`${base}/games/${SM64}/bans`, {
      method: "POST",
      headers: { [MODERATOR_HEADER]: BOB, "content-type": "application/json" },
      body: JSON.stringify({ runnerId: DASH_RUNNER, comment: "nope" }),
    });
    assert.equal(res.status, 403);
  });

  test("ban removes DashMain; lift restores", async () => {
    try {
      const banRes = await fetch(`${base}/games/${SM64}/bans`, {
        method: "POST",
        headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
        body: JSON.stringify({ runnerId: DASH_RUNNER, comment: "investigation" }),
      });
      assert.equal(banRes.status, 201);
      const banned = await json(`/games/${SM64}/leaderboard`);
      const names = banned.items.map((row: { runner: { name: string } }) => row.runner.name);
      assert.ok(!names.includes("DashMain"));
      const ban = await banRes.json();
      const lift = await fetch(`${base}/games/${SM64}/bans/${ban.id}/lift`, {
        method: "POST",
        headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
        body: "{}",
      });
      assert.equal(lift.status, 200);
      const restored = await json(`/games/${SM64}/leaderboard`);
      assert.equal(restored.items[0].runner.name, "DashMain");
    } finally {
      await pool.query(
        `DELETE FROM review_events WHERE runner_id = $1 AND action IN ('ban', 'unban')`,
        [DASH_RUNNER],
      );
      await pool.query(`DELETE FROM bans WHERE runner_id = $1`, [DASH_RUNNER]);
    }
  });

  test("approved appeal returns BannedPendingAppeal to the board", async () => {
    try {
      const res = await fetch(`${base}/games/${SM64}/bans/${PENDING_APPEAL_BAN}/appeal-decision`, {
        method: "POST",
        headers: { [MODERATOR_HEADER]: ALICE, "content-type": "application/json" },
        body: JSON.stringify({ decision: "approved" }),
      });
      assert.equal(res.status, 200);
      const body = await json(`/games/${SM64}/leaderboard`);
      const names = body.items.map((row: { runner: { name: string } }) => row.runner.name);
      assert.ok(names.includes("BannedPendingAppeal"));
    } finally {
      await pool.query(`UPDATE bans SET appeal_state = 'pending' WHERE id = $1`, [
        PENDING_APPEAL_BAN,
      ]);
      await pool.query(
        `DELETE FROM review_events WHERE action = 'appeal_approve' AND runner_id = $1`,
        ["00000000-0000-4000-a300-000000000007"],
      );
    }
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
