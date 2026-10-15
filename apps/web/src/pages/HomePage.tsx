import { useEffect, useState } from "react";
import { api } from "../api.js";
import { navigate } from "../nav.js";
import type { Game, Page } from "../types.js";

export function HomePage({ assignedGameIds }: { assignedGameIds: string[] }) {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);
  const assigned = new Set(assignedGameIds);

  useEffect(() => {
    api<Page<Game>>("/games")
      .then((body) => setGames(body.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Games</h1>
      <p className="muted">
        Open a game to see its default board. <strong>*</strong> means the current moderator is assigned.
      </p>
      <ul>
        {games.map((g) => {
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
    </>
  );
}
