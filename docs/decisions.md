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

**Bulk (demo scale):** same shape, scaled to **a few hundred thousand runs**. Status mix roughly **~90% approved / ~7% pending / ~3% rejected** (order-of-magnitude, not a SLA). Runner activity is **skewed** (a few runners have many runs; most have few), not uniform. Games are few relative to runs, but **at least 20 distinct games**. Load with `COPY` or batched inserts. **At least one board (game + category) has more than 10 000 eligible approved runs** so the default CSV cap and `ignoreMaxRows` can be exercised.

After bulk is applied, **every table has at least 20 rows**: games, categories, runners, moderators, moderator_games, runs, run_splits, bans, review_events. **≥20 moderators**, **≥20 bans** spanning every appeal state, multi-moderator games and multi-game moderators, mixed category counts (including unset defaults), and sampled splits plus review events (approve, reject reasons, ban/appeal, set_default_category). **Every category has at least 50 non-rejected runs** (a 32 approved / 14 pending / 6 banned mix is enough), so a board with pending and banned shown is at least that long. Bulk uses its own UUID prefix `...-b...`. The main load stays on bulk boards; a pad step may add slow filler runs on short fixture categories so walking-slice ranking is unchanged. First empty Compose volume runs fixture then bulk (`SEED_MODE=fixture` skips bulk). An existing volume is never wiped by `docker compose up`. Tests assert fixture IDs and pass with extra bulk rows. Re-seed: `db-reset` then `db-seed-demo`, or `docker compose down -v` then `up`.

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

CRA is unmaintained. Vite is the usual React + TypeScript toolchain and is enough for a crude console. Pages are `/`, `/games/{id}`, `/runs/{id}` with `history.pushState` — a router package would only wrap that. Vite proxies `/games`, `/runs`, `/moderators`, and `/docs` to the API so the browser stays same-origin (no `cors` package). HTML navigations are not proxied (SPA fallback). `API_PROXY_TARGET` overrides the proxy (Compose uses `http://api:3000`).

`GET /moderators` and `GET /games/{gameId}/runs?status=` exist so the act-as control and pending queue do not hard-code fixture UUIDs. Domain rules are unchanged.

## 2026-10-15 — Request log is a local JSONL file

Each API request appends one JSON line: received timestamp, duration, method, URL (path + query), status. No request bodies (reject comments). Default file `logs/api.log` relative to the API process (`LOG_FILE` overrides). Tests omit the file. This is enough to see what was called locally; the file can sit in a container with the API process.

Durable shipping (CloudWatch, OpenSearch, a log vendor) waits on hosting choices and is **wishlist only**.

## 2026-10-15 — Board extras are query flags, not a schema change

`includePending` / `includeBanned` on the leaderboard reuse existing `runs` + `bans`. Ranked `place` stays eligible-only. Extra runs are mixed in by time.

## 2026-10-15 — Assigned mods can hide approved runs on a board

`includeApproved` defaults **true**. `includeApproved=false` omits eligible ranked runs from the page and CSV so a moderator can stare at pending/banned only. `playerPlace` / `isPb` are still computed from the full eligible approved ladder (same as search); hiding approved does not promote anyone. Filename suffix `-no-approved`. Column `include_approved`. Assigned header required, same as the other include flags. Rejected runs on the board are wishlist.

## 2026-10-15 — Include flags join pagination total

Supersedes extras-only-on-the-current-page. When either include flag is true, `total` is eligible + extras, and `page`/`limit` slice that merged list. Place numbers are still eligible rank. CSV records the flags in the filename (`-pending`, `-banned`) and in `include_pending` / `include_banned` columns. Assigned-moderator header required when either flag is true.

## 2026-10-15 — Board `submitted_at` stands in for completed-at

Runs have no separate completed timestamp. The board shows `submitted_at` in that role. A real completed-at would be a schema change later.

## 2026-10-15 — CSV is the full matching board, capped at 10 000 runs

Export uses the same category, mode, search, and include flags as the HTML table, not only the current page. Runs are merged by time (extras mixed in when requested), truncated at 10 000. Enough for the fixture and a fair demo; bulk-scale export would need a job.

## 2026-10-15 — Optional `ignoreMaxRows` attempts an uncapped CSV

`GET /games/{gameId}/leaderboard.csv?ignoreMaxRows=true` skips the 10 000-run cap and asks Postgres for the full matching set. The API still builds the CSV in memory and returns it in one response, so this is a **best-effort attempt**: it can time out or exhaust memory on a bulk board. Default (flag omitted or false) stays capped. A durable job (“prepare export” → file in object storage) is wishlist, not this take-home.

## 2026-10-15 — Medals follow the three fastest eligible runs

Supersedes treating gold/silver/bronze as player-ladder marks on PBs. The podium is the global run ranking for the category: the three lowest eligible times. `runPlace` is 1–3 for those runs and null otherwise. Player place stays available for PB context; it does not choose the emoji.

## 2026-10-15 — Medals follow player PBs (Olympic)

Supersedes “three fastest eligible runs” for the emoji. Gold / silver / bronze are 1st / 2nd / 3rd on the **player** board, shown on that runner’s PB in both ranking modes. One person cannot take gold, silver, and bronze with three throws. `playerPlace` is computed on the **unfiltered** eligible board so search does not promote 2nd to gold. `runPlace` may still name the three fastest *runs* in the API/CSV; the UI medals use `playerPlace` and `isPb`.

## 2026-10-15 — Games list counts are runs, not unique runners

`GET /games` returns `totalRuns` (every status), `approvedRuns` (approved + no active ban), `pendingRuns`, and `bannedRuns` (approved + active ban) over every category of the game. `GET /games/{gameId}` repeats those game-wide fields and puts the same four counts on each category for the board UI. Search `q` is `ILIKE` on `games.name`. Sortable columns are wishlist.

## 2026-10-15 — Compose runs api and web from one Node image

`docker compose up` starts Postgres, the Express API (`tsx`), and Vite. One `Dockerfile` at the repo root (`npm ci`); services differ by `command`. No `cors` package: the browser hits the web origin and Vite proxies to `api`. Host `npm run dev` still works against Compose `db`. Rebuild the image after source changes.

An **empty** Postgres volume runs `db/scripts/init.sh` (schema, fixture, bulk). `SEED_MODE=fixture` skips bulk on that first init only. A volume that already has data is **not** reset or re-seeded. Manual reload: `docker compose down -v` then `up`, or `db-reset` plus `db-seed-demo` / `db-seed`.

## 2026-10-15 — `npm test` prints Node coverage

The API suite is `node --test` via `tsx`. `--experimental-test-coverage` plus `--test-coverage-include=src/**/*.ts` prints line/branch/function coverage for `apps/api/src` with no extra package. No coverage floor is enforced locally; a CI gate is wishlist.

## 2026-10-15 — UI pager uses the existing `page` query

Games list and board fetch `page` (default 1) and `limit` already returned by the API. The UI adds first / previous / next / last and a numeric seek. Filter changes drop `page` so the view returns to 1. No extra endpoints.

## Open (resolve when implementing)
