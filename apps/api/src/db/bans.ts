import { ApiError, notFound } from "../errors.js";
import type { PoolClient } from "./pool.js";

export type BanRow = {
  id: string;
  runnerId: string;
  moderatorId: string;
  createdAt: Date;
  comment: string;
  appealState: string;
};

export async function latestBan(client: PoolClient, runnerId: string): Promise<BanRow | null> {
  const result = await client.query<BanRow>(
    `SELECT id, runner_id AS "runnerId", moderator_id AS "moderatorId",
            created_at AS "createdAt", comment, appeal_state AS "appealState"
     FROM bans WHERE runner_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [runnerId],
  );
  return result.rows[0] ?? null;
}

export async function getBan(client: PoolClient, banId: string): Promise<BanRow> {
  const result = await client.query<BanRow>(
    `SELECT id, runner_id AS "runnerId", moderator_id AS "moderatorId",
            created_at AS "createdAt", comment, appeal_state AS "appealState"
     FROM bans WHERE id = $1 FOR UPDATE`,
    [banId],
  );
  if (!result.rows[0]) throw notFound("ban");
  return result.rows[0];
}

export async function hasActiveBan(client: PoolClient, runnerId: string): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM bans WHERE runner_id = $1 AND appeal_state <> 'approved' LIMIT 1`,
    [runnerId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function issueBan(
  client: PoolClient,
  runnerId: string,
  moderatorId: string,
  comment: string,
): Promise<BanRow> {
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new ApiError(400, "invalid_ban", "comment must be non-empty");
  }
  const runner = await client.query(`SELECT id FROM runners WHERE id = $1`, [runnerId]);
  if (!runner.rows[0]) throw notFound("runner");
  if (await hasActiveBan(client, runnerId)) {
    throw new ApiError(409, "conflict", "runner already has an active ban");
  }
  const inserted = await client.query<BanRow>(
    `INSERT INTO bans (runner_id, moderator_id, comment, appeal_state)
     VALUES ($1, $2, $3, 'not_appealed')
     RETURNING id, runner_id AS "runnerId", moderator_id AS "moderatorId",
               created_at AS "createdAt", comment, appeal_state AS "appealState"`,
    [runnerId, moderatorId, trimmed],
  );
  await client.query(
    `INSERT INTO review_events (runner_id, moderator_id, action, payload)
     VALUES ($1, $2, 'ban', $3::jsonb)`,
    [runnerId, moderatorId, JSON.stringify({ comment: trimmed })],
  );
  return inserted.rows[0]!;
}

export async function liftBan(
  client: PoolClient,
  banId: string,
  moderatorId: string,
): Promise<BanRow> {
  const ban = await getBan(client, banId);
  if (ban.appealState === "approved") {
    throw new ApiError(409, "conflict", "ban is already inactive");
  }
  await client.query(`UPDATE bans SET appeal_state = 'approved' WHERE id = $1`, [banId]);
  await client.query(
    `INSERT INTO review_events (runner_id, moderator_id, action, payload)
     VALUES ($1, $2, 'unban', '{}'::jsonb)`,
    [ban.runnerId, moderatorId],
  );
  return { ...ban, appealState: "approved" };
}

export async function decideAppeal(
  client: PoolClient,
  banId: string,
  moderatorId: string,
  decision: "approved" | "rejected",
): Promise<BanRow> {
  const ban = await getBan(client, banId);
  if (ban.appealState !== "pending") {
    throw new ApiError(409, "conflict", "ban has no pending appeal");
  }
  const action = decision === "approved" ? "appeal_approve" : "appeal_reject";
  await client.query(`UPDATE bans SET appeal_state = $2 WHERE id = $1`, [banId, decision]);
  await client.query(
    `INSERT INTO review_events (runner_id, moderator_id, action, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [ban.runnerId, moderatorId, action, JSON.stringify({ decision })],
  );
  return { ...ban, appealState: decision };
}
