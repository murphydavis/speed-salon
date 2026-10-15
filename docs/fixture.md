# Fixture catalog

Stable IDs from `db/seed/001_fixture.sql`. Use these as `X-Moderator-Id` and in tests.

Init SQL only runs on an **empty** volume. Reset with `docker compose down -v` then `docker compose up db`.

## Moderators (act as)

| Display name | `X-Moderator-Id` | Games |
|--------------|------------------|-------|
| Alice Koopa | `00000000-0000-4000-a200-000000000001` | SM64, Ocarina of Time |
| Bob Brinstar | `00000000-0000-4000-a200-000000000002` | Celeste, Super Metroid |

## Games and default categories

| Game | Game id | Default category | Category id |
|------|---------|------------------|-------------|
| Super Mario 64 | `...a000-...0001` | Any% | `...a100-...0001` |
| Ocarina of Time | `...a000-...0002` | Any% | `...a100-...0003` |
| Celeste | `...a000-...0003` | Any% | `...a100-...0005` |
| Super Metroid | `...a000-...0004` | Any% | `...a100-...0007` |

Full UUIDs share the prefix `00000000-0000-4000-`.

## Notable runners

| Name | Runner id | Notes |
|------|-----------|--------|
| DashMain | `...a300-...0001` | Eight approved SM64 Any% times (run-mode dominance) |
| PendingPatty | `...a300-...0004` | Pending SM64 Any% |
| RejectRay | `...a300-...0005` | Rejected (invalid_proof + comment) |
| BannedNoAppeal | `...a300-...0006` | Active ban, `not_appealed` |
| BannedPendingAppeal | `...a300-...0007` | Active ban, appeal `pending` |
| BannedAppealDenied | `...a300-...0008` | Active ban, appeal `rejected` |
| BannedAppealWon | `...a300-...0009` | Ban row remains, appeal `approved` (on the board) |

## Notable runs

| Meaning | Run id |
|---------|--------|
| DashMain PB (splits) | `00000000-0000-4000-a500-000000000001` |
| Pending SM64 Any% | `00000000-0000-4000-a500-000000000301` |
| Rejected SM64 Any% | `00000000-0000-4000-a500-000000000302` |
| Celeste pending (Bob can moderate; Alice cannot) | `00000000-0000-4000-a500-000000000502` |

## Optional bulk seed

Not loaded on Compose init. `docker compose --profile tools run --rm db-seed-bulk` (`db/seed/002_bulk.sql`). Prefix `00000000-0000-4000-b`. Does not write to fixture boards. After bulk, every table has ≥20 rows (24 games, 24 bulk mods, mixed appeal bans, multi-mod games). Re-load: reset, fixture, bulk.

| Meaning | Id |
|---------|-----|
| Bulk Demo (Alice + extra mods) | `...b000-...0001` |
| Bulk Demo Any% (>10 000 eligible; uncapped CSV) | `...b100-...0001` |
| Bulk Secondary (Bob + extra mods) | `...b000-...0002` |
| Bulk games 03–24 | `...b000-...0003` … `...0024` |
| Bulk mods 01–24 | `...b200-...0001` … `...0024` |
