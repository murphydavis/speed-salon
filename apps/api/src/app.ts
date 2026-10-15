import {
  RANKING_MODES,
  type RankingMode,
} from "@speed-salon/shared";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { isAssigned } from "./db/moderators.js";
import { getGame, listGames, resolveBoardCategoryId } from "./db/games.js";
import { listLeaderboard } from "./db/leaderboard.js";
import type { Pool } from "./db/pool.js";
import { approveRun, getRun, rejectRun, runGameId } from "./db/runs.js";
import { ApiError } from "./errors.js";
import { parseLimit, parsePage } from "./http.js";
import { requireModerator } from "./middleware/moderator.js";
import { mountOpenApiDocs } from "./openapi-docs.js";

export function createApp(pool: Pool): Express {
  const app = express();
  app.use(express.json());
  mountOpenApiDocs(app);

  app.get("/games", asyncHandler(async (req, res) => {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const { items, total } = await listGames(pool, page, limit);
    res.json({ page, limit, total, items, next: nextLink(req.path, page, limit, total, req.query) });
  }));

  app.get("/games/:gameId", asyncHandler(async (req, res) => {
    res.json(await getGame(pool, req.params.gameId));
  }));

  app.get("/games/:gameId/leaderboard", asyncHandler(async (req, res) => {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const mode = parseMode(req.query.mode);
    const categoryId = await resolveBoardCategoryId(
      pool,
      req.params.gameId,
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
    );
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const { items, total } = await listLeaderboard(pool, categoryId, mode, q, page, limit);
    const offset = (page - 1) * limit;
    res.json({
      gameId: req.params.gameId,
      categoryId,
      mode,
      page,
      limit,
      total,
      items: items.map((row, i) => ({
        place: offset + i + 1,
        runId: row.id,
        timeMs: row.timeMs,
        submittedAt: row.submittedAt,
        runner: { id: row.runnerId, name: row.runnerName },
      })),
      next: nextLink(req.path, page, limit, total, req.query),
    });
  }));

  app.get("/runs/:runId", asyncHandler(async (req, res) => {
    res.json(await getRun(pool, req.params.runId));
  }));

  app.post("/runs/:runId/approval", requireModerator(pool), asyncHandler(async (req, res) => {
    await mutateRun(pool, req, async (client, runId, moderatorId) => {
      await approveRun(client, runId, moderatorId);
    });
    res.status(200).json(await getRun(pool, req.params.runId));
  }));

  app.post("/runs/:runId/rejection", requireModerator(pool), asyncHandler(async (req, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
    const comment = typeof req.body?.comment === "string" ? req.body.comment : "";
    await mutateRun(pool, req, async (client, runId, moderatorId) => {
      await rejectRun(client, runId, moderatorId, reason, comment);
    });
    res.status(200).json(await getRun(pool, req.params.runId));
  }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.status).json(err.toJSON());
      return;
    }
    console.error(err);
    res.status(500).json({
      status: 500,
      code: "internal",
      message: "internal error",
    });
  });

  return app;
}

async function mutateRun(
  pool: Pool,
  req: Request,
  fn: (
    client: import("pg").PoolClient,
    runId: string,
    moderatorId: string,
  ) => Promise<void>,
): Promise<void> {
  const moderatorId = req.moderator!.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const gameId = await runGameId(client, req.params.runId);
    if (!(await isAssigned(client, moderatorId, gameId))) {
      throw new ApiError(403, "forbidden", "moderator is not assigned to this game");
    }
    await fn(client, req.params.runId, moderatorId);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function parseMode(raw: unknown): RankingMode {
  if (raw === undefined) return "players";
  if (typeof raw === "string" && (RANKING_MODES as readonly string[]).includes(raw)) {
    return raw as RankingMode;
  }
  throw new ApiError(400, "invalid_query", "mode must be players or runs");
}

function nextLink(
  path: string,
  page: number,
  limit: number,
  total: number,
  query: Request["query"],
): string | null {
  if (page * limit >= total) return null;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && key !== "page") params.set(key, value);
  }
  params.set("page", String(page + 1));
  params.set("limit", String(limit));
  return `${path}?${params.toString()}`;
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
