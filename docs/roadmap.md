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

- [ ] Schema: tables, constraints, enums/checks, foreign keys needed for the walking slice (full model in `data-model.md`; do not invent extra tables)
- [ ] Indexes required for leaderboard and seed scale
- [ ] Migrations (or equivalent versioned SQL) wired so a fresh Compose Postgres comes up empty then migrates
- [ ] **Fixture seed** — small, deterministic, fast; enough to prove player vs run ranking, reject/approve, ACL-relevant assignments, and every appeal state
- [ ] **Bulk seed** — on the order of a few hundred thousand runs, via `COPY` / batched insert, using the distribution in [`decisions.md`](decisions.md)

Compose Postgres belongs here so the schema has a place to live. Full `docker compose up` of api + web can wait until those apps exist, except as needed for the walking slice.

---

## 2. REST API (TypeScript / Node / Express)

**v1 REST** means an idiomatic *HTTP* API: resource URLs, correct verbs, meaningful status codes, typed error bodies, pagination, no RPC-in-disguise (`POST /approveRun`). Self-descriptive JSON is enough. Hypermedia (HATEOAS) is **out of v1** except optional pagination links (e.g. `next`) if they are cheap. That choice is recorded in `docs/decisions.md`.

### 2.1 Spec as we go

- [ ] Short resource list + error model (paths, verbs, statuses) **before** the first handlers for that resource
- [ ] OpenAPI file in repo, grown in the **same change** as the handlers it describes — not a finished novel before any code

### 2.2 Tests as a list, then one at a time

- [ ] Written **test list** of constitution cases: status machine, reject reason + comment, ACL 401/403, ranking eligibility, pagination required, ban inactivate/restore
- [ ] Executable tests added **incrementally** (one failing test → pass → next). Do not freeze a complete red suite before any server exists.
- [ ] Do **not** aim for exhaustive CRUD of every table; skip noise that does not encode a product rule

### 2.3 Implementation with the tests

- [ ] Implement so current tests pass; widen with the walking slice
  - [ ] Modular factoring: data-model types / thin persistence module reflecting Postgres — not inlined across route handlers, and **not** a generic ORM that hides ranking SQL
  - [ ] Moderator identity and game assignment enforced on mutations
  - [ ] Ranking queries use explicit SQL (or a thin query layer) and pagination

---

## 3. Web UI (TypeScript / React)

A crude UI for the walking slice is allowed as soon as the matching API tests are green. Polish and remaining screens come after.

- [ ] Walking-slice UI: game default board, ranking toggle, run detail, approve/reject, act-as header
- [ ] Remaining requirements: category switch, search/filter, CSV, ban/appeal visibility and actions
- [ ] Compose includes `web` so `docker compose up` is the full local demo

---

## Later / unscheduled

Not a phase until promoted here with a checkbox:

- Appeal documents and correspondence (stubbed in [`data-model.md`](data-model.md))
- Fielding hypermedia beyond pagination `next`
- Anything listed as out of scope in [`requirements.md`](requirements.md)
