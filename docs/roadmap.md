# Roadmap — Speed Salon

Planned construction order. This file is **binding** for humans and agents, together with `AGENTS.md` and the rest of `docs/`.

Mark progress with Markdown checkboxes (`- [ ]` open, `- [x]` done). When a phase or subphase is finished, check it in the **same change** that completes the work, and note the date if useful. Phases may be added or split; do not skip ahead or reorder silently — update this file first (and `docs/decisions.md` if the order itself is a new choice).

**Conflict rule:** if implementation, tests, OpenAPI, or any other doc disagrees with this roadmap or with `docs/requirements.md`, **stop and surface the conflict**. Do not pick a silent winner. Resolution is an explicit decision: change the code, change the docs, or both.

Distribution of seed data, exact REST/HATEOAS depth, and OpenAPI-vs-tests timing details that are still open are called out in the phases. Resolve them at the start of that phase, in writing.

---

## 0. Project outline and requirements

- [x] Repository layout, `AGENTS.md`, requirements, architecture, and data-model prose (2026-10-12)

---

## 1. Postgres data model

Design and implement the database to match [`data-model.md`](data-model.md).

- [ ] Schema: tables, constraints, enums/checks, foreign keys
- [ ] Indexes required for leaderboard and seed scale
- [ ] Migrations (or equivalent versioned SQL) wired so a fresh Compose Postgres comes up empty then migrates
- [ ] Seed tool to populate the database
  - [ ] Agree, in writing, how fake data is distributed across games, categories, runners, statuses, bans, and appeal states (realistic skew, not uniform noise). Until that discussion happens, do not invent a silent distribution.

Compose Postgres belongs here so the schema has a place to live. Full `docker compose up` of api + web can wait until those apps exist.

---

## 2. REST API (TypeScript / Node / Express)

Idiomatic HTTP as developed from Fielding: resource URLs, correct verbs (`GET` / `POST` / `PATCH` / `PUT` / `DELETE` as the resources require), meaningful status codes, typed error bodies, and no RPC-in-disguise (`POST /approveRun`). How far we take hypermedia (HATEOAS) is decided in the spec subphase — not by accident in handlers.

### 2.1 Spec first

- [ ] Design and document the API (OpenAPI preferred)
  - If a complete OpenAPI document only becomes true during implementation, that is acceptable **provided** the intended resources, verbs, and status codes are written down before tests and code, and the OpenAPI file is updated in the same change as the handlers.

### 2.2 Tests second

- [ ] Test suite that validates the spec (contract + behavior: status machine, reject payload, ACL header, ranking modes, pagination, bans/appeals)
- [ ] Suite accepted (review) before treating implementation as in progress

### 2.3 Implementation last

- [ ] Implement the API so the accepted tests pass
  - [ ] Modular factoring: data-model definitions that reflect the Postgres schema live in a dedicated module (shared types and/or API persistence layer) — not inlined across route handlers
  - [ ] Moderator identity and game assignment enforced on mutations
  - [ ] Ranking queries use explicit SQL (or a thin query layer) and pagination

Do not start 2.3 until 2.1 and 2.2 are accepted, unless this file is updated with a written exception.

---

## 3. Web UI (TypeScript / React)

- [ ] React app that consumes the API and satisfies [`requirements.md`](requirements.md): game default board, category switch, player/run ranking toggle, search/filter, CSV, run detail, approve/reject, ban/appeal visibility, act-as header
- [ ] Compose includes `web` so `docker compose up` is the full local demo

---

## Later / unscheduled

Not a phase until promoted here with a checkbox:

- Appeal documents and correspondence (stubbed in [`data-model.md`](data-model.md))
- Anything listed as out of scope in [`requirements.md`](requirements.md)
