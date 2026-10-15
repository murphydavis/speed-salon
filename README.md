# Speed Salon

Moderator console for a speedrunning website: leaderboards by **game + category**, run review, reversible bans, and an audit trail.

This repository is a take-home for a senior full-stack role (Node / Express / TypeScript / Postgres / React). It is an **initial best attempt** at the platform, not a years-polished production tool. The prompt’s ~2 hours is a scope hint. It is designed to run locally with Docker Compose once the runtime is added.

**You are here:** Postgres + walking-slice API + crude web console (board, ranking toggle, run review, act-as).

## How to run

Prerequisites: Docker. Defaults match `.env.example` (`speedsalon` / `speedsalon` / `speedsalon` on port 5432).

```bash
docker compose up -d db
```

Connect a SQL client to `localhost:5432` with those credentials. First start loads schema and fixture. Compose does not yet start api/web.

```bash
npm install
npm test
npm run dev
```

Web: [`http://localhost:5173`](http://localhost:5173). API: [`http://localhost:3000`](http://localhost:3000) — explorer [`/docs`](http://localhost:3000/docs). Act-as uses seeded mods; IDs: [`docs/fixture.md`](docs/fixture.md). Request log: `apps/api/logs/api.log` (gitignored).

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
- Persistence is **`pg` + SQL** (ranking and seed stay explicit). Prisma is wishlist, not this take-home.
- API request log is local JSONL (`logs/api.log`). Durable shipping is wishlist.

## Unfinished / not started

Tracked with checkboxes in [`docs/roadmap.md`](docs/roadmap.md). Headline leftovers:

- Phase 1 leftover: **bulk seed** (hundreds of thousands of runs)
- Phase 2 leftover: ban/appeal mutations, CSV, set default category, remaining constitution tests
- Phase 3 leftover: search/filter, CSV, ban/appeal UI, Compose `web`/`api` services
- Appeal evidence storage (intentionally deferred; see data model stub)
- Wishlist (not this assignment): player profiles; moderator dashboard of assigned games + pending queue — see [`docs/roadmap.md`](docs/roadmap.md) Later / unscheduled

## What we would do next

Next: remaining API (ban/CSV/default) and leftover UI, or Compose api/web — see [`docs/roadmap.md`](docs/roadmap.md).

## Maintaining this project

`AGENTS.md`, `docs/`, and the roadmap are binding for humans and agents. If AI tools are unavailable, continue from those files. If code and docs conflict, stop and decide — do not reverse product rules quietly. Record sequence and architecture changes in `docs/roadmap.md` and `docs/decisions.md`.
