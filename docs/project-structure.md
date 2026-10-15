# Project structure — Speed Salon

Single repository. Display name **Speed Salon**; directory `speed-salon`.

```text
speed-salon/
  AGENTS.md                 # how humans and agents must work
  README.md                 # run, decisions summary, unfinished, next
  docker-compose.yml        # Postgres now; api/web later
  db/
    migrations/             # versioned SQL (001_schema.sql)
    seed/                   # 001_fixture.sql (init); bulk later
    queries/                # intended ranking SQL for the API
  docs/
    requirements.md
    architecture.md
    data-model.md
    decisions.md
    roadmap.md
    fixture.md
    project-structure.md    # this file
  apps/
    api/                    # Express + TypeScript (future)
    web/                    # React + TypeScript (future)
  packages/
    shared/                 # unions, DTOs, header name (future)
  .cursor/rules/            # short pointers at AGENTS.md
```

## Why this shape

- One clone, one Compose file, one history — matches the take-home.
- API and web can version types together without a private npm publish.
- Docs sit at the root so they are not trapped inside either app.

## What not to add without an ADR

- Extra packages (`apps/worker`, GraphQL, Storybook-only design systems)
- A second database
- A custom monorepo orchestrator if `docker compose` plus two package.json scripts suffice

## First implementation files (when code starts)

These are the intended entry points, not created yet:

- `docker-compose.yml` — `db` now; `api`, `web` later
- `db/migrations/001_schema.sql` — Postgres schema
- `db/seed/001_fixture.sql` — deterministic fixture
- `docs/fixture.md` — stable IDs for tests and act-as
- `apps/api/src/index.ts` — HTTP server
- `apps/api/src/middleware/moderator.ts` — header identity
- `apps/web/src/App.tsx` (or router root) — game page + ranking toggle
- `packages/shared/src/index.ts` — `RunStatus`, `RejectReason`, `RankingMode`, `AppealState`, `MODERATOR_HEADER`

Build order is [`docs/roadmap.md`](roadmap.md). Best first **code** after docs: schema + **fixture** seed (phase 1); bulk seed can follow without blocking the walking slice.
