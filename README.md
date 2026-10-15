# Speed Salon

Moderator console for a speedrunning website: leaderboards by **game + category**, run review, reversible bans, and an audit trail.

This repository is a take-home for a senior full-stack role (Node / Express / TypeScript / Postgres / React). It is an **initial best attempt** at the platform, not a years-polished production tool. The prompt’s ~2 hours is a scope hint. It is designed to run locally with Docker Compose once the runtime is added.

**You are here:** Postgres schema + fixture seed. API and web are not started. Start with `AGENTS.md`, `docs/requirements.md`, [`docs/roadmap.md`](docs/roadmap.md), and [`docs/fixture.md`](docs/fixture.md).

## How to run

Prerequisites: Docker. Defaults match `.env.example` (`speedsalon` / `speedsalon` / `speedsalon` on port 5432).

```bash
docker compose up -d db
```

Connect a SQL client to `localhost:5432` with those credentials. First start loads schema and fixture. API and web are not wired yet.

Reset to empty schema, then load fixture data:

```bash
docker compose --profile tools run --rm db-reset
docker compose --profile tools run --rm db-seed
```

Seed expects an empty schema (run reset first if data already exists).

## Repository layout

See [`docs/project-structure.md`](docs/project-structure.md). In short: `apps/api`, `apps/web`, `packages/shared`, and `docs/` as the product source of truth.

## Decisions (summary)

Full record: [`docs/decisions.md`](docs/decisions.md).

- A board is a **category**. `games.default_category_id` may be null (fallback: first category by name). Runs store `category_id` only.
- Runners may have many approved runs on one board. Default ranking is **by player (best run)**; a toggle ranks **by run**.
- Reject requires an **enumerated reason** and a **non-empty comment**.
- Bans are not deletes. Appeal state is stored (`not_appealed` | `pending` | `rejected` | `approved`). Approved appeals leave the ban row **inactive**. Documents/correspondence are **stubbed**, not built.
- Current moderator is `X-Moderator-Id`. Mutations are scoped to assigned games.
- Two seeds: small **fixture** for tests; **bulk** on the order of hundreds of thousands of runs.
- REST v1 is resource HTTP (verbs, statuses), not a hypermedia graph.

## Unfinished / not started

Tracked with checkboxes in [`docs/roadmap.md`](docs/roadmap.md). Headline leftovers:

- Phase 1 leftover: **bulk seed** (hundreds of thousands of runs)
- Phase 2: Resource list / growing OpenAPI, constitution tests, Express implementation
- Phase 3: Walking-slice UI then remaining screens / Compose demo
- Appeal evidence storage (intentionally deferred; see data model stub)

## What we would do next

Next: **phase 2 walking slice** — resource list, constitution tests, Express — see [`docs/roadmap.md`](docs/roadmap.md).

## Maintaining this project

`AGENTS.md`, `docs/`, and the roadmap are binding for humans and agents. If AI tools are unavailable, continue from those files. If code and docs conflict, stop and decide — do not reverse product rules quietly. Record sequence and architecture changes in `docs/roadmap.md` and `docs/decisions.md`.
