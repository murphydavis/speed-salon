import type { RankingMode } from "@speed-salon/shared";
import { listBoardExtras, listLeaderboard, listPlayerPlaces } from "./db/leaderboard.js";
import type { Pool } from "./db/pool.js";

export type BoardItem = {
  place: number | null;
  runId: string;
  timeMs: number;
  submittedAt: Date | string;
  kind: string;
  isPb: boolean;
  playerPlace: number | null;
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
  },
): Promise<{ items: BoardItem[]; total: number }> {
  const [{ items, total }, playerPlaces] = await Promise.all([
    listLeaderboard(pool, opts.categoryId, opts.mode, opts.q, opts.page, opts.limit),
    listPlayerPlaces(pool, opts.categoryId, opts.q),
  ]);
  const extras =
    opts.includePending || opts.includeBanned
      ? await listBoardExtras(
          pool,
          opts.categoryId,
          opts.mode,
          opts.q,
          opts.includePending,
          opts.includeBanned,
          opts.limit,
        )
      : [];
  const offset = opts.limit === null ? 0 : (opts.page - 1) * opts.limit;
  const ranked: BoardItem[] = items.map((row, i) => ({
    place: offset + i + 1,
    runId: row.id,
    timeMs: row.timeMs,
    submittedAt: row.submittedAt,
    kind: row.kind,
    isPb: row.isPb,
    playerPlace: playerPlaces.get(row.runnerId) ?? null,
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
      isPb: row.isPb,
      playerPlace: null,
      runner: { id: row.runnerId, name: row.runnerName },
    }));
  const merged = [...ranked, ...extraRows].sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    const at = new Date(a.submittedAt).getTime();
    const bt = new Date(b.submittedAt).getTime();
    if (at !== bt) return at - bt;
    return a.runId.localeCompare(b.runId);
  });
  return { items: merged, total };
}

export function toCsv(items: BoardItem[]): string {
  const header = [
    "place",
    "runner",
    "time_ms",
    "submitted_at",
    "kind",
    "is_pb",
    "player_place",
    "run_id",
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
        row.runId,
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
