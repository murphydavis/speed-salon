# HTTP resources (walking slice)

Canonical shapes: [`openapi.yaml`](openapi.yaml). Live explorer: `GET /docs` (serves that file). Domain rules stay in [`requirements.md`](requirements.md).

Error body: `{ "status": number, "code": string, "message": string }`. Mutations require `X-Moderator-Id`. Eligible board GETs do not. `includePending` / `includeBanned` and non-approved `GET /games/{gameId}/runs` require an assigned moderator.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/docs` | Swagger UI over this spec. |
| GET | `/openapi.yaml` | Raw OpenAPI document. |
| GET | `/moderators` | Paginated. Includes `assignedGameIds` for the act-as control. |
| GET | `/games` | Paginated. Query: `page`, `limit`. |
| GET | `/games/{gameId}` | Categories; resolved default board. |
| GET | `/games/{gameId}/runs` | Query: `status` (required: `pending` \| `approved` \| `rejected`), `page`, `limit`. Non-approved lists need assignment. |
| GET | `/games/{gameId}/leaderboard` | Query: `categoryId`, `mode`, `q`, `page`, `limit`, `includePending`, `includeBanned`. Rows include `submittedAt` and `isPb`. Extras have `place: null`. |
| GET | `/games/{gameId}/leaderboard.csv` | Same query as the board. Default cap 10 000. `ignoreMaxRows=true` attempts no cap (may fail). |
| POST | `/games/{gameId}/default-category` | Body `{ "categoryId" }`. Assigned only. |
| POST | `/games/{gameId}/bans` | Body `{ "runnerId", "comment" }`. Site-wide ban. |
| POST | `/games/{gameId}/bans/{banId}/lift` | Inactivate without delete (`unban` event). |
| POST | `/games/{gameId}/bans/{banId}/appeal-decision` | Body `{ "decision": "approved" \| "rejected" }`. |
| GET | `/runs/{runId}` | Splits, review events, latest ban if any. |
| POST | `/runs/{runId}/approval` | Pending → approved. Empty JSON object. |
| POST | `/runs/{runId}/rejection` | Body `{ "reason", "comment" }`. |

`page` defaults to 1, `limit` to 50 (max 100). Lists always cap `limit`.
