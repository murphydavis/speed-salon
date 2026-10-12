# Data model — Speed Salon

Logical model for v1. Table names may be pluralized in SQL; meanings must not change.

## Entities

### `games`

- `id`, `name`, `slug`
- `default_category_id` (nullable until categories are inserted, then required)
- Changing `default_category_id` is a moderation action (assigned mods only) and should emit a review/audit event.

### `categories`

- `id`, `game_id`, `name` (e.g. `Any%`, `100%`), `slug`
- Unique `(game_id, slug)`
- A **board** is `(game_id, category_id)`.

### `runners`

- `id`, `name` (searchable), other display fields as needed
- Do **not** encode ban solely as a boolean that you delete later without history. Current standing is derived from `bans` (latest / active flag). A cached `banned_at` on the runner is allowed if it stays consistent with `bans` inside the same transaction.

### `moderators`

- `id`, `display_name`
- `moderator_games` (`moderator_id`, `game_id`) — assignment ACL

### `runs`

- `id`, `runner_id`, `game_id`, `category_id`
- `status`: `pending` | `approved` | `rejected`
- `time_ms` (integer milliseconds; rank by this ascending)
- `submitted_at`, `proof_url` (optional text)
- Checkpoints: either `run_splits` child table (`run_id`, `ordinal`, `label`, `time_ms`) or a constrained JSON array. Prefer a **child table** so detail queries stay ordinary SQL.
- Never delete a run because of reject or ban.

### `review_events` (append-only)

- `id`, `run_id` (nullable if the subject is a runner/game-level action)
- `runner_id` (nullable), `game_id` (nullable) — enough to reconstruct timeline
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

**Player mode (default):** one row per runner: `min(time_ms)` among eligible runs on that board; order by that time, then tie-break (`run_id` or submitted_at — record the choice in `docs/decisions.md`).

**Run mode:** one row per eligible run, order by `time_ms`, same tie-break.

## Indexes (required for seed scale)

- `runs (category_id, status, time_ms)` for board listings
- `runs (runner_id, category_id, status, time_ms)` for per-player best
- `runners (name)` — trigram or `ILIKE` with a supporting index; document the choice
- `review_events (run_id, created_at)`
- `bans (runner_id)` where active

## Constraints

- Reject path: application **and** DB should refuse empty comment; reason must be a known enum (`CHECK` or Postgres enum).
- `categories.game_id` must match `runs.game_id` (enforce in API; DB trigger optional).
- `games.default_category_id` must reference a category of **that** game.
