import { RANKING_MODES, csvExportFilename, type RankingMode } from "@speed-salon/shared";
import { useEffect, useMemo, useState } from "react";
import { api, apiDownload, ApiRequestError } from "../api.js";
import { formatSubmitted, formatTime } from "../format.js";
import { navigate } from "../nav.js";
import { Pager } from "../Pager.js";
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
  const q = params.get("q") ?? "";
  const pageRaw = Number(params.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const [game, setGame] = useState<GameDetail | null>(null);
  const [board, setBoard] = useState<LeaderboardPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(q);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ignoreMaxRows, setIgnoreMaxRows] = useState(false);

  function setQuery(next: {
    mode?: RankingMode;
    categoryId?: string;
    includePending?: boolean;
    includeBanned?: boolean;
    q?: string;
    page?: number;
  }) {
    const qs = new URLSearchParams();
    const nextMode = next.mode ?? mode;
    const nextCat = next.categoryId ?? categoryId;
    const nextPending = next.includePending ?? includePending;
    const nextBanned = next.includeBanned ?? includeBanned;
    const nextQ = next.q ?? q;
    const filterChanged =
      next.mode !== undefined ||
      next.categoryId !== undefined ||
      next.includePending !== undefined ||
      next.includeBanned !== undefined ||
      next.q !== undefined;
    const nextPage = next.page ?? (filterChanged ? 1 : page);
    if (nextMode !== "players") qs.set("mode", nextMode);
    if (nextCat) qs.set("categoryId", nextCat);
    if (nextQ.trim()) qs.set("q", nextQ.trim());
    if (assigned && nextPending) qs.set("includePending", "1");
    if (assigned && nextBanned) qs.set("includeBanned", "1");
    if (nextPage > 1) qs.set("page", String(nextPage));
    const encoded = qs.toString();
    navigate(`/games/${gameId}${encoded ? `?${encoded}` : ""}`);
  }

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const qs = new URLSearchParams();
    qs.set("mode", mode);
    if (categoryId) qs.set("categoryId", categoryId);
    if (q.trim()) qs.set("q", q.trim());
    if (includePending) qs.set("includePending", "true");
    if (includeBanned) qs.set("includeBanned", "true");
    if (page > 1) qs.set("page", String(page));
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
  }, [gameId, mode, categoryId, includePending, includeBanned, moderatorId, q, page]);

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
        <form
          className="row-btns"
          onSubmit={(e) => {
            e.preventDefault();
            setActionError(null);
            const categoryId = (e.currentTarget.elements.namedItem("defaultCat") as HTMLSelectElement)
              .value;
            api<GameDetail>(`/games/${gameId}/default-category`, {
              method: "POST",
              moderatorId,
              body: JSON.stringify({ categoryId }),
            })
              .then(setGame)
              .catch((err: Error) => setActionError(err.message));
          }}
        >
          <label>
            Default board{" "}
            <select name="defaultCat" defaultValue={game.defaultCategoryId ?? game.categories[0]?.id}>
              {game.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Set default</button>
        </form>
      ) : null}
      {actionError ? <p className="error">{actionError}</p> : null}

      <form
        className="row-btns"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ q: searchDraft });
        }}
      >
        <label>
          Search runner{" "}
          <input
            value={searchDraft}
            placeholder="optional"
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </label>
        <button type="submit">Search</button>
        {q ? (
          <button type="button" onClick={() => { setSearchDraft(""); setQuery({ q: "" }); }}>
            Clear
          </button>
        ) : null}
      </form>

      <div className="row-btns">
        <button
          type="button"
          onClick={() => {
            const qs = new URLSearchParams();
            qs.set("mode", mode);
            const exportCategory = board.categoryId || categoryId;
            if (exportCategory) qs.set("categoryId", exportCategory);
            const exportQ = q.trim();
            if (exportQ) qs.set("q", exportQ);
            if (includePending) qs.set("includePending", "true");
            if (includeBanned) qs.set("includeBanned", "true");
            if (ignoreMaxRows) qs.set("ignoreMaxRows", "true");
            apiDownload(
              `/games/${gameId}/leaderboard.csv?${qs.toString()}`,
              csvExportFilename(game.slug, new Date(), {
                includePending,
                includeBanned,
              }),
              { moderatorId: includePending || includeBanned ? moderatorId : undefined },
            ).catch((err: unknown) =>
              setActionError(err instanceof ApiRequestError ? err.message : String(err)),
            );
          }}
        >
          Export CSV
        </button>
        <label>
          <input
            type="checkbox"
            checked={ignoreMaxRows}
            onChange={(e) => setIgnoreMaxRows(e.target.checked)}
          />{" "}
          Attempt uncapped export
        </label>
      </div>
      {ignoreMaxRows ? (
        <p className="muted">
          Uncapped export skips the 10 000-row cap. It may still time out or fail on a large board.
        </p>
      ) : null}

      {assigned ? (
        <div className="row-btns">
          <button
            type="button"
            className={includePending ? "active" : ""}
            onClick={() => setQuery({ includePending: !includePending })}
          >
            {includePending ? "Hide pending" : "Show pending"}
          </button>
          <button
            type="button"
            className={includeBanned ? "active" : ""}
            onClick={() => setQuery({ includeBanned: !includeBanned })}
          >
            {includeBanned ? "Hide banned" : "Show banned"}
          </button>
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
      <Pager
        page={board.page}
        limit={board.limit}
        total={board.total}
        onPage={(n) => setQuery({ page: n })}
      />
    </>
  );
}

function rankMark(mode: RankingMode, row: { isPb: boolean; playerPlace: number | null }) {
  const playerPlace = row.playerPlace == null ? null : Number(row.playerPlace);
  const podium = playerPlace === 1 || playerPlace === 2 || playerPlace === 3;
  const showMedal = podium && (mode === "players" || row.isPb);
  const medal = showMedal
    ? playerPlace === 1
      ? "🥇"
      : playerPlace === 2
        ? "🥈"
        : "🥉"
    : null;
  const label =
    playerPlace === 1 ? "1st" : playerPlace === 2 ? "2nd" : playerPlace === 3 ? "3rd" : null;
  return (
    <>
      {medal && label ? (
        <span className="trophy" title={`Player ${label} (PB)`}>
          {" "}
          {medal}
        </span>
      ) : null}
      {mode === "runs" && row.isPb ? <span className="pb"> PB</span> : null}
    </>
  );
}
