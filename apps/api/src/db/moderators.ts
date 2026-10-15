import type { Pool, PoolClient } from "./pool.js";

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
