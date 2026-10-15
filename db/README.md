# Database

| Path | Role |
|------|------|
| `migrations/001_schema.sql` | Schema |
| `seed/001_fixture.sql` | Fixture / test data |
| `seed/002_bulk.sql` | Optional ~200 000-run load; ≥20 rows/table; ≥50 runs/category; one board >10 000 eligible |
| `scripts/init.sh` | Empty-volume Compose init: schema, fixture, bulk (`SEED_MODE=fixture` skips bulk) |
| `scripts/reset.sh` | Drop DB, recreate, apply schema (does not seed) |
| `scripts/seed.sh` | Load fixture |
| `scripts/bulk.sh` | Load bulk (after fixture) |
| `scripts/demo.sh` | Fixture + bulk (after reset; matches default first `up`) |
| `queries/ranking.sql` | Leaderboard SQL sketch |

IDs: [`docs/fixture.md`](../docs/fixture.md).

First `docker compose up` on an empty volume seeds demo data. Later `up` leaves the volume alone.

```bash
docker compose down -v
docker compose up

SEED_MODE=fixture docker compose up

docker compose --profile tools run --rm db-reset
docker compose --profile tools run --rm db-seed-demo
# or fixture only: db-seed
# or add bulk after fixture: db-seed-bulk
```
