# Decisions — Speed Salon

Add a new dated entry when a choice is locked. Do not silently reverse an entry; supersede it with a newer one.

## 2026-10-12 — Documentation before application code

The first commits are requirements, architecture, data model, and `AGENTS.md`. Schema and Compose follow. Reason: domain rules (ranking modes, reject payload, appeal states) are easier to get wrong in code than in prose, and Murphy wants a human-maintainable trail if agents stop. Scope stays an initial attempt, not unbounded polish.

## 2026-10-12 — Monorepo with apps/api, apps/web, packages/shared

One repo is enough for a Compose-based take-home. Shared types prevent status/reason string drift. A heavier turborepo/Nx layout is rejected unless compile time demands it.

## 2026-10-12 — Boards are game + category; game URL uses configurable default category

A board is a category of a game. `games.default_category_id` is optional so a game can be inserted before any category. When null, the board is the first category by `name`, then `id`. Assigned mods may set the default; the game page shows when it is unset.

## 2026-10-14 — Runs store category_id only

Game is `categories.game_id`. Moderator ACL stays on `moderator_games.game_id`.

## 2026-10-12 — Dual ranking: players (default) vs runs (toggle)

Many approved runs per runner per board are allowed. Default UX ranks **runners by personal best** so a board reads as a player ladder. The runs toggle exists so verification work can see dominance / repeat submissions.

## 2026-10-12 — Reject requires enum reason + non-empty comment

Forces a consistent moderation record and a human-readable explanation. Enum list lives in `docs/requirements.md`.

## 2026-10-12 — Bans are rows with appeal_state; approved appeal inactivates without delete

Appeal is visible on the ban. Documents/correspondence are explicitly **not** built; names are reserved in `docs/data-model.md`.

## 2026-10-12 — Moderator identity via X-Moderator-Id; mutations fail closed

Assignment constraint from the prompt. No login system.

## 2026-10-12 — Global bans in v1

A banned runner leaves **all** leaderboards. Per-game bans would be a later requirement.

## 2026-10-14 — Roadmap is a binding doc with checkboxes

Sequence of work lives in `docs/roadmap.md`, not only in README “next” bullets. Conflicts between docs and code are surfaced for an explicit decision.

## 2026-10-14 — Walking slice; not a waterfall; not a multi-year product

Supersedes a strict “full spec, then full tests, then implement, then UI” reading of the roadmap. Phases remain the priority stack. A thin vertical slice (fixture seed → constitution tests → crude UI) is allowed so a reviewer can use a board before every checkbox is done.

Ambition is an **initial best attempt**. The prompt’s ~2 hours is a **scope hint**, not an elapsed-time cap. Extra time goes to finishing the slice and naming leftovers, not to out-of-scope product.

Canonical artifacts: requirements = domain; OpenAPI/resource list = HTTP shapes; tests = executable examples.

## 2026-10-14 — REST v1 is HTTP-uniform, not Fielding hypermedia

v1 uses resource identifiers, standard verbs, JSON representations, and meaningful status codes. HATEOAS is deferred except optional list pagination `next`. Approve/reject are actions on the run resource (e.g. `POST /runs/{id}/rejection`), not `POST /approveRun`.

## 2026-10-14 — Two seeds and fixture skew

**Fixture (tests + walking slice):** a handful of games (about 3–5), 2–3 categories each, default `Any%` where it exists; tens of runners; on the order of 10² runs; mostly approved, a visible pending queue, some rejected; **one dominant runner** with several approved times on one board; **one ban in each appeal state**; at least two moderators with **non-overlapping** game assignments; review events and splits on sampled runs. Deterministic (fixed RNG seed or fully scripted IDs).

**Bulk (demo scale):** same shape, scaled to **a few hundred thousand runs**. Status mix roughly **~90% approved / ~7% pending / ~3% rejected** (order-of-magnitude, not a SLA). Runner activity is **skewed** (a few runners have many runs; most have few), not uniform. Games are few relative to runs. Load with `COPY` or batched inserts.

## 2026-10-14 — Schema in `db/`; Compose init on empty volume

SQL lives in `db/migrations` and `db/seed`, not inside `apps/api` yet (no Node app). Compose mounts those files into `docker-entrypoint-initdb.d`. They run **only on first volume create**. Schema changes later either bump a new init file (dev: `docker compose down -v`) or a real migrate command — choose when the API exists.

No extra migrate image or ORM. Ranking SQL sketch: `db/queries/ranking.sql`.

## 2026-10-14 — Tie-break is time_ms, then submitted_at, then run id

After equal times, earlier submission ranks higher; remaining ties use `runs.id`. Same order in player-mode `DISTINCT ON` and run mode.

## 2026-10-14 — Runner search uses `pg_trgm`

GIN index on `runners.name` with `gin_trgm_ops` so `ILIKE` / similarity stay usable at bulk scale. No `citext`.

## 2026-10-14 — Appeal submit is seed-and-event for now

Fixture writes `appeal_submit` review events and `bans.appeal_state`. No runner-facing appeal UI. Moderator appeal decide can wait until that mutation is scheduled.

## 2026-10-15 — API uses `pg`, Express, tsx, npm workspaces, node:test

Assignment stack is Express + TypeScript. `tsx` runs TypeScript in dev and tests without a compile step. npm workspaces link `packages/shared`. Tests use Node’s built-in runner.

## 2026-10-15 — Explicit SQL via `pg`; an ORM is wishlist, not this assignment

`pg` is the query driver. No Prisma (or other ORM) in v1.

Leaderboard eligibility, player vs run ranking, tie-break, and pagination are already SQL (`DISTINCT ON`, indexes, `db/queries/ranking.sql`). An ORM’s default find/include path would hide that or force `$queryRaw` anyway. Schema and fixture already live in `db/` SQL; Prisma would add a second source of truth. Bulk seed is `COPY` / batched insert, not hundreds of thousands of `save()` calls. `pg` is enough to parameterize queries and run transactions, so a new dependency is not justified.

A later move to Prisma (or similar) for CRUD typing and migrations is **wishlist only** — not a roadmap phase and not in scope for this take-home. See [`roadmap.md`](roadmap.md) Later / unscheduled.

## 2026-10-15 — Swagger UI at `GET /docs` from the existing OpenAPI file

The spec file is already canonical for HTTP shapes. Serving it plus a Swagger UI page is a small Express addition: `GET /openapi.yaml` reads `docs/openapi.yaml`; `GET /docs` is a static HTML shell that loads Swagger UI from a CDN (`swagger-ui-dist`). No npm package. `servers` uses `/` so Try it out hits the same origin. The spec is still a walking-slice sketch (paths and errors, not a full schema novel); the explorer is for reviewers, not a second product UI.

If the CDN is blocked, the YAML in `docs/` still works in any OpenAPI viewer.

## 2026-10-15 — Web is Vite + React; no React Router; Vite proxies the API

CRA is unmaintained. Vite is the usual React + TypeScript toolchain and is enough for a crude console. Pages are `/`, `/games/{id}`, `/runs/{id}` with `history.pushState` — a router package would only wrap that. In development Vite proxies `/games`, `/runs`, and `/moderators` to the API so the browser stays same-origin (no `cors` package). HTML navigations are not proxied (SPA fallback). Compose `web` is still later.

`GET /moderators` and `GET /games/{gameId}/runs?status=` exist so the act-as control and pending queue do not hard-code fixture UUIDs. Domain rules are unchanged.

## 2026-10-15 — Request log is a local JSONL file

Each API request appends one JSON line: received timestamp, duration, method, URL (path + query), status. No request bodies (reject comments). Default file `logs/api.log` relative to the API process (`LOG_FILE` overrides). Tests omit the file. This is enough to see what was called locally; the file can sit in a container with the API process.

Durable shipping (CloudWatch, OpenSearch, a log vendor) waits on hosting choices and is **wishlist only**.

## 2026-10-15 — Board extras are query flags, not a schema change

`includePending` / `includeBanned` on the leaderboard reuse existing `runs` + `bans`. Ranked `total` / `place` / pagination stay eligible-only. Extra rows are capped at `limit` and mixed into the current page by time. Assigned-moderator header required when either flag is true.

## 2026-10-15 — Board `submitted_at` stands in for completed-at

Runs have no separate completed timestamp. The board shows `submitted_at` in that role. A real completed-at would be a schema change later.

## 2026-10-15 — CSV is the full matching board, capped at 10 000 rows

Export uses the same category, mode, search, and include flags as the HTML table, not only the current page. Ranked rows are included first (eligible order), then extras if requested, truncated at 10 000. Enough for the fixture and a fair demo; bulk-scale export would need a job.

## 2026-10-15 — Optional `ignoreMaxRows` attempts an uncapped CSV

`GET /games/{gameId}/leaderboard.csv?ignoreMaxRows=true` skips the 10 000-row cap and asks Postgres for the full matching set. The API still builds the CSV in memory and returns it in one response, so this is a **best-effort attempt**: it can time out or exhaust memory on a bulk board. Default (flag omitted or false) stays capped. A durable job (“prepare export” → file in object storage) is wishlist, not this take-home.

## Open (resolve when implementing)
