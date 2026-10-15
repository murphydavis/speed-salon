# Roadmap — Speed Salon

Planned construction order. This file is **binding** for humans and agents, together with `AGENTS.md` and the rest of `docs/`.

Mark progress with Markdown checkboxes (`- [ ]` open, `- [x]` done). When a phase or subphase is finished, check it in the **same change** that completes the work, and note the date if useful. Phases may be added or split; do not skip ahead or reorder silently — update this file first (and `docs/decisions.md` if the order itself is a new choice).

**Ambition:** an **initial best attempt** at the platform — cloneable, honest, domain-correct — not a production tool polished over years. The assignment’s “about 2 hours” is a **scope hint**, not a stopwatch. Elapsed time may be longer; do not use extra clock to add out-of-scope product (auth, video, anti-cheat). Use it to finish a **walking slice** and leave leftovers named.

**Walking slice (overrides strict waterfall):** phases stay the priority stack (data → API → UI), but a thin path may cut through later phases once the previous layer can support it. Do not wait for a complete OpenAPI novel, a complete red test encyclopedia, or a complete schema of unused tables before something is demonstrable.

Suggested first slice (the requirements acceptance list, not every filter/CSV flourish):

1. Schema + **fixture** seed that covers ranking modes, pending/approve/reject, and each ban appeal state
2. Spec notes for those resources → a **few** failing tests → implementation until they pass
3. Crude UI: default board, ranking toggle, run detail, approve/reject, act-as header
4. Then widen: bulk seed, CSV, search, default-category mutation, appeal actions, Compose polish

**Conflict rule:** if implementation, tests, OpenAPI, or any other doc disagrees, **stop and surface the conflict**. Canonical roles (do not treat all three as the same bible):

| Artifact | Canonical for |
|----------|----------------|
| `docs/requirements.md` | Domain rules |
| OpenAPI (or the short resource list until it exists) | HTTP paths, verbs, status codes, payload shapes |
| Tests | Executable examples of those rules |

Resolution is an explicit decision: change the code, change the docs, or both.

---

## 0. Project outline and requirements

- [x] Repository layout, `AGENTS.md`, requirements, architecture, and data-model prose (2026-10-12)
- [x] Roadmap + process streamlining (walking slice, two seeds, HTTP-uniform REST v1) (2026-10-14)

---

## 1. Postgres data model

Design and implement the database to match [`data-model.md`](data-model.md).

- [x] Schema: tables, constraints, enums/checks, foreign keys needed for the walking slice (full model in `data-model.md`; do not invent extra tables) (2026-10-14)
- [x] Indexes required for leaderboard and seed scale (2026-10-14)
- [x] Migrations (or equivalent versioned SQL) wired so a fresh Compose Postgres comes up empty then migrates (2026-10-14)
- [x] **Fixture seed** — small, deterministic, fast; enough to prove player vs run ranking, reject/approve, ACL-relevant assignments, and every appeal state (2026-10-14)
- [x] **Bulk seed** — ~200 000 runs on separate games; one board >10 000 eligible approved runs for uncapped CSV (2026-10-15)

Compose Postgres belongs here so the schema has a place to live. Full `docker compose up` of api + web can wait until those apps exist, except as needed for the walking slice.

---

## 2. REST API (TypeScript / Node / Express)

**v1 REST** means an idiomatic *HTTP* API: resource URLs, correct verbs, meaningful status codes, typed error bodies, pagination, no RPC-in-disguise (`POST /approveRun`). Self-descriptive JSON is enough. Hypermedia (HATEOAS) is **out of v1** except optional pagination links (e.g. `next`) if they are cheap. That choice is recorded in `docs/decisions.md`.

### 2.1 Spec as we go

- [x] Short resource list + error model (paths, verbs, statuses) **before** the first handlers for that resource (2026-10-15)
- [x] OpenAPI file in repo, grown in the **same change** as the handlers it describes — not a finished novel before any code (2026-10-15 walking slice)
- [x] Spec explorer: `GET /docs` (Swagger UI) + `GET /openapi.yaml` — no extra npm package (2026-10-15)

### 2.2 Tests as a list, then one at a time

- [x] Written **test list** of constitution cases: status machine, reject reason + comment, ACL 401/403, ranking eligibility, pagination required, ban inactivate/restore (2026-10-15; ban still open)
- [x] Executable tests added **incrementally** (one failing test → pass → next). Do not freeze a complete red suite before any server exists. (2026-10-15 walking slice)
- [x] Do **not** aim for exhaustive CRUD of every table; skip noise that does not encode a product rule

### 2.3 Implementation with the tests

- [x] Implement so current tests pass; widen with the walking slice (2026-10-15)
  - [x] Modular factoring: data-model types / thin persistence module reflecting Postgres — not inlined across route handlers, and **not** a generic ORM that hides ranking SQL (2026-10-15)
  - [x] Moderator identity and game assignment enforced on mutations (2026-10-15)
  - [x] Ranking queries use explicit SQL (or a thin query layer) and pagination (2026-10-15)
  - [x] Ban/appeal mutations, CSV, set default category (2026-10-15)

---

## 3. Web UI (TypeScript / React)

A crude UI for the walking slice is allowed as soon as the matching API tests are green. Polish and remaining screens come after.

- [x] Walking-slice UI: game default board, ranking toggle, run detail, approve/reject, act-as header (2026-10-15)
- [x] Category switch on the game page (2026-10-15; API already had `categoryId`)
- [x] Remaining requirements: search, CSV, set default, ban/appeal visibility and actions (2026-10-15)
- [x] List pagination in the UI: first / previous / next / last and a page field (2026-10-15)
- [ ] Compose includes `web` so `docker compose up` is the full local demo

---

## Later / unscheduled

Not a phase until promoted here with a checkbox. **Wishlist** items are not assignment work unless they are moved up.

- **Near:** Moderator notifications (in-app). Queue for review events that matter to assigned games (new pending runs, bans, appeals). Later feeds can include anomaly alerts from stats below.
- **Medium:** Moderator discussion board — general-purpose talk among mods, not appeal correspondence (that stays the appeal stub).
- **Long / low:** Visualizations and stats on runs (time distributions, progression over submitted_at). Could illustrate getting faster over time, or flag incongruous jumps in a runner’s times as suspicious — those flags would notify moderators, not auto-reject. Not anti-cheat product in this take-home.
- Player profile pages: list any runs by that runner (all games/categories, not only the current board).
- Moderator home dashboard: links to assigned games and a pending queue across those games. The games list already marks assignments; this would be a dedicated landing page.
- Assignment matrix: who is assigned to which games, filterable by moderator or by game.
- Super-moderator / admin: set and unset moderator↔game assignments. Every change appends an immutable review event (same rule as all moderator actions). New `review_action` values (e.g. `assign_game` / `unassign_game`) when this is scheduled — not in the take-home enum.
- Moderator profile: that person’s game assignments and action history (approve/reject, ban, appeal decide). Distinct from the home dashboard.
- Durable API logs (ship JSONL off the box). Hosting (AWS vs elsewhere) is undecided; do not pick CloudWatch/ELK in this take-home. Local `logs/api.log` is enough for now; see [`decisions.md`](decisions.md).
- Prisma or similar ORM (typed CRUD, generated client). Current persistence is `pg` + explicit SQL; see [`decisions.md`](decisions.md). Do not introduce an ORM during this take-home.
- Appeal documents and correspondence (stubbed in [`data-model.md`](data-model.md))
- Async board export: UI **Prepare export** enqueues a job that writes a file (CSV or similar). Long-term store is object storage (S3-class), not a synchronous HTTP body. Same class of store as run artifacts below. Synchronous `ignoreMaxRows` is only a demo attempt.
- Object storage for run artifacts: VODs, documentation, and other supporting files. `proof_url` is enough for this take-home; hosting and playback stay out of scope.
- Paired public/runner web app on the **same database**: registered runners submit via web or email; the general public browses boards. This console stays the moderator surface. Not a login system in this take-home.
- Fielding hypermedia beyond pagination `next`
- Anything listed as out of scope in [`requirements.md`](requirements.md)
