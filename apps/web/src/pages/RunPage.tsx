import { REJECT_REASONS } from "@speed-salon/shared";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiRequestError } from "../api.js";
import { formatTime, formatWhen } from "../format.js";
import { navigate } from "../nav.js";
import type { RunDetail } from "../types.js";

export function RunPage({
  runId,
  moderatorId,
  assignedGameIds,
}: {
  runId: string;
  moderatorId: string;
  assignedGameIds: string[];
}) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reason, setReason] = useState<(typeof REJECT_REASONS)[number]>("invalid_proof");
  const [comment, setComment] = useState("");
  const [banComment, setBanComment] = useState("");

  useEffect(() => {
    api<RunDetail>(`/runs/${runId}`)
      .then(setRun)
      .catch((err: Error) => setError(err.message));
  }, [runId]);

  async function approve() {
    setActionError(null);
    try {
      setRun(await api<RunDetail>(`/runs/${runId}/approval`, { method: "POST", body: "{}", moderatorId }));
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : String(err));
    }
  }

  async function reject(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    try {
      setRun(
        await api<RunDetail>(`/runs/${runId}/rejection`, {
          method: "POST",
          moderatorId,
          body: JSON.stringify({ reason, comment }),
        }),
      );
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : String(err));
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!run) return <p className="muted">Loading…</p>;

  const assigned = assignedGameIds.includes(run.gameId);
  const canMutate = run.status === "pending" && assigned;

  return (
    <>
      <p>
        <a
          href={`/games/${run.gameId}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/games/${run.gameId}`);
          }}
        >
          {run.gameName}
        </a>
        {" · "}
        {run.categoryName}
      </p>
      <h1>
        {run.runnerName} — {formatTime(run.timeMs)}
      </h1>
      <dl className="kv">
        <dt>Status</dt>
        <dd>{run.status}</dd>
        <dt>Submitted</dt>
        <dd>{formatWhen(run.submittedAt)}</dd>
        <dt>Proof</dt>
        <dd>
          {run.proofUrl ? (
            <a href={run.proofUrl}>{run.proofUrl}</a>
          ) : (
            <span className="muted">none</span>
          )}
        </dd>
      </dl>

      {run.ban ? (
        <p className={run.activeBan ? "warn" : "muted"}>
          Ban · appeal {run.ban.appealState}
          {run.ban.comment ? ` — ${run.ban.comment}` : ""}
          {run.activeBan ? "" : " (inactive)"}
        </p>
      ) : null}

      <h2>Splits</h2>
      {run.splits.length === 0 ? (
        <p className="muted">No splits recorded.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Label</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {run.splits.map((s) => (
              <tr key={s.ordinal}>
                <td>{s.ordinal}</td>
                <td>{s.label}</td>
                <td>{formatTime(s.timeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Review history</h2>
      {run.reviewEvents.length === 0 ? (
        <p className="muted">No events yet.</p>
      ) : (
        <ul>
          {run.reviewEvents.map((ev) => (
            <li key={ev.id}>
              {formatWhen(ev.createdAt)} · {ev.moderatorName} · {ev.action}
              {ev.payload ? ` · ${JSON.stringify(ev.payload)}` : ""}
            </li>
          ))}
        </ul>
      )}

      {run.status === "pending" && !assigned ? (
        <p className="muted">This moderator is not assigned to {run.gameName}.</p>
      ) : null}

      {assigned ? (
        <>
          <h2>Standing</h2>
          {actionError ? <p className="error">{actionError}</p> : null}
          {!run.activeBan ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void (async () => {
                  setActionError(null);
                  try {
                    await api(`/games/${run.gameId}/bans`, {
                      method: "POST",
                      moderatorId,
                      body: JSON.stringify({ runnerId: run.runnerId, comment: banComment }),
                    });
                    setRun(await api<RunDetail>(`/runs/${runId}`));
                    setBanComment("");
                  } catch (err) {
                    setActionError(err instanceof ApiRequestError ? err.message : String(err));
                  }
                })();
              }}
            >
              <label>
                Ban comment
                <textarea value={banComment} onChange={(e) => setBanComment(e.target.value)} required />
              </label>
              <button type="submit">Ban runner</button>
            </form>
          ) : (
            <p>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    setActionError(null);
                    try {
                      await api(`/games/${run.gameId}/bans/${run.activeBan!.id}/lift`, {
                        method: "POST",
                        moderatorId,
                        body: "{}",
                      });
                      setRun(await api<RunDetail>(`/runs/${runId}`));
                    } catch (err) {
                      setActionError(err instanceof ApiRequestError ? err.message : String(err));
                    }
                  })();
                }}
              >
                Lift ban
              </button>
              {run.activeBan.appealState === "pending" ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        setActionError(null);
                        try {
                          await api(
                            `/games/${run.gameId}/bans/${run.activeBan!.id}/appeal-decision`,
                            {
                              method: "POST",
                              moderatorId,
                              body: JSON.stringify({ decision: "approved" }),
                            },
                          );
                          setRun(await api<RunDetail>(`/runs/${runId}`));
                        } catch (err) {
                          setActionError(err instanceof ApiRequestError ? err.message : String(err));
                        }
                      })();
                    }}
                  >
                    Approve appeal
                  </button>
                  {" "}
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        setActionError(null);
                        try {
                          await api(
                            `/games/${run.gameId}/bans/${run.activeBan!.id}/appeal-decision`,
                            {
                              method: "POST",
                              moderatorId,
                              body: JSON.stringify({ decision: "rejected" }),
                            },
                          );
                          setRun(await api<RunDetail>(`/runs/${runId}`));
                        } catch (err) {
                          setActionError(err instanceof ApiRequestError ? err.message : String(err));
                        }
                      })();
                    }}
                  >
                    Reject appeal
                  </button>
                </>
              ) : null}
            </p>
          )}
        </>
      ) : null}

      {canMutate ? (
        <>
          <h2>Moderate</h2>
          <p>
            <button className="primary" type="button" onClick={() => void approve()}>
              Approve
            </button>
          </p>
          <form className="stack" onSubmit={(e) => void reject(e)}>
            <label>
              Reject reason{" "}
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REJECT_REASONS)[number])}
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comment
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} required />
            </label>
            <button type="submit">Reject</button>
          </form>
        </>
      ) : null}
    </>
  );
}
