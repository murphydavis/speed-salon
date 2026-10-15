import {
  RANKING_MODES,
  RUN_STATUSES,
  csvExportFilename,
  type RankingMode,
  type RunStatus,
} from "@speed-salon/shared";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { assembleBoard, toCsv } from "./board.js";
import { decideAppeal, getBan, issueBan, liftBan } from "./db/bans.js";
import { findModerator, isAssigned, listModerators } from "./db/moderators.js";
import { getGame, listGames, resolveBoardCategoryId, setDefaultCategory } from "./db/games.js";
import type { Pool } from "./db/pool.js";
import { approveRun, getRun, listGameRuns, rejectRun, runGameId } from "./db/runs.js";
import { ApiError } from "./errors.js";
import { CSV_MAX_ROWS, parseFlag, parseLimit, parsePage } from "./http.js";
import { requireModerator } from "./middleware/moderator.js";
import { requestLog } from "./middleware/request-log.js";
import { mountOpenApiDocs } from "./openapi-docs.js";
import { MODERATOR_HEADER } from "@speed-salon/shared";

export function createApp(pool: Pool, opts: { logFile?: string } = {}): Express {
  const app = express();
  if (opts.logFile) app.use(requestLog(opts.logFile));
  app.use(express.json());
  mountOpenApiDocs(app);

  app.get("/moderators", asyncHandler(async (req, res) => {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const { items, total } = await listModerators(pool, page, limit);
    res.json({ page, limit, total, items, next: nextLink(req.path, page, limit, total, req.query) });
  }));

  app.get("/games", asyncHandler(async (req, res) => {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const qRaw = typeof req.query.q === "string" ? req.query.q : undefined;
    const q = qRaw?.trim() ? qRaw.trim() : undefined;
    const { items, total } = await listGames(pool, page, limit, q);
    res.json({ page, limit, total, items, next: nextLink(req.path, page, limit, total, req.query) });
  }));

  app.get("/games/:gameId", asyncHandler(async (req, res) => {
    res.json(await getGame(pool, req.params.gameId));
  }));

  app.get("/games/:gameId/runs", asyncHandler(async (req, res) => {
    const game = await getGame(pool, req.params.gameId);
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const status = parseStatus(req.query.status);
    if (status !== "approved") {
      await requireAssignedToGame(pool, req, game.id);
    }
    const { items, total } = await listGameRuns(pool, game.id, status, page, limit);
    res.json({
      gameId: game.id,
      status,
      page,
      limit,
      total,
      items,
      next: nextLink(req.path, page, limit, total, req.query),
    });
  }));

  app.get("/games/:gameId/leaderboard.csv", asyncHandler(async (req, res) => {
    const ignoreMaxRows = parseFlag(req.query.ignoreMaxRows);
    const game = await getGame(pool, req.params.gameId);
    const board = await loadBoard(pool, req, ignoreMaxRows ? null : CSV_MAX_ROWS, 1);
    res.setHeader("content-type", "text/csv; charset=utf-8");
    const flags = {
      includePending: board.includePending,
      includeBanned: board.includeBanned,
    };
    res.setHeader(
      "content-disposition",
      `attachment; filename="${csvExportFilename(game.slug, new Date(), flags)}"`,
    );
    res.send(toCsv(board.items, flags));
  }));

  app.get("/games/:gameId/leaderboard", asyncHandler(async (req, res) => {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const board = await loadBoard(pool, req, limit, page);
    res.json({
      gameId: req.params.gameId,
      categoryId: board.categoryId,
      mode: board.mode,
      page,
      limit,
      total: board.total,
      includePending: board.includePending,
      includeBanned: board.includeBanned,
      items: board.items,
      next: nextLink(req.path, page, limit, board.total, req.query),
    });
  }));

  app.post("/games/:gameId/default-category", requireModerator(pool), asyncHandler(async (req, res) => {
    const categoryId = typeof req.body?.categoryId === "string" ? req.body.categoryId : "";
    if (!categoryId) throw new ApiError(400, "invalid_default", "categoryId is required");
    await mutateAssigned(pool, req, req.params.gameId, async (client, moderatorId) => {
      await setDefaultCategory(client, req.params.gameId, categoryId, moderatorId);
    });
    res.json(await getGame(pool, req.params.gameId));
  }));

  app.post("/games/:gameId/bans", requireModerator(pool), asyncHandler(async (req, res) => {
    const runnerId = typeof req.body?.runnerId === "string" ? req.body.runnerId : "";
    const comment = typeof req.body?.comment === "string" ? req.body.comment : "";
    if (!runnerId) throw new ApiError(400, "invalid_ban", "runnerId is required");
    const ban = await mutateAssigned(pool, req, req.params.gameId, async (client, moderatorId) => {
      return issueBan(client, runnerId, moderatorId, comment);
    });
    res.status(201).json(ban);
  }));

  app.post("/games/:gameId/bans/:banId/lift", requireModerator(pool), asyncHandler(async (req, res) => {
    const ban = await mutateAssigned(pool, req, req.params.gameId, async (client, moderatorId) => {
      const current = await getBan(client, req.params.banId);
      return liftBan(client, current.id, moderatorId);
    });
    res.json(ban);
  }));

  app.post(
    "/games/:gameId/bans/:banId/appeal-decision",
    requireModerator(pool),
    asyncHandler(async (req, res) => {
      const decision = req.body?.decision;
      if (decision !== "approved" && decision !== "rejected") {
        throw new ApiError(400, "invalid_appeal", "decision must be approved or rejected");
      }
      const ban = await mutateAssigned(pool, req, req.params.gameId, async (client, moderatorId) => {
        return decideAppeal(client, req.params.banId, moderatorId, decision);
      });
      res.json(ban);
    }),
  );

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

async function loadBoard(pool: Pool, req: Request, limit: number | null, page: number) {
  const mode = parseMode(req.query.mode);
  const categoryId = await resolveBoardCategoryId(
    pool,
    req.params.gameId,
    typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
  );
  const qRaw = typeof req.query.q === "string" ? req.query.q : undefined;
  const q = qRaw?.trim() ? qRaw.trim() : undefined;
  const includePending = parseFlag(req.query.includePending);
  const includeBanned = parseFlag(req.query.includeBanned);
  if (includePending || includeBanned) {
    await requireAssignedToGame(pool, req, req.params.gameId);
  }
  const assembled = await assembleBoard(pool, {
    categoryId,
    mode,
    q,
    page,
    limit,
    includePending,
    includeBanned,
  });
  return { ...assembled, categoryId, mode, includePending, includeBanned };
}

async function mutateAssigned<T>(
  pool: Pool,
  req: Request,
  gameId: string,
  fn: (client: import("pg").PoolClient, moderatorId: string) => Promise<T>,
): Promise<T> {
  const moderatorId = req.moderator!.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (!(await isAssigned(client, moderatorId, gameId))) {
      throw new ApiError(403, "forbidden", "moderator is not assigned to this game");
    }
    const result = await fn(client, moderatorId);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function requireAssignedToGame(pool: Pool, req: Request, gameId: string): Promise<void> {
  const id = req.get(MODERATOR_HEADER)?.trim();
  if (!id) {
    throw new ApiError(401, "unauthorized", `${MODERATOR_HEADER} is required`);
  }
  const mod = await findModerator(pool, id);
  if (!mod) {
    throw new ApiError(401, "unauthorized", "unknown moderator");
  }
  if (!(await isAssigned(pool, mod.id, gameId))) {
    throw new ApiError(403, "forbidden", "moderator is not assigned to this game");
  }
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

function parseStatus(raw: unknown): RunStatus {
  if (typeof raw === "string" && (RUN_STATUSES as readonly string[]).includes(raw)) {
    return raw as RunStatus;
  }
  throw new ApiError(400, "invalid_query", "status must be pending, approved, or rejected");
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
