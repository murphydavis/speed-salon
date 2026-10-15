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

Compose Postgres belongs here so the schema has a place to live. `api` and `web` services are in phase 3.

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
- [x] Games list: name search and total / approved / pending / banned run counts (2026-10-15)
- [x] Hide approved runs on a board (moderator work view; medals stay on the eligible ladder) (2026-10-15)
- [x] Compose includes `api` and `web` so `docker compose up` is the full local demo (2026-10-15)
- [x] Web smoke: Playwright walking-slice script and a committed demo video under 25 MB (2026-10-15)

---

## Later / unscheduled

Not a phase until promoted here with a checkbox. **Wishlist** items are not assignment work unless they are moved up. Ranked 2026-10-15 by **ease** (low effort first) × **value** to moderators or to running the repo, not by how impressive they look.

### Next (high value, cheap)

1. **Click-to-sort columns** on the games list (name, counts) and the board (place, runner, time, submitted). Ease: low. Value: everyday scanning. Client sort of the current page is a trap at this scale — sort must be query params + SQL `ORDER BY`.
2. **Rejected runs on a board** (reason, comment, review history), same include-flag pattern as pending/banned. Ease: low–medium (ACL + ranking mix already exist). Value: training and revisiting decisions. Hiding approved / showing pending and banned is the current work queue.
3. **Moderator home dashboard:** assigned games and a pending queue across those games. Ease: low–medium. Value: this is how mods start a session; the games list only marks `*`.

### Soon (high value, more glue)

4. **Player profile:** all of that runner’s runs (every game/category), for ban context. Ease: medium. Value: high when inspecting standing.
5. **CI/CD, protected `main`:** feature branches; ticket ids on branches/commits/ADRs when a tracker exists; PRs gated on review + constitution tests + coverage (local `npm test` already prints the table). Ease: medium. Value: process, not the demo.
6. **In-app notifications** for assigned games (new pending, bans, appeals). Poll the existing review events first; websockets stay out of scope. Ease: medium. Value: high once volume is real.
7. **Assignment matrix** (who covers which game), then **super-moderator assign/unassign** with new `review_action` values. Ease: medium / medium–high. Value: ops. Read-only matrix can ship before mutations.

### Later (real cost, or not this product)

8. **Async “Prepare export”** → file in object storage. Ease: high (jobs + store). Value: high at bulk CSV scale; `ignoreMaxRows` is only a demo attempt.
9. **Secret store** (Secrets Manager / Infisical / Vault) instead of Compose `.env`. Ease: medium–high. Value: production secrets, not the take-home.
10. **Split-host deploy** (db / api / web, env for `DATABASE_URL` and public origin). Ease: medium–high. Value: ops; local Compose stays one-host.
11. **Durable API logs** (ship JSONL). Ease: medium. Value: ops. Hosting target undecided; local `logs/api.log` is enough — see [`decisions.md`](decisions.md).
12. **Run stats / charts** (time distributions, progression). May flag incongruous jumps for mods — not auto-reject, not anti-cheat product. Ease: high. Value: medium.
13. **Appeal documents and correspondence** (stubbed in [`data-model.md`](data-model.md)) and **object storage for VODs / supporting files**. Ease: high. Value: medium until a runner app exists. `proof_url` is enough now.
14. **Moderator discussion board** (not appeal threads). Ease: high. Value: low until the review queue is excellent.
15. **Moderator profile** (assignments + action history). Ease: medium. Value: overlaps the dashboard; do after (3) and (7).
16. **Prisma / ORM.** Ease: high (ranking SQL must stay explicit). Value: low for this take-home — see [`decisions.md`](decisions.md).
17. **Paired public/runner app** on the same database (submit + public boards). Ease: very high. Value: high for a *site*, out of identity for *this* console. Not a login system in the take-home.
18. **Hypermedia** beyond pagination `next`. Ease: low. Value: none for v1.
19. Anything listed as out of scope in [`requirements.md`](requirements.md) (real auth, embedded video, websockets, per-game vs global ban split, marketing site).
