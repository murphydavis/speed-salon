import { useEffect, useState } from "react";
import { api } from "./api.js";
import type { Moderator, Page } from "./types.js";

const STORAGE_KEY = "speed-salon-moderator-id";

export function ActAs({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [mods, setMods] = useState<Moderator[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Page<Moderator>>("/moderators")
      .then((body) => setMods(body.items))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <label>
      Act as{" "}
      <select
        value={value}
        onChange={(e) => {
          localStorage.setItem(STORAGE_KEY, e.target.value);
          onChange(e.target.value);
        }}
      >
        {mods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
          </option>
        ))}
      </select>
      {error ? <span className="muted"> ({error})</span> : null}
    </label>
  );
}

export function loadStoredModeratorId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}
