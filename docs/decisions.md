# Decisions — Speed Salon

Add a new dated entry when a choice is locked. Do not silently reverse an entry; supersede it with a newer one.

## 2026-10-12 — Documentation before application code

The first commits are requirements, architecture, data model, and `AGENTS.md`. Schema and Compose follow. Reason: the take-home is time-boxed; the domain rules (ranking modes, reject payload, appeal states) are easier to get wrong in code than in prose, and Murphy wants a human-maintainable trail if agents stop.

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

Sequence of work lives in `docs/roadmap.md`, not only in README “next” bullets. Phase 2 is spec (OpenAPI preferred) → accepted tests → implementation, with data-model types factored out of route handlers. Conflicts between docs and code are surfaced for an explicit decision.

## Open (resolve when implementing)

- Exact tie-break after `time_ms` (run id vs earlier submission).
- CSV: full matching set vs same page vs hard row cap.
- ORM vs `pg` + SQL for queries.
- Runner-name search: `ILIKE` vs trigram.
- Whether `appeal_submit` is a moderator action in the UI or seed-only until the stub is expanded.
