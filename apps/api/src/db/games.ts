import { notFound } from "../errors.js";
import type { Pool, PoolClient } from "./pool.js";

const ACTIVE_BAN = `
  EXISTS (
    SELECT 1 FROM bans b
    WHERE b.runner_id = r.runner_id
      AND b.appeal_state <> 'approved'
  )
`;

export async function listGames(
  pool: Pool,
  page: number,
  limit: number,
  q?: string,
): Promise<{ items: GameListRow[]; total: number }> {
  const search = q?.trim() ? q.trim() : null;
  const nameFilter = `( $1::text IS NULL OR g.name ILIKE '%' || $1 || '%' )`;
  const count = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM games g WHERE ${nameFilter}`,
    [search],
  );
  const total = Number(count.rows[0]?.n ?? 0);
  const result = await pool.query<GameListRow>(
    `SELECT
       g.id,
       g.name,
       g.slug,
       g.default_category_id AS "defaultCategoryId",
       coalesce(s.total, 0)::int AS "totalRuns",
       coalesce(s.approved, 0)::int AS "approvedRuns",
       coalesce(s.pending, 0)::int AS "pendingRuns",
       coalesce(s.banned, 0)::int AS "bannedRuns"
     FROM games g
     LEFT JOIN (
       SELECT
         c.game_id,
         count(*) AS total,
         count(*) FILTER (
           WHERE r.status = 'approved' AND NOT ${ACTIVE_BAN}
         ) AS approved,
         count(*) FILTER (
           WHERE r.status = 'pending'
         ) AS pending,
         count(*) FILTER (
           WHERE r.status = 'approved' AND ${ACTIVE_BAN}
         ) AS banned
       FROM categories c
       JOIN runs r ON r.category_id = c.id
       GROUP BY c.game_id
     ) s ON s.game_id = g.id
     WHERE ${nameFilter}
     ORDER BY g.name ASC, g.id ASC
     OFFSET $2 LIMIT $3`,
    [search, (page - 1) * limit, limit],
  );
  return { items: result.rows, total };
}

export async function getGame(pool: Pool, gameId: string): Promise<GameDetail> {
  const game = await pool.query<GameRow>(
    `SELECT id, name, slug, default_category_id AS "defaultCategoryId"
     FROM games WHERE id = $1`,
    [gameId],
  );
  if (!game.rows[0]) throw notFound("game");
  const [categories, counts] = await Promise.all([
    pool.query<CategoryRow>(
      `SELECT
         c.id,
         c.game_id AS "gameId",
         c.name,
         c.slug,
         count(r.id)::int AS "totalRuns",
         count(r.id) FILTER (
           WHERE r.status = 'approved' AND NOT ${ACTIVE_BAN}
         )::int AS "approvedRuns",
         count(r.id) FILTER (
           WHERE r.status = 'pending'
         )::int AS "pendingRuns",
         count(r.id) FILTER (
           WHERE r.status = 'approved' AND ${ACTIVE_BAN}
         )::int AS "bannedRuns"
       FROM categories c
       LEFT JOIN runs r ON r.category_id = c.id
       WHERE c.game_id = $1
       GROUP BY c.id
       ORDER BY c.name ASC, c.id ASC`,
      [gameId],
    ),
    pool.query<GameRunCounts>(
      `SELECT
         count(*)::int AS "totalRuns",
         count(*) FILTER (
           WHERE r.status = 'approved' AND NOT ${ACTIVE_BAN}
         )::int AS "approvedRuns",
         count(*) FILTER (
           WHERE r.status = 'pending'
         )::int AS "pendingRuns",
         count(*) FILTER (
           WHERE r.status = 'approved' AND ${ACTIVE_BAN}
         )::int AS "bannedRuns"
       FROM categories c
       JOIN runs r ON r.category_id = c.id
       WHERE c.game_id = $1`,
      [gameId],
    ),
  ]);
  const resolvedDefaultCategoryId =
    game.rows[0].defaultCategoryId ?? categories.rows[0]?.id ?? null;
  const runCounts = counts.rows[0] ?? {
    totalRuns: 0,
    approvedRuns: 0,
    pendingRuns: 0,
    bannedRuns: 0,
  };
  return {
    ...game.rows[0],
    ...runCounts,
    categories: categories.rows,
    resolvedDefaultCategoryId,
    defaultIsExplicit: game.rows[0].defaultCategoryId !== null,
  };
}

export async function resolveBoardCategoryId(
  pool: Pool,
  gameId: string,
  categoryId: string | undefined,
): Promise<string> {
  const game = await getGame(pool, gameId);
  if (categoryId) {
    const found = game.categories.find((c) => c.id === categoryId);
    if (!found) throw notFound("category");
    return found.id;
  }
  if (!game.resolvedDefaultCategoryId) throw notFound("category");
  return game.resolvedDefaultCategoryId;
}

export async function setDefaultCategory(
  client: PoolClient,
  gameId: string,
  categoryId: string,
  moderatorId: string,
): Promise<void> {
  const game = await client.query(`SELECT id FROM games WHERE id = $1 FOR UPDATE`, [gameId]);
  if (!game.rows[0]) throw notFound("game");
  const cat = await client.query(
    `SELECT id FROM categories WHERE id = $1 AND game_id = $2`,
    [categoryId, gameId],
  );
  if (!cat.rows[0]) throw notFound("category");
  await client.query(`UPDATE games SET default_category_id = $1 WHERE id = $2`, [
    categoryId,
    gameId,
  ]);
  await client.query(
    `INSERT INTO review_events (category_id, moderator_id, action, payload)
     VALUES ($1, $2, 'set_default_category', $3::jsonb)`,
    [categoryId, moderatorId, JSON.stringify({ categoryId })],
  );
}

export type GameRow = {
  id: string;
  name: string;
  slug: string;
  defaultCategoryId: string | null;
};

export type GameRunCounts = {
  totalRuns: number;
  approvedRuns: number;
  pendingRuns: number;
  bannedRuns: number;
};

export type GameListRow = GameRow & GameRunCounts;

export type CategoryRow = {
  id: string;
  gameId: string;
  name: string;
  slug: string;
} & GameRunCounts;

export type GameDetail = GameRow &
  GameRunCounts & {
    categories: CategoryRow[];
    resolvedDefaultCategoryId: string | null;
    defaultIsExplicit: boolean;
  };
