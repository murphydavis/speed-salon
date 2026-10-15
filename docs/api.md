# HTTP resources (walking slice)

Canonical shapes: [`openapi.yaml`](openapi.yaml). Live explorer: `GET /docs` (serves that file). Domain rules stay in [`requirements.md`](requirements.md).

Error body: `{ "status": number, "code": string, "message": string }`. Mutations require `X-Moderator-Id`. GET does not.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/docs` | Swagger UI over this spec. |
| GET | `/openapi.yaml` | Raw OpenAPI document. |
| GET | `/games` | Paginated. Query: `page`, `limit`. |
| GET | `/games/{gameId}` | Categories; resolved default board. |
| GET | `/games/{gameId}/leaderboard` | Query: `categoryId` (default board if omitted), `mode` (`players` default \| `runs`), `q`, `page`, `limit`. |
| GET | `/runs/{runId}` | Splits, review events, active ban if any. |
| POST | `/runs/{runId}/approval` | Pending → approved. Empty JSON object. |
| POST | `/runs/{runId}/rejection` | Body `{ "reason", "comment" }`. |

`page` defaults to 1, `limit` to 50 (max 100). Lists always cap `limit`.
