# Architecture — Speed Salon

## Goal

One repository, three runtime pieces under Docker Compose: **Postgres**, **API** (Express + TypeScript), **Web** (React + TypeScript). Shared TypeScript types keep the two apps on the same vocabulary.

```text
Browser  →  Web (React)  →  API (Express)  →  Postgres
                 │                │
                 └──── packages/shared ────┘
Header: X-Moderator-Id on API requests (set by web “act as” control)
```

## Boundaries

| Piece | Owns | Must not own |
|-------|------|----------------|
| `apps/web` | Screens, ranking toggle, filters, CSV download trigger, act-as header | SQL, status transitions, ACL |
| `apps/api` | HTTP, validation, ACL, ranking queries, CSV bytes, transactions | React components, “trust the client’s new status” |
| `packages/shared` | Status unions, reject reasons, ranking mode, header name, DTO types | Runtime secrets, database access |
| Postgres | Canonical state, constraints, indexes | Business rules that only exist in UI copy |

## Request flow

1. Web sends JSON to the API and includes `X-Moderator-Id`.
2. API resolves the moderator. Mutations fail closed if identity is missing or the moderator is not assigned to the target game.
3. Commands run in a **transaction**: update run/runner/ban **and** insert a `review_events` row.
4. Queries for boards apply eligibility (`approved` + inactive ban) and either **player** aggregation (`DISTINCT ON` / grouped min time) or **run** listing, then paginate.

## Auth model

There is no session. The header *is* the identity. Seeded moderator UUIDs are documented in README after seed exists. This is an assignment allowance, not a production pattern — say so in the README.

## CSV

CSV is generated **on the API** from the same query parameters as the HTML table (game, category, ranking mode, search, filters). The browser should not re-implement ranking in JS for export.

## Seed

Seed is a **bulk load** (Postgres `COPY` or batched inserts), not hundreds of thousands of ORM `save()` calls. It may run as a Compose command or an API/bootstrap script; the choice belongs in `docs/decisions.md` when implemented.

## What is intentionally not here

No extra services, message queues, GraphQL gateway, or separate “appeal service.” Appeal documentation storage is a **future module** noted in the data model.
