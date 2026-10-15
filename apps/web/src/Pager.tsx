import { useEffect, useState } from "react";

export function Pager({
  page,
  limit,
  total,
  onPage,
  unit,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
  unit: string;
}) {
  const last = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const [draft, setDraft] = useState(String(page));

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  function go(n: number) {
    if (!Number.isInteger(n)) return;
    onPage(Math.min(last, Math.max(1, n)));
  }

  return (
    <div className="pager">
      <button type="button" disabled={page <= 1} onClick={() => go(1)}>
        First
      </button>
      <button type="button" disabled={page <= 1} onClick={() => go(page - 1)}>
        Previous
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(Number(draft));
        }}
      >
        <label>
          Page{" "}
          <input
            type="number"
            min={1}
            max={last}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button type="submit">Go</button>
      </form>
      <span className="muted">
        of {last} · {total} {unit}
      </span>
      <button type="button" disabled={page >= last} onClick={() => go(page + 1)}>
        Next
      </button>
      <button type="button" disabled={page >= last} onClick={() => go(last)}>
        Last
      </button>
    </div>
  );
}
