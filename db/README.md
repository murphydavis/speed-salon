# Database

| Path | Role |
|------|------|
| `migrations/001_schema.sql` | Schema |
| `seed/001_fixture.sql` | Fixture / test data |
| `scripts/reset.sh` | Drop DB, recreate, apply schema |
| `scripts/seed.sh` | Load fixture |
| `queries/ranking.sql` | Leaderboard SQL sketch |

IDs: [`docs/fixture.md`](../docs/fixture.md).

```bash
docker compose up -d db
docker compose --profile tools run --rm db-reset
docker compose --profile tools run --rm db-seed
```
