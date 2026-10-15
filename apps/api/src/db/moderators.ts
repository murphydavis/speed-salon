import type { Pool, PoolClient } from "./pool.js";

export async function listModerators(
  pool: Pool,
  page: number,
  limit: number,
): Promise<{ items: ModeratorRow[]; total: number }> {
  const count = await pool.query<{ n: string }>("SELECT count(*)::text AS n FROM moderators");
  const total = Number(count.rows[0]?.n ?? 0);
  const result = await pool.query<ModeratorRow>(
    `SELECT
       m.id,
       m.display_name AS "displayName",
       coalesce(
         array_agg(mg.game_id ORDER BY mg.game_id) FILTER (WHERE mg.game_id IS NOT NULL),
         '{}'
       ) AS "assignedGameIds"
     FROM moderators m
     LEFT JOIN moderator_games mg ON mg.moderator_id = m.id
     GROUP BY m.id, m.display_name
     ORDER BY m.display_name ASC, m.id ASC
     OFFSET $1 LIMIT $2`,
    [(page - 1) * limit, limit],
  );
  return { items: result.rows, total };
}

export type ModeratorRow = {
  id: string;
  displayName: string;
  assignedGameIds: string[];
};

export async function findModerator(
  pool: Pool | PoolClient,
  id: string,
): Promise<{ id: string; displayName: string } | null> {
  const result = await pool.query<{ id: string; displayName: string }>(
    `SELECT id, display_name AS "displayName" FROM moderators WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function isAssigned(
  pool: Pool | PoolClient,
  moderatorId: string,
  gameId: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM moderator_games WHERE moderator_id = $1 AND game_id = $2`,
    [moderatorId, gameId],
  );
  return (result.rowCount ?? 0) > 0;
}
