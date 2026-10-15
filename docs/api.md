# HTTP resources (walking slice)

Canonical shapes: [`openapi.yaml`](openapi.yaml). Live explorer: `GET /docs` (serves that file). Domain rules stay in [`requirements.md`](requirements.md).

Error body: `{ "status": number, "code": string, "message": string }`. Mutations require `X-Moderator-Id`. Eligible board GETs do not. `includePending` / `includeBanned` / `includeApproved=false` and non-approved `GET /games/{gameId}/runs` require an assigned moderator. Unknown paths are `404` `not_found`. Malformed JSON is `400` `invalid_json`. A path that is not a UUID is `400` `invalid_id`. Uncaught faults are `500` `internal` (no stack in the body). The process keeps serving after any of these.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/docs` | Swagger UI over this spec. |
| GET | `/openapi.yaml` | Raw OpenAPI document. |
| GET | `/moderators` | Paginated. Includes `assignedGameIds` for the act-as control. |
| GET | `/games` | Paginated. Query: `page`, `limit`, `q` (optional game-name search). Rows include `totalRuns`, `approvedRuns`, `pendingRuns`, `bannedRuns` summed across every category of the game. |
| GET | `/games/{gameId}` | Categories (each with `totalRuns` / `approvedRuns` / `pendingRuns` / `bannedRuns` for that board); resolved default; game-wide counts as on the list. |
| GET | `/games/{gameId}/runs` | Query: `status` (required: `pending` \| `approved` \| `rejected`), `page`, `limit`. Non-approved lists need assignment. |
| GET | `/games/{gameId}/leaderboard` | Query: `categoryId`, `mode`, `q`, `page`, `limit`, `includePending`, `includeBanned`, `includeApproved` (default true). Rows include `submittedAt`, `isPb`, `playerPlace` (unfiltered player-ladder rank; medals 1–3 on the PB), `runPlace`. Extras have `place: null`. When include flags change the visible set, `total` is that set and pagination slices it. Empty `q` is the full board. |
| GET | `/games/{gameId}/leaderboard.csv` | Same query as the board. Omit `q` (or leave it empty) for the entire board. Default cap 10 000. `ignoreMaxRows=true` attempts no cap (may fail). Filename `{slug}-leaderboard-{UTC}[-pending][-banned][-no-approved].csv`. Columns include `include_pending`, `include_banned`, `include_approved`. |
| POST | `/games/{gameId}/default-category` | Body `{ "categoryId" }`. Assigned only. |
| POST | `/games/{gameId}/bans` | Body `{ "runnerId", "comment" }`. Site-wide ban. |
| POST | `/games/{gameId}/bans/{banId}/lift` | Inactivate without delete (`unban` event). |
| POST | `/games/{gameId}/bans/{banId}/appeal-decision` | Body `{ "decision": "approved" \| "rejected" }`. |
| GET | `/runs/{runId}` | Splits, review events, latest ban if any. |
| POST | `/runs/{runId}/approval` | Pending → approved. Empty JSON object. |
| POST | `/runs/{runId}/rejection` | Body `{ "reason", "comment" }`. |

`page` defaults to 1, `limit` to 50 (max 100). Lists always cap `limit`.
