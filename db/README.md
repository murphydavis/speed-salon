# Database

Versioned SQL for Speed Salon.

| Path | Role |
|------|------|
| `migrations/001_schema.sql` | Schema, enums, indexes, constraints |
| `seed/001_fixture.sql` | Deterministic walking-slice data |
| `queries/ranking.sql` | Intended leaderboard SQL (comments) |

Compose mounts the first two into Postgres `docker-entrypoint-initdb.d` as `001` and `002`. They run only when the volume is empty.

IDs: [`docs/fixture.md`](../docs/fixture.md). Bulk seed is not here yet.
