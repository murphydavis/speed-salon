import { useEffect, useState } from "react";
import { api } from "../api.js";
import { navigate } from "../nav.js";
import type { Game, Page } from "../types.js";

export function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Page<Game>>("/games")
      .then((body) => setGames(body.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Games</h1>
      <p className="muted">Open a game to see its default board.</p>
      <ul>
        {games.map((g) => (
          <li key={g.id}>
            <a
              href={`/games/${g.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/games/${g.id}`);
              }}
            >
              {g.name}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
