# Decisions — Speed Salon

Add a new dated entry when a choice is locked. Do not silently reverse an entry; supersede it with a newer one.

## 2026-10-12 — Documentation before application code

The first commits are requirements, architecture, data model, and `AGENTS.md`. Schema and Compose follow. Reason: domain rules (ranking modes, reject payload, appeal states) are easier to get wrong in code than in prose, and Murphy wants a human-maintainable trail if agents stop. Scope stays an initial attempt, not unbounded polish.

## 2026-10-12 — Monorepo with apps/api, apps/web, packages/shared

One repo is enough for a Compose-based take-home. Shared types prevent status/reason string drift. A heavier turborepo/Nx layout is rejected unless compile time demands it.

## 2026-10-12 — Boards are game + category; game URL uses configurable default category

Matches typical speedrun sites. Default is usually Any% but is **moderator-configurable** per game (assigned mods only). Category switch lives on the game page.

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

## Open (resolve when implementing)

- Exact tie-break after `time_ms` (run id vs earlier submission).
- CSV: full matching set vs same page vs hard row cap.
- ORM vs `pg` + SQL for queries (lean: `pg` + SQL unless an ADR says otherwise).
- Runner-name search: `ILIKE` vs trigram.
- Whether `appeal_submit` is a moderator action in the UI or seed-only until the stub is expanded.
