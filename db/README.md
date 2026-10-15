# Database

| Path | Role |
|------|------|
| `migrations/001_schema.sql` | Schema |
| `seed/001_fixture.sql` | Fixture / test data |
| `seed/002_bulk.sql` | Optional ~200 000-run load; ≥20 rows/table; ≥50 runs/category; one board >10 000 eligible |
| `scripts/reset.sh` | Drop DB, recreate, apply schema |
| `scripts/seed.sh` | Load fixture |
| `scripts/bulk.sh` | Load bulk (after fixture) |
| `queries/ranking.sql` | Leaderboard SQL sketch |

IDs: [`docs/fixture.md`](../docs/fixture.md).

```bash
docker compose up -d db
docker compose --profile tools run --rm db-reset
docker compose --profile tools run --rm db-seed
docker compose --profile tools run --rm db-seed-bulk
```
