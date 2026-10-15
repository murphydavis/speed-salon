# Speed Salon

Moderator console for a speedrunning website: leaderboards by **game + category**, run review, reversible bans, and an audit trail.

This repository is a take-home for a senior full-stack role (Node / Express / TypeScript / Postgres / React). It is designed to run locally with Docker Compose once the runtime is added.

**You are here:** documentation and repository outline only. There is no application yet. Start with `AGENTS.md`, `docs/requirements.md`, and [`docs/roadmap.md`](docs/roadmap.md).

## How to run

Not available until Compose and apps exist. The intended command is:

```bash
docker compose up
```

Prerequisites will be: Docker, and no extra hosted services.

## Repository layout

See [`docs/project-structure.md`](docs/project-structure.md). In short: `apps/api`, `apps/web`, `packages/shared`, and `docs/` as the product source of truth.

## Decisions (summary)

Full record: [`docs/decisions.md`](docs/decisions.md).

- Boards are **game + category**. A game view uses a **moderator-configurable default category** (typically Any%).
- Runners may have many approved runs on one board. Default ranking is **by player (best run)**; a toggle ranks **by run**.
- Reject requires an **enumerated reason** and a **non-empty comment**.
- Bans are not deletes. Appeal state is stored (`not_appealed` | `pending` | `rejected` | `approved`). Approved appeals leave the ban row **inactive**. Documents/correspondence are **stubbed**, not built.
- Current moderator is `X-Moderator-Id`. Mutations are scoped to assigned games.
- Seed target: on the order of **hundreds of thousands** of runs.

## Unfinished / not started

Tracked with checkboxes in [`docs/roadmap.md`](docs/roadmap.md). Headline leftovers:

- Phase 1: Postgres schema, indexes, migrations, seed tool
- Phase 2: OpenAPI (or equivalent spec), API tests, Express implementation
- Phase 3: React UI and full Compose demo
- Appeal evidence storage (intentionally deferred; see data model stub)

## What we would do next

Current phase is **1. Postgres data model** — see [`docs/roadmap.md`](docs/roadmap.md).

## Maintaining this project

`AGENTS.md`, `docs/`, and the roadmap are binding for humans and agents. If AI tools are unavailable, continue from those files. If code and docs conflict, stop and decide — do not reverse product rules quietly. Record sequence and architecture changes in `docs/roadmap.md` and `docs/decisions.md`.
