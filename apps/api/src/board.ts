import type { RankingMode } from "@speed-salon/shared";
import {
  listBoardExtras,
  listLeaderboard,
  listPlayerPlaces,
  listPodiumRunPlaces,
} from "./db/leaderboard.js";
import type { Pool } from "./db/pool.js";

export type BoardItem = {
  place: number | null;
  runId: string;
  timeMs: number;
  submittedAt: Date | string;
  kind: string;
  isPb: boolean;
  playerPlace: number | null;
  runPlace: number | null;
  runner: { id: string; name: string };
};

export async function assembleBoard(
  pool: Pool,
  opts: {
    categoryId: string;
    mode: RankingMode;
    q: string | undefined;
    page: number;
    limit: number | null;
    includePending: boolean;
    includeBanned: boolean;
    includeApproved: boolean;
  },
): Promise<{ items: BoardItem[]; total: number }> {
  const extrasOn = opts.includePending || opts.includeBanned;
  const showApproved = opts.includeApproved;
  const mergeView = extrasOn || !showApproved;
  const rankedPage = mergeView ? 1 : opts.page;
  const rankedLimit = mergeView ? null : opts.limit;
  const [{ items, total: rankedTotal }, playerPlaces, runPlaces] = await Promise.all([
    showApproved
      ? listLeaderboard(pool, opts.categoryId, opts.mode, opts.q, rankedPage, rankedLimit)
      : Promise.resolve({ items: [], total: 0 }),
    listPlayerPlaces(pool, opts.categoryId),
    listPodiumRunPlaces(pool, opts.categoryId),
  ]);
  const extras = extrasOn
    ? await listBoardExtras(
        pool,
        opts.categoryId,
        opts.mode,
        opts.q,
        opts.includePending,
        opts.includeBanned,
        null,
      )
    : [];
  const offset = mergeView || opts.limit === null ? 0 : (opts.page - 1) * opts.limit;
  const ranked: BoardItem[] = items.map((row, i) => ({
    place: offset + i + 1,
    runId: row.id,
    timeMs: row.timeMs,
    submittedAt: row.submittedAt,
    kind: row.kind,
    isPb: row.isPb,
    playerPlace: playerPlaces.get(row.runnerId) ?? null,
    runPlace: runPlaces.get(row.id) ?? null,
    runner: { id: row.runnerId, name: row.runnerName },
  }));
  const rankedIds = new Set(ranked.map((row) => row.runId));
  const extraRows: BoardItem[] = extras
    .filter((row) => !rankedIds.has(row.id))
    .map((row) => ({
      place: null,
      runId: row.id,
      timeMs: row.timeMs,
      submittedAt: row.submittedAt,
      kind: row.kind,
      isPb: false,
      playerPlace: null,
      runPlace: null,
      runner: { id: row.runnerId, name: row.runnerName },
    }));
  const merged = [...ranked, ...extraRows].sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    const at = new Date(a.submittedAt).getTime();
    const bt = new Date(b.submittedAt).getTime();
    if (at !== bt) return at - bt;
    return a.runId.localeCompare(b.runId);
  });
  if (!mergeView) return { items: merged, total: rankedTotal };
  const total = merged.length;
  if (opts.limit === null) return { items: merged, total };
  const start = (opts.page - 1) * opts.limit;
  return { items: merged.slice(start, start + opts.limit), total };
}

export function toCsv(
  items: BoardItem[],
  flags: { includePending: boolean; includeBanned: boolean; includeApproved: boolean },
): string {
  const header = [
    "place",
    "runner",
    "time_ms",
    "submitted_at",
    "kind",
    "is_pb",
    "player_place",
    "run_place",
    "run_id",
    "include_pending",
    "include_banned",
    "include_approved",
  ];
  const lines = [header.join(",")];
  for (const row of items) {
    const submitted =
      row.submittedAt instanceof Date
        ? row.submittedAt.toISOString()
        : String(row.submittedAt);
    lines.push(
      [
        row.place ?? "",
        csvField(row.runner.name),
        row.timeMs,
        csvField(submitted),
        row.kind,
        row.isPb ? "true" : "false",
        row.playerPlace ?? "",
        row.runPlace ?? "",
        row.runId,
        flags.includePending ? "true" : "false",
        flags.includeBanned ? "true" : "false",
        flags.includeApproved ? "true" : "false",
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
