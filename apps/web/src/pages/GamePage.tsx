import { RANKING_MODES, type RankingMode } from "@speed-salon/shared";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { formatSubmitted, formatTime } from "../format.js";
import { navigate } from "../nav.js";
import type { GameDetail, LeaderboardPage } from "../types.js";

export function GamePage({
  gameId,
  search,
  moderatorId,
  assigned,
}: {
  gameId: string;
  search: string;
  moderatorId: string;
  assigned: boolean;
}) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const mode = (params.get("mode") === "runs" ? "runs" : "players") as RankingMode;
  const categoryId = params.get("categoryId") ?? undefined;
  const includePending = assigned && params.get("includePending") === "1";
  const includeBanned = assigned && params.get("includeBanned") === "1";

  const [game, setGame] = useState<GameDetail | null>(null);
  const [board, setBoard] = useState<LeaderboardPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setQuery(next: {
    mode?: RankingMode;
    categoryId?: string;
    includePending?: boolean;
    includeBanned?: boolean;
  }) {
    const q = new URLSearchParams();
    const nextMode = next.mode ?? mode;
    const nextCat = next.categoryId ?? categoryId;
    const nextPending = next.includePending ?? includePending;
    const nextBanned = next.includeBanned ?? includeBanned;
    if (nextMode !== "players") q.set("mode", nextMode);
    if (nextCat) q.set("categoryId", nextCat);
    if (assigned && nextPending) q.set("includePending", "1");
    if (assigned && nextBanned) q.set("includeBanned", "1");
    const qs = q.toString();
    navigate(`/games/${gameId}${qs ? `?${qs}` : ""}`);
  }

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const qs = new URLSearchParams();
    qs.set("mode", mode);
    if (categoryId) qs.set("categoryId", categoryId);
    if (includePending) qs.set("includePending", "true");
    if (includeBanned) qs.set("includeBanned", "true");
    Promise.all([
      api<GameDetail>(`/games/${gameId}`),
      api<LeaderboardPage>(`/games/${gameId}/leaderboard?${qs.toString()}`, {
        moderatorId: includePending || includeBanned ? moderatorId : undefined,
      }),
    ])
      .then(([g, lb]) => {
        if (cancelled) return;
        setGame(g);
        setBoard(lb);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, mode, categoryId, includePending, includeBanned, moderatorId]);

  if (error) return <p className="error">{error}</p>;
  if (!game || !board) return <p className="muted">Loading…</p>;

  const activeCategory =
    game.categories.find((c) => c.id === board.categoryId) ?? game.categories[0];

  return (
    <>
      <p>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          Games
        </a>
      </p>
      <h1>
        {game.name}
        {assigned ? " *" : ""}
      </h1>
      {assigned ? <p className="muted">You are assigned to this game.</p> : null}
      {!game.defaultIsExplicit ? (
        <p className="warn">
          No default category is set. Showing the first category by name ({activeCategory?.name}).
        </p>
      ) : null}

      <p>
        Board: <strong>{activeCategory?.name}</strong>
      </p>
      <div className="row-btns">
        {game.categories.map((c) => (
          <button
            key={c.id}
            className={c.id === board.categoryId ? "active" : ""}
            type="button"
            onClick={() => setQuery({ categoryId: c.id })}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="row-btns">
        {RANKING_MODES.map((m) => (
          <button
            key={m}
            className={m === mode ? "active" : ""}
            type="button"
            onClick={() => setQuery({ mode: m })}
          >
            Rank by {m}
          </button>
        ))}
      </div>

      {assigned ? (
        <div className="row-btns">
          <label>
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setQuery({ includePending: e.target.checked })}
            />{" "}
            Show pending
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeBanned}
              onChange={(e) => setQuery({ includeBanned: e.target.checked })}
            />{" "}
            Show banned
          </label>
        </div>
      ) : (
        <p className="muted">Act as an assigned moderator to show pending or banned runs on this board.</p>
      )}

      <table>
        <thead>
          <tr>
            <th>Place</th>
            <th>Runner</th>
            <th>Time</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {board.items.map((row) => (
            <tr
              key={`${row.kind}-${row.runId}`}
              className={row.kind === "pending" ? "row-pending" : row.kind === "banned" ? "row-banned" : undefined}
            >
              <td>{row.place ?? "—"}</td>
              <td>
                {row.runner.name}
                {row.kind === "pending" ? " (pending)" : row.kind === "banned" ? " (banned)" : ""}
              </td>
              <td>
                <a
                  href={`/runs/${row.runId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/runs/${row.runId}`);
                  }}
                >
                  {formatTime(row.timeMs)}
                </a>
                {rankMark(mode, row)}
              </td>
              <td>{formatSubmitted(row.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {board.items.length === 0 ? <p className="muted">No runs to show on this board.</p> : null}
    </>
  );
}

function rankMark(mode: RankingMode, row: { isPb: boolean; playerPlace: number | null }) {
  const podium = row.playerPlace === 1 || row.playerPlace === 2 || row.playerPlace === 3;
  if (podium && (mode === "players" || row.isPb)) {
    const medal = row.playerPlace === 1 ? "🥇" : row.playerPlace === 2 ? "🥈" : "🥉";
    const label = row.playerPlace === 1 ? "1st" : row.playerPlace === 2 ? "2nd" : "3rd";
    return (
      <span className="trophy" title={`Personal best · ${label}`}>
        {" "}
        {medal}
      </span>
    );
  }
  if (mode === "runs" && row.isPb) {
    return <span className="pb"> PB</span>;
  }
  return null;
}
