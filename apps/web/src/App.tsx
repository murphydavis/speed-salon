import { useEffect, useState } from "react";
import { ActAs, loadStoredModeratorId } from "./ActAs.js";
import { api } from "./api.js";
import { navigate, pathNow } from "./nav.js";
import { GamePage } from "./pages/GamePage.js";
import { HomePage } from "./pages/HomePage.js";
import { RunPage } from "./pages/RunPage.js";
import type { Moderator, Page } from "./types.js";

export function App() {
  const [loc, setLoc] = useState(pathNow);
  const [moderatorId, setModeratorId] = useState(loadStoredModeratorId);
  const [mods, setMods] = useState<Moderator[]>([]);

  useEffect(() => {
    const onPop = () => setLoc(pathNow());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    api<Page<Moderator>>("/moderators").then((body) => {
      setMods(body.items);
      setModeratorId((current) => current || body.items[0]?.id || "");
    });
  }, []);

  const current = mods.find((m) => m.id === moderatorId);
  const url = new URL(loc, "http://local.invalid");
  const parts = url.pathname.split("/").filter(Boolean);

  let page = <HomePage assignedGameIds={current?.assignedGameIds ?? []} />;
  if (parts[0] === "games" && parts[1]) {
    page = (
      <GamePage
        gameId={parts[1]}
        search={url.search}
        moderatorId={moderatorId}
        assigned={current?.assignedGameIds.includes(parts[1]) ?? false}
      />
    );
  } else if (parts[0] === "runs" && parts[1]) {
    page = (
      <RunPage
        runId={parts[1]}
        moderatorId={moderatorId}
        assignedGameIds={current?.assignedGameIds ?? []}
      />
    );
  }

  return (
    <>
      <header className="bar">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          Speed Salon
        </a>
        <ActAs value={moderatorId} onChange={setModeratorId} />
      </header>
      <main>{page}</main>
    </>
  );
}
