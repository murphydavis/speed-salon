# Speed Salon

Moderator console for a speedrunning website: leaderboards by **game + category**, run review, reversible bans, and an audit trail.

This repository is a take-home for a senior full-stack role (Node / Express / TypeScript / Postgres / React). It is an **initial best attempt** at the platform, not a years-polished production tool. The prompt’s ~2 hours is a scope hint. It is designed to run locally with Docker Compose once the runtime is added.

**You are here:** Postgres + API + crude web console. Optional bulk seed for CSV-cap scale. Compose does not yet start api/web.

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

Seed expects an empty schema (run reset first if data already exists). Optional **bulk** load (~200 000 runs, one board over 10 000 eligible for uncapped CSV). Does not run on first Compose init. After fixture:

```bash
docker compose --profile tools run --rm db-seed-bulk
```

Bulk Demo Any% (Alice): `00000000-0000-4000-b000-000000000001`. After bulk, every table has ≥20 rows. Reset drops it with the database. Changing bulk SQL requires reset + fixture + bulk.

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
- CSV export is capped at 10 000 rows unless `ignoreMaxRows` is set (best-effort; may fail). Job-based export and object storage are wishlist.

## Unfinished / not started

Tracked with checkboxes in [`docs/roadmap.md`](docs/roadmap.md). Headline leftovers:

- Phase 3 leftover: Compose `api`/`web` services
- Search on the board is runner-name only (no extra filter chips beyond pending/banned toggles)
- Appeal evidence storage (intentionally deferred; see data model stub)
- Wishlist (not this assignment): near-term notifications; medium-term mod discussion board; long-term run stats/visualizations; player profiles; moderator dashboard; assignment matrix + super-moderator; moderator profiles/history; async export jobs + S3-class storage; run VODs/supporting files; paired public/runner app — see [`docs/roadmap.md`](docs/roadmap.md) Later / unscheduled

## What we would do next

Next: Compose `api`/`web` so `docker compose up` is the full demo — see [`docs/roadmap.md`](docs/roadmap.md).

## Maintaining this project

`AGENTS.md`, `docs/`, and the roadmap are binding for humans and agents. If AI tools are unavailable, continue from those files. If code and docs conflict, stop and decide — do not reverse product rules quietly. Record sequence and architecture changes in `docs/roadmap.md` and `docs/decisions.md`.
