# Speed Salon

Moderator console for a speedrunning website: leaderboards by **game + category**, run review, reversible bans, and an audit trail.

This repository is a take-home for a senior full-stack role (Node / Express / TypeScript / Postgres / React). It is designed to run locally with Docker Compose once the runtime is added.

**You are here:** documentation and repository outline only. There is no application yet. Start with `AGENTS.md` and `docs/requirements.md`.

## How to run

Not available until Compose and apps exist. The intended command is:

```bash
docker compose up
```

Prerequisites will be: Docker, and no extra hosted services.

## Repository layout

See [`docs/project-structure.md`](docs/project-structure.md). In short: `apps/api`, `apps/web`, `packages/shared`, and `docs/` as the product source of truth.

## Decisions (summary)

Full record: [`docs/decisions.md`](docs/decisions.md).

- Boards are **game + category**. A game view uses a **moderator-configurable default category** (typically Any%).
- Runners may have many approved runs on one board. Default ranking is **by player (best run)**; a toggle ranks **by run**.
- Reject requires an **enumerated reason** and a **non-empty comment**.
- Bans are not deletes. Appeal state is stored (`not_appealed` | `pending` | `rejected` | `approved`). Approved appeals leave the ban row **inactive**. Documents/correspondence are **stubbed**, not built.
- Current moderator is `X-Moderator-Id`. Mutations are scoped to assigned games.
- Seed target: on the order of **hundreds of thousands** of runs.

## Unfinished / not started

- Docker Compose, API, web app, database schema, seed
- Leaderboard UI, ranking toggle, filters, CSV
- Run detail, approve/reject, ban/appeal UI
- Appeal evidence storage (intentionally deferred; see data model stub)

## What we would do next

1. Postgres schema + constraints + indexes matching `docs/data-model.md`
2. Bulk seed that demonstrates player vs run ranking and all appeal states
3. Read APIs (game default board, category list, run detail)
4. Mutation APIs with header ACL and append-only events
5. Thin React UI over those APIs
6. Compose so `docker compose up` is the whole demo

## Maintaining this project

`AGENTS.md` is binding for humans and agents. If AI tools are unavailable, continue from `docs/` and this README; do not reverse product rules to save time without updating `docs/decisions.md`.
