# Speed Salon

Moderator console for a speedrunning website: leaderboards by **game + category**, run review, reversible bans, and an audit trail.

This repository is a take-home for a senior full-stack role (Node / Express / TypeScript / Postgres / React). It is an **initial best attempt** at the platform, not a years-polished production tool. The prompt’s ~2 hours is a scope hint. It is designed to run locally with Docker Compose once the runtime is added.

**You are here:** Postgres + API + crude web console via `docker compose up`. First empty volume loads fixture and bulk seed (several minutes). Later `up` does not wipe the database.

## How to run

Prerequisites: Docker. Defaults match `.env.example` (`speedsalon` / `speedsalon` / `speedsalon` on port 5432).

```bash
docker compose up
```

Web: [`http://localhost:5173`](http://localhost:5173). API: [`http://localhost:3000`](http://localhost:3000) — explorer [`/docs`](http://localhost:3000/docs). Act-as uses seeded mods; IDs: [`docs/fixture.md`](docs/fixture.md). `npm test` uses the same database (no seed-mode flag); it is slower on bulk and prints API coverage.

Recorded walking-slice click-through (under 25 MB): [`docs/assets/smoke.webm`](docs/assets/smoke.webm), with a WebVTT step track at [`docs/assets/smoke.vtt`](docs/assets/smoke.vtt). The picture includes an overlay cursor, on-screen step captions, and the data grid after each action. Same path as an automated smoke (needs the app up, then Chromium once via `npx playwright install chromium` in `apps/web`):

```bash
npm run smoke
```

Re-record the file: `npm run smoke:video`. The script is read-only (no approve / reject / ban).

Host Node (optional, against Compose `db`):

```bash
docker compose up -d db
npm install
npm test
npm run dev
```

API request log: `apps/api/logs/api.log` on the host, `/tmp/api.log` in the API container.

**Existing data:** `docker compose up` never resets Postgres. To wipe the volume and seed again (bulk default):

```bash
docker compose down -v
docker compose up
```

Or replace contents without removing the volume: `db-reset`, then `db-seed-demo` (fixture+bulk) or `db-seed` (fixture only). First start with fixture only (empty volume): `SEED_MODE=fixture docker compose up`. Then `db-seed-bulk` if you want demo scale later.

Bulk Demo Any% (Alice): `00000000-0000-4000-b000-000000000001`. After bulk, every table has ≥20 rows and every category has ≥50 non-rejected runs.

## Repository layout

See [`docs/project-structure.md`](docs/project-structure.md). In short: `apps/api`, `apps/web`, `packages/shared`, and `docs/` as the product source of truth.

## Decisions (summary)

Full record: [`docs/decisions.md`](docs/decisions.md).

- A board is a **category**. `games.default_category_id` may be null (fallback: first category by name). Runs store `category_id` only.
- Runners may have many approved runs on one board. Default ranking is **by player (best run)**; a toggle ranks **by run**.
- Reject requires an **enumerated reason** and a **non-empty comment**.
- Bans are not deletes. Appeal state is stored (`not_appealed` | `pending` | `rejected` | `approved`). Approved appeals leave the ban record **inactive**. Documents/correspondence are **stubbed**, not built.
- Current moderator is `X-Moderator-Id`. Mutations are scoped to assigned games.
- Two seeds: small **fixture** (IDs for tests) and **bulk** (default on first empty Compose volume).
- REST v1 is resource HTTP (verbs, statuses), not a hypermedia graph.
- Persistence is **`pg` + SQL** (ranking and seed stay explicit). Prisma is wishlist, not this take-home.
- Playwright is a **web-only** smoke driver (not a Compose runtime dep). Demo capture: [`docs/assets/smoke.webm`](docs/assets/smoke.webm).
- API request log is local JSONL (`logs/api.log`). Durable shipping is wishlist.
- CSV export is capped at 10 000 runs unless `ignoreMaxRows` is set (best-effort; may fail). Job-based export and object storage are wishlist.

## Unfinished / not started

Tracked with checkboxes in [`docs/roadmap.md`](docs/roadmap.md). Headline leftovers:

- Search on the board is runner-name only (no extra filter chips beyond approved/pending/banned toggles)
- Compose bakes source into the image; rebuild after code changes (`docker compose up --build`)
- Playwright Chromium is a host-only smoke browser; Compose does not install it
- Rejected runs are not mixed onto the board (wishlist: training/review of past rejects)
- Appeal evidence storage (intentionally deferred; see data model stub)
- Wishlist (not this assignment): sortable columns; CI/CD with protected `main` (review + tests + coverage); notifications; mid-term discussion board, rejected-run review, secret store; long-term stats, split-host deploy, profiles/dashboard/assignment matrix, export jobs, VOD storage, paired runner app — see [`docs/roadmap.md`](docs/roadmap.md) Later / unscheduled

## What we would do next

Scheduled phases are done. Remaining work is wishlist in [`docs/roadmap.md`](docs/roadmap.md) Later / unscheduled (sortable columns are the nearest easy item).

## Maintaining this project

`AGENTS.md`, `docs/`, and the roadmap are binding for humans and agents. If AI tools are unavailable, continue from those files. If code and docs conflict, stop and decide — do not reverse product rules quietly. Record sequence and architecture changes in `docs/roadmap.md` and `docs/decisions.md`.
