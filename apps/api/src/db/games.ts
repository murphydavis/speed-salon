import type { Pool } from "./pool.js";
import { notFound } from "../errors.js";

export async function listGames(
  pool: Pool,
  page: number,
  limit: number,
): Promise<{ items: GameRow[]; total: number }> {
  const count = await pool.query<{ n: string }>("SELECT count(*)::text AS n FROM games");
  const total = Number(count.rows[0]?.n ?? 0);
  const result = await pool.query<GameRow>(
    `SELECT id, name, slug, default_category_id AS "defaultCategoryId"
     FROM games
     ORDER BY name ASC, id ASC
     OFFSET $1 LIMIT $2`,
    [(page - 1) * limit, limit],
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
  const categories = await pool.query<CategoryRow>(
    `SELECT id, game_id AS "gameId", name, slug
     FROM categories WHERE game_id = $1
     ORDER BY name ASC, id ASC`,
    [gameId],
  );
  const resolvedDefaultCategoryId =
    game.rows[0].defaultCategoryId ?? categories.rows[0]?.id ?? null;
  return {
    ...game.rows[0],
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

export type GameRow = {
  id: string;
  name: string;
  slug: string;
  defaultCategoryId: string | null;
};

export type CategoryRow = {
  id: string;
  gameId: string;
  name: string;
  slug: string;
};

export type GameDetail = GameRow & {
  categories: CategoryRow[];
  resolvedDefaultCategoryId: string | null;
  defaultIsExplicit: boolean;
};
