# Data model — Speed Salon

Logical model for v1. Table names may be pluralized in SQL; meanings must not change.

## Entities

### `games`

- `id`, `name`, `slug`, `default_category_id` (nullable; if set, must be a category of this game)
- Unset default: first category by `name`, then `id`. Assigned mods may set the default; UI shows when it is unset.

### `categories`

- `id`, `game_id`, `name`, `slug`
- Unique `(game_id, slug)` and `(id, game_id)` (for the game default FK)
- A board is a category. Runs store `category_id` only.

### `runners`

- `id`, `name` (searchable), other display fields as needed
- Do **not** encode ban solely as a boolean that you delete later without history. Current standing is derived from `bans` (latest / active flag). A cached `banned_at` on the runner is allowed if it stays consistent with `bans` inside the same transaction.

### `moderators`

- `id`, `display_name`
- `moderator_games` (`moderator_id`, `game_id`) — assignment ACL

### `runs`

- `id`, `runner_id`, `category_id` (game is `categories.game_id`)
- `status`: `pending` | `approved` | `rejected`
- `time_ms` (integer milliseconds; rank by this ascending)
- `submitted_at`, `proof_url` (optional text). Bytes behind that URL (VODs, docs, supporting files) are wishlist object storage, not columns here.
- Checkpoints: either `run_splits` child table (`run_id`, `ordinal`, `label`, `time_ms`) or a constrained JSON array. Prefer a **child table** so detail queries stay ordinary SQL.
- Never delete a run because of reject or ban.

### `review_events` (append-only)

- `id`, `run_id` (nullable if the subject is a runner/game-level action)
- `runner_id` (nullable), `category_id` (nullable; for `set_default_category`)
- Game is derived: via `runs.category_id` or `review_events.category_id`, never a second copy of `game_id` beside a category FK
- `moderator_id`, `action`, `created_at`
- `payload` JSON: reject reason + comment, ban/appeal transitions, default category change, etc.
- **No updates, no deletes** in application code.

Suggested `action` values: `approve`, `reject`, `ban`, `unban`, `appeal_submit`, `appeal_reject`, `appeal_approve`, `set_default_category`.

### `bans`

- `id`, `runner_id`, `moderator_id` (who issued it), `created_at`, `reason` / `comment` (non-empty comment recommended)
- `appeal_state`: `not_appealed` | `pending` | `rejected` | `approved`
- `inactive` or equivalently `appeal_state = approved` (and/or `lifted_at`) means the ban **does not** filter leaderboards
- Keep the row forever. A new ban after a lifted one is a **new row** (history), not a mutate-in-place of the old appeal-approved ban without an event.

**Active ban** for ranking: there exists a ban on the runner that is not inactive (not appeal-approved / not lifted).

### Appeal stub (future)

Do **not** implement tables for documents or correspondence yet. Reserved names for later:

- `appeal_messages` (thread on a ban)
- `appeal_documents` (uploads / URLs, metadata)

README and this section are the stub. API may return `appeal: { state, documents: [] }` with an empty list.

## Ranking

Eligibility: `runs.status = 'approved'` AND runner has **no active ban**.

**Player mode (default):** one row per runner: `min(time_ms)` among eligible runs on that board; order by that time, then tie-break **submitted_at ASC, id ASC** (`docs/decisions.md`).

**Run mode:** one row per eligible run, order by `time_ms`, same tie-break.

## Indexes (required for seed scale)

- `runs (category_id, status, time_ms)` for board listings
- `runs (runner_id, category_id, status, time_ms)` for per-player best
- `runners (name)` — `pg_trgm` GIN (`gin_trgm_ops`)
- `review_events (run_id, created_at)`
- `bans (runner_id)` where active

## Constraints

- Reject path: application **and** DB refuse empty comment; reason must be a known enum (`CHECK`).
- `review_events` subject matches action (`run_id` for approve/reject, `runner_id` for ban/appeal, `category_id` for set_default_category).
- Do not put both `game_id` and `category_id` on the same row.
- `games.default_category_id` is nullable; when present it must reference a category of that game.
