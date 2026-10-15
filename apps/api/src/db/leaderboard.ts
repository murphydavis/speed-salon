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
  limit: number | null,
): Promise<{ items: LeaderboardRow[]; total: number }> {
  const search = q?.trim() ? q.trim() : null;
  const offset = limit === null ? 0 : (page - 1) * limit;
  const pageSql = limit === null ? "" : " OFFSET $3 LIMIT $4";
  const pageParams = limit === null ? [] : [offset, limit];

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
           r.runner_id AS "runnerId", rn.name AS "runnerName",
           'ranked'::text AS kind,
           true AS "isPb"
         FROM runs r
         JOIN runners rn ON rn.id = r.runner_id
         WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}
         ORDER BY r.runner_id, r.time_ms ASC, r.submitted_at ASC, r.id ASC
       ) best
       ORDER BY best."timeMs" ASC, best."submittedAt" ASC, best.id ASC${pageSql}`,
      [categoryId, search, ...pageParams],
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
    `SELECT * FROM (
       SELECT
         r.id, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
         r.runner_id AS "runnerId", rn.name AS "runnerName",
         'ranked'::text AS kind,
         ROW_NUMBER() OVER (
           PARTITION BY r.runner_id
           ORDER BY r.time_ms ASC, r.submitted_at ASC, r.id ASC
         ) = 1 AS "isPb"
       FROM runs r
       JOIN runners rn ON rn.id = r.runner_id
       WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}
     ) ranked
     ORDER BY ranked."timeMs" ASC, ranked."submittedAt" ASC, ranked.id ASC${pageSql}`,
    [categoryId, search, ...pageParams],
  );
  return { items: result.rows, total: Number(count.rows[0]?.n ?? 0) };
}

export async function listPlayerPlaces(
  pool: Pool,
  categoryId: string,
  q: string | undefined,
): Promise<Map<string, number>> {
  const search = q?.trim() ? q.trim() : null;
  const result = await pool.query<{ runnerId: string; playerPlace: string }>(
    `SELECT "runnerId",
            row_number() OVER (
              ORDER BY "timeMs" ASC, "submittedAt" ASC, id ASC
            )::text AS "playerPlace"
     FROM (
       SELECT DISTINCT ON (r.runner_id)
         r.id,
         r.time_ms AS "timeMs",
         r.submitted_at AS "submittedAt",
         r.runner_id AS "runnerId"
       FROM runs r
       JOIN runners rn ON rn.id = r.runner_id
       WHERE r.category_id = $1 AND ${ELIGIBLE} AND ${RUNNER_FILTER}
       ORDER BY r.runner_id, r.time_ms ASC, r.submitted_at ASC, r.id ASC
     ) best`,
    [categoryId, search],
  );
  const places = new Map<string, number>();
  for (const row of result.rows) {
    places.set(row.runnerId, Number(row.playerPlace));
  }
  return places;
}

export type LeaderboardKind = "ranked" | "pending" | "banned";

export type LeaderboardRow = {
  id: string;
  timeMs: number;
  submittedAt: Date;
  runnerId: string;
  runnerName: string;
  kind: LeaderboardKind;
  isPb: boolean;
};

const ACTIVE_BAN = `
  EXISTS (
    SELECT 1 FROM bans b
    WHERE b.runner_id = r.runner_id
      AND b.appeal_state <> 'approved'
  )
`;

export async function listBoardExtras(
  pool: Pool,
  categoryId: string,
  mode: RankingMode,
  q: string | undefined,
  includePending: boolean,
  includeBanned: boolean,
  limit: number | null,
): Promise<LeaderboardRow[]> {
  const search = q?.trim() ? q.trim() : null;
  const extras: LeaderboardRow[] = [];
  const limitSql = limit === null ? "" : " LIMIT $3";
  const limitParams = limit === null ? [] : [limit];
  if (includePending) {
    const pending = await pool.query<LeaderboardRow>(
      `SELECT
         r.id, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
         r.runner_id AS "runnerId", rn.name AS "runnerName",
         'pending'::text AS kind,
         false AS "isPb"
       FROM runs r
       JOIN runners rn ON rn.id = r.runner_id
       WHERE r.category_id = $1 AND r.status = 'pending' AND ${RUNNER_FILTER}
       ORDER BY r.time_ms ASC, r.submitted_at ASC, r.id ASC${limitSql}`,
      [categoryId, search, ...limitParams],
    );
    extras.push(...pending.rows);
  }
  if (includeBanned) {
    if (mode === "players") {
      const banned = await pool.query<LeaderboardRow>(
        `SELECT * FROM (
           SELECT DISTINCT ON (r.runner_id)
             r.id, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
             r.runner_id AS "runnerId", rn.name AS "runnerName",
             'banned'::text AS kind,
             false AS "isPb"
           FROM runs r
           JOIN runners rn ON rn.id = r.runner_id
           WHERE r.category_id = $1 AND r.status = 'approved' AND ${ACTIVE_BAN}
             AND ${RUNNER_FILTER}
           ORDER BY r.runner_id, r.time_ms ASC, r.submitted_at ASC, r.id ASC
         ) best
         ORDER BY best."timeMs" ASC, best."submittedAt" ASC, best.id ASC${limitSql}`,
        [categoryId, search, ...limitParams],
      );
      extras.push(...banned.rows);
    } else {
      const banned = await pool.query<LeaderboardRow>(
        `SELECT
           r.id, r.time_ms AS "timeMs", r.submitted_at AS "submittedAt",
           r.runner_id AS "runnerId", rn.name AS "runnerName",
           'banned'::text AS kind,
           false AS "isPb"
         FROM runs r
         JOIN runners rn ON rn.id = r.runner_id
         WHERE r.category_id = $1 AND r.status = 'approved' AND ${ACTIVE_BAN}
           AND ${RUNNER_FILTER}
         ORDER BY r.time_ms ASC, r.submitted_at ASC, r.id ASC${limitSql}`,
        [categoryId, search, ...limitParams],
      );
      extras.push(...banned.rows);
    }
  }
  return extras;
}
