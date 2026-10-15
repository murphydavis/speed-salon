import type { RankingMode } from "@speed-salon/shared";
import type { Pool } from "./pool.js";

const ELIGIBLE = `
  r.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM bans b
    WHERE b.runner_id = r.runner_id
      AND b.appeal_state <> 'approved'
  )
`;

const RUNNER_FILTER = `( $2::text IS NULL OR rn.name ILIKE '%' || $2 || '%' )`;

export async function listLeaderboard(
  pool: Pool,
  categoryId: string,
  mode: RankingMode,
  q: string | undefined,
  page: number,
  limit: number,
): Promise<{ items: LeaderboardRow[]; total: number }> {
  const search = q?.trim() ? q.trim() : null;
  const offset = (page - 1) * limit;

  if (mode === "players") {
    const count = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM (
         SELECT DISTINCT r.runner_id
         FROM runs r
         JOIN runners rn ON rn.id = r.runner_id
         WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}
       ) t`,
      [categoryId, search],
    );
    const result = await pool.query<LeaderboardRow>(
      `SELECT * FROM (
         SELECT DISTINCT ON (r.runner_id)
           r.id, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
           r.runner_id AS "runnerId", rn.name AS "runnerName"
         FROM runs r
         JOIN runners rn ON rn.id = r.runner_id
         WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}
         ORDER BY r.runner_id, r.time_ms ASC, r.submitted_at ASC, r.id ASC
       ) best
       ORDER BY best."timeMs" ASC, best."submittedAt" ASC, best.id ASC
       OFFSET $3 LIMIT $4`,
      [categoryId, search, offset, limit],
    );
    return { items: result.rows, total: Number(count.rows[0]?.n ?? 0) };
  }

  const count = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n
     FROM runs r
     JOIN runners rn ON rn.id = r.runner_id
     WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}`,
    [categoryId, search],
  );
  const result = await pool.query<LeaderboardRow>(
    `SELECT
       r.id, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
       r.runner_id AS "runnerId", rn.name AS "runnerName"
     FROM runs r
     JOIN runners rn ON rn.id = r.runner_id
     WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}
     ORDER BY r.time_ms ASC, r.submitted_at ASC, r.id ASC
     OFFSET $3 LIMIT $4`,
    [categoryId, search, offset, limit],
  );
  return { items: result.rows, total: Number(count.rows[0]?.n ?? 0) };
}

export type LeaderboardRow = {
  id: string;
  timeMs: number;
  submittedAt: Date;
  runnerId: string;
  runnerName: string;
};
