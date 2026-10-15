import {
  REJECT_REASONS,
  type RejectReason,
} from "@speed-salon/shared";
import { ApiError, notFound } from "../errors.js";
import type { Pool, PoolClient } from "./pool.js";

export async function getRun(pool: Pool, runId: string): Promise<RunDetail> {
  const run = await pool.query<RunHeader>(
    `SELECT
       r.id, r.status, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
       r.proof_url AS "proofUrl", r.category_id AS "categoryId",
       c.game_id AS "gameId", c.name AS "categoryName", c.slug AS "categorySlug",
       g.name AS "gameName", g.slug AS "gameSlug",
       rn.id AS "runnerId", rn.name AS "runnerName"
     FROM runs r
     JOIN categories c ON c.id = r.category_id
     JOIN games g ON g.id = c.game_id
     JOIN runners rn ON rn.id = r.runner_id
     WHERE r.id = $1`,
    [runId],
  );
  if (!run.rows[0]) throw notFound("run");
  const header = run.rows[0];
  const splits = await pool.query<SplitRow>(
    `SELECT ordinal, label, time_ms AS "timeMs"
     FROM run_splits WHERE run_id = $1 ORDER BY ordinal ASC`,
    [runId],
  );
  const events = await pool.query<ReviewEventRow>(
    `SELECT
       e.id, e.action, e.created_at AS "createdAt", e.payload,
       e.moderator_id AS "moderatorId", m.display_name AS "moderatorName"
     FROM review_events e
     JOIN moderators m ON m.id = e.moderator_id
     WHERE e.run_id = $1
     ORDER BY e.created_at ASC, e.id ASC`,
    [runId],
  );
  const ban = await pool.query<ActiveBanRow>(
    `SELECT id, appeal_state AS "appealState", comment, created_at AS "createdAt"
     FROM bans
     WHERE runner_id = $1 AND appeal_state <> 'approved'
     ORDER BY created_at DESC
     LIMIT 1`,
    [header.runnerId],
  );
  return {
    ...header,
    splits: splits.rows,
    reviewEvents: events.rows,
    activeBan: ban.rows[0] ?? null,
  };
}

export async function runGameId(client: PoolClient, runId: string): Promise<string> {
  const result = await client.query<{ gameId: string }>(
    `SELECT c.game_id AS "gameId"
     FROM runs r
     JOIN categories c ON c.id = r.category_id
     WHERE r.id = $1
     FOR UPDATE OF r`,
    [runId],
  );
  if (!result.rows[0]) throw notFound("run");
  return result.rows[0].gameId;
}

export async function approveRun(
  client: PoolClient,
  runId: string,
  moderatorId: string,
): Promise<void> {
  const current = await client.query<{ status: string }>(
    `SELECT status FROM runs WHERE id = $1 FOR UPDATE`,
    [runId],
  );
  if (!current.rows[0]) throw notFound("run");
  if (current.rows[0].status !== "pending") {
    throw new ApiError(409, "conflict", "run is not pending");
  }
  const runner = await client.query<{ runnerId: string }>(
    `SELECT runner_id AS "runnerId" FROM runs WHERE id = $1`,
    [runId],
  );
  await client.query(`UPDATE runs SET status = 'approved' WHERE id = $1`, [runId]);
  await client.query(
    `INSERT INTO review_events (run_id, runner_id, moderator_id, action, payload)
     VALUES ($1, $2, $3, 'approve', '{}'::jsonb)`,
    [runId, runner.rows[0]!.runnerId, moderatorId],
  );
}

export async function rejectRun(
  client: PoolClient,
  runId: string,
  moderatorId: string,
  reason: string,
  comment: string,
): Promise<void> {
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_reject", "comment must be non-empty");
  }
  if (!(REJECT_REASONS as readonly string[]).includes(reason)) {
    throw new ApiError(400, "invalid_reject", "unknown reject reason");
  }
  const current = await client.query<{ status: string; runnerId: string }>(
    `SELECT status, runner_id AS "runnerId" FROM runs WHERE id = $1 FOR UPDATE`,
    [runId],
  );
  if (!current.rows[0]) throw notFound("run");
  if (current.rows[0].status !== "pending") {
    throw new ApiError(409, "conflict", "run is not pending");
  }
  await client.query(`UPDATE runs SET status = 'rejected' WHERE id = $1`, [runId]);
  await client.query(
    `INSERT INTO review_events (run_id, runner_id, moderator_id, action, payload)
     VALUES ($1, $2, $3, 'reject', $4::jsonb)`,
    [
      runId,
      current.rows[0].runnerId,
      moderatorId,
      JSON.stringify({ reason: reason as RejectReason, comment: trimmed }),
    ],
  );
}

export type SplitRow = { ordinal: number; label: string; timeMs: number };

export type ReviewEventRow = {
  id: string;
  action: string;
  createdAt: Date;
  payload: unknown;
  moderatorId: string;
  moderatorName: string;
};

export type ActiveBanRow = {
  id: string;
  appealState: string;
  comment: string;
  createdAt: Date;
};

export type RunHeader = {
  id: string;
  status: string;
  timeMs: number;
  submittedAt: Date;
  proofUrl: string | null;
  categoryId: string;
  gameId: string;
  categoryName: string;
  categorySlug: string;
  gameName: string;
  gameSlug: string;
  runnerId: string;
  runnerName: string;
};

export type RunDetail = RunHeader & {
  splits: SplitRow[];
  reviewEvents: ReviewEventRow[];
  activeBan: ActiveBanRow | null;
};
