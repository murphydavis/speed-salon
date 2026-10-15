import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { navigate } from "../nav.js";
import { Pager } from "../Pager.js";
import type { Game, Page } from "../types.js";

export function HomePage({
  search,
  assignedGameIds,
}: {
  search: string;
  assignedGameIds: string[];
}) {
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const pageRaw = Number(params.get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const q = params.get("q") ?? "";
  const [searchDraft, setSearchDraft] = useState(q);
  const [result, setResult] = useState<Page<Game> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assigned = new Set(assignedGameIds);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    if (page > 1) qs.set("page", String(page));
    const suffix = qs.toString();
    api<Page<Game>>(`/games${suffix ? `?${suffix}` : ""}`)
      .then(setResult)
      .catch((err: Error) => setError(err.message));
  }, [page, q]);

  function setListQuery(next: { q?: string; page?: number }) {
    const qs = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? (next.q !== undefined ? 1 : page);
    if (nextQ.trim()) qs.set("q", nextQ.trim());
    if (nextPage > 1) qs.set("page", String(nextPage));
    const encoded = qs.toString();
    navigate(encoded ? `/?${encoded}` : "/");
  }

  if (error) return <p className="error">{error}</p>;
  if (!result) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Games</h1>
      <p className="muted">
        Open a game to see its default board. Counts are totals across all categories and statuses.{" "}
        <strong>*</strong> means the current moderator is assigned.
      </p>
      <form
        className="row-btns"
        onSubmit={(e) => {
          e.preventDefault();
          setListQuery({ q: searchDraft });
        }}
      >
        <label>
          Search game{" "}
          <input
            value={searchDraft}
            placeholder="optional"
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </label>
        <button type="submit">Search</button>
        {q ? (
          <button type="button" onClick={() => setListQuery({ q: "" })}>
            Clear
          </button>
        ) : null}
      </form>
      <table>
        <thead>
          <tr>
            <th>Game</th>
            <th>Total</th>
            <th>Approved</th>
            <th>Pending</th>
            <th>Banned</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((g) => {
            const mine = assigned.has(g.id);
            return (
              <tr key={g.id} className={mine ? "assigned-game" : undefined}>
                <td>
                  <a
                    href={`/games/${g.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/games/${g.id}`);
                    }}
                  >
                    {g.name}
                  </a>
                  {mine ? " *" : ""}
                </td>
                <td>{g.totalRuns ?? "—"}</td>
                <td>{g.approvedRuns ?? "—"}</td>
                <td>{g.pendingRuns ?? "—"}</td>
                <td>{g.bannedRuns ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {result.items.length === 0 ? <p className="muted">No games match.</p> : null}
      <Pager
        page={result.page}
        limit={result.limit}
        total={result.total}
        unit="games"
        onPage={(n) => setListQuery({ page: n })}
      />
    </>
  );
}
