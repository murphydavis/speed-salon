# Architecture — Speed Salon

## Goal

One repository, three runtime pieces under Docker Compose: **Postgres**, **API** (Express + TypeScript), **Web** (React + TypeScript). Shared TypeScript types keep the two apps on the same vocabulary.

```text
Browser  →  Web (React)  →  API (Express)  →  Postgres
                 │                │
                 └──── packages/shared ────┘
Header: X-Moderator-Id on API requests (set by web “act as” control)
```

## Boundaries

| Piece | Owns | Must not own |
|-------|------|----------------|
| `apps/web` | Screens, ranking toggle, filters, CSV download trigger, act-as header | SQL, status transitions, ACL |
| `apps/api` | HTTP, validation, ACL, ranking queries, CSV bytes, transactions | React components, “trust the client’s new status” |
| `packages/shared` | Status unions, reject reasons, ranking mode, header name, DTO types | Runtime secrets, database access |
| Postgres | Canonical state, constraints, indexes | Business rules that only exist in UI copy |

## Request flow

1. Web sends JSON to the API and includes `X-Moderator-Id`.
2. API resolves the moderator. Mutations fail closed if identity is missing or the moderator is not assigned to the target **game** (`categories.game_id` via the run’s `category_id`, or the game being configured).
3. Commands run in a **transaction**: update run/runner/ban **and** insert a `review_events` row.
4. Queries for boards apply eligibility (`approved` + inactive ban) and either **player** aggregation (`DISTINCT ON` / grouped min time) or **run** listing, then paginate.

## Auth model

There is no session. The header *is* the identity. Seeded moderator UUIDs are in [`docs/fixture.md`](fixture.md). This is an assignment allowance, not a production pattern.

## CSV

CSV is generated **on the API** from the same query parameters as the HTML table (game, category, ranking mode, search, filters). The browser should not re-implement ranking in JS for export. Default response is capped at 10 000 runs. `ignoreMaxRows=true` attempts the full set in one response. The download name is `{slug}-leaderboard-{UTC datetime}[-pending][-banned].csv` so the file records when that snapshot was current and which include flags were on. Columns `include_pending` / `include_banned` repeat those flags. Async jobs and object-store files are wishlist.

## Seed

Two loads, both using bulk SQL (`COPY` or batched inserts), never hundreds of thousands of ORM `save()` calls:

- **Fixture** — `db/seed/001_fixture.sql`, applied on first Compose init. IDs: [`docs/fixture.md`](fixture.md)
- **Bulk** — `db/seed/002_bulk.sql` via `docker compose --profile tools run --rm db-seed-bulk`. Own games plus a pad so every category has ≥50 non-rejected runs. ≥20 rows in every table; one board exceeds 10 000 eligible runs for `ignoreMaxRows`. See `docs/decisions.md`.

Compose service `db` is Postgres 16. Init files run only on an empty volume.

## HTTP (v1)

Resource URLs, standard verbs, typed errors, pagination. Optional `next` link on lists. No HATEOAS graph in v1. `GET /docs` is a spec explorer for reviewers (Swagger UI + `docs/openapi.yaml`), not a product screen. Local web (Vite) proxies API paths in development. The API appends one JSON line per request to `LOG_FILE` (default `logs/api.log`).

## What is intentionally not here

No extra services, message queues, GraphQL gateway, or separate “appeal service.” Appeal documentation storage is a **future module** noted in the data model.
