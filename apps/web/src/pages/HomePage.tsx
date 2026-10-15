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
  const [result, setResult] = useState<Page<Game> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assigned = new Set(assignedGameIds);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (page > 1) qs.set("page", String(page));
    const suffix = qs.toString();
    api<Page<Game>>(`/games${suffix ? `?${suffix}` : ""}`)
      .then(setResult)
      .catch((err: Error) => setError(err.message));
  }, [page]);

  function go(nextPage: number) {
    navigate(nextPage > 1 ? `/?page=${nextPage}` : "/");
  }

  if (error) return <p className="error">{error}</p>;
  if (!result) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Games</h1>
      <p className="muted">
        Open a game to see its default board. <strong>*</strong> means the current moderator is assigned.
      </p>
      <ul>
        {result.items.map((g) => {
          const mine = assigned.has(g.id);
          return (
            <li key={g.id} className={mine ? "assigned-game" : undefined}>
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
            </li>
          );
        })}
      </ul>
      <Pager page={result.page} limit={result.limit} total={result.total} onPage={go} />
    </>
  );
}
