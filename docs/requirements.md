# Requirements — Speed Salon

Product rules for the moderator console. Implementation must match this file. Out-of-scope items may be mentioned in the UI as “not built” only if listed here as deferred.

## Problem

Volunteer moderators review speedrun submissions so leaderboards show legitimate times. Speed Salon is the tool they use: browse boards, inspect runs, approve or reject, and ban or reverse bans within the games they cover.

## In scope

### Games list

- The home page lists games. Search by **game name** (optional; empty search is the full list). Pagination starts on page 1; a new search returns to page 1.
- Each game shows **total** runs (every status) plus **approved** (eligible: approved and no active ban), **pending**, and **banned** (approved with an active ban), all summed across every category of that game.
- On a game page, those four counts are for the **active category** and sit under the board name. Switching boards updates them.

### Leaderboards

- A **board** is a **category** of a game (example: Super Mario 64 / Any%). Runs store only `category_id`.
- Opening a game without a category uses `games.default_category_id` when set. If it is null, use the first category for that game ordered by `name`, then `id`.
- Assigned moderators may set `default_category_id`. The game page indicates when none is set.
- From the game page, the moderator can **list other categories** for that game and switch boards.
- Runners may have **any number of approved runs** on a given board.
- **Default ranking mode: players.** One place per eligible runner, ordered by that runner’s **best** (lowest) approved time on the board.
- **Alternate ranking mode: runs.** Every eligible approved run is listed. One runner may occupy many consecutive places (including an entire top 10). That runner’s best eligible run is marked **PB**.
- Gold / silver / bronze follow the **player** ladder (rank-by-players), like Olympic medals: one medal per athlete. They go on that runner’s **PB** even in rank-by-runs. A dominant runner’s 2nd- and 3rd-fastest times are not silver and bronze. Pending and banned extras never get medals.
- The ranking mode is a **toggle on the current view**, not a separate product.
- Each board run shows **submitted_at** (treated as completed-at until a separate completed timestamp exists). The **time** is the link to the run; the runner name is not a profile link.
- Moderators can **filter** the current view, **search by runner name**, and **export the current view as CSV** (same ranking mode and include flags). Search is optional: **no search term exports the entire board** (still capped at 10 000 unless `ignoreMaxRows`). A non-empty search limits the export to matching runners. An optional flag **attempts** an uncapped export; that request may still fail on memory or timeout. Job-based export and object storage are wishlist.
- Eligible for ranking: run `status = approved` **and** the runner’s current ban is **inactive**.
- Assigned moderators of the game may toggle **pending** and **banned** runs onto the current board (same category, mixed in by time). Those runs have **no place**. Place numbers stay the eligible ranking only. They may also **hide approved** eligible runs so the board is only work that still needs input (pending and/or banned, depending on those toggles). Hiding approved does **not** recompute PB marks or Olympic medals; those still come from the full eligible approved ladder. Approving a run can change medals on the next load because the eligible set changed. When any of these flags change the visible set, pagination **total** is the merged visible list (mixed by time). Toggling a flag returns to page 1. Unassigned or anonymous clients cannot use these flags. CSV filenames and columns record which flags were on. The UI uses Show/Hide buttons, not checkboxes.
- Olympic medals use **unfiltered** player-ladder places. A search that leaves only the 2nd-best player still shows **silver** on their PB.
- Paginated lists in the UI (**games** and the **board**) start on **page 1**. Controls: first, previous, next, last, and a page-number field. Changing category, ranking mode, search, or include flags returns to page 1. The API `page` / `limit` contract is unchanged.

### Run details

- Clicking a run shows: runner, game, category, final time, **checkpoint / split times**, current status, current ban/appeal summary if relevant, and **full review history** (who, action, when, payload).

### Moderation of submissions

- New submissions start **`pending`**.
- Assigned moderators **approve** (run may appear on the board) or **reject** (it does not).
- **Reject** is invalid unless:
  1. `reason` is one of the enumerated reject reasons below, and
  2. `comment` is a non-empty string after trim.
- Approve still records a review event (comment optional).

#### Reject reasons (enum)

| Code | Meaning |
|------|---------|
| `invalid_proof` | Missing, broken, or unusable video/proof |
| `time_mismatch` | Claimed time does not match the proof |
| `wrong_category` | Run belongs on a different category (or is miscategorized) |
| `illegal_play` | Disallowed glitch, exploit, or ruleset violation |
| `timing_method` | Wrong timing method (e.g. RTA vs IGT) |
| `duplicate` | Duplicate of an existing submission |
| `suspicious` | Likely cheating; not enough to ban yet, or pending investigation |
| `other` | Does not fit the above; comment must explain |

Adding a reason is a product change: update this table, `packages/shared`, and the database check/enum together.

### Bans and appeals

- Moderators assigned to a game may **ban a runner** in the context of site-wide runner standing for this take-home (a banned runner’s times drop off **all** boards). If a later version needs per-game bans, that is a new requirement.
- Ban **does not delete** runs, review events, or the runner.
- Bans are **reversible**.
- Every ban has an **appeal state**:

| State | Meaning |
|-------|---------|
| `not_appealed` | Ban is active; runner has not appealed |
| `pending` | Ban is active; appeal submitted, not decided |
| `rejected` | Ban is active; appeal was denied |
| `approved` | **Ban record remains** but is **inactive**; runner’s eligible approved times return to boards |

- Viewing a ban must show this appeal state.
- **Stub (do not build now):** storing appeal evidence, documents, and correspondence. Schema and API may expose an empty placeholder or omit fields with a README note. See `docs/data-model.md`.

### Authorization (not login)

- Current moderator is identified by header **`X-Moderator-Id`**.
- Mutations (approve, reject, ban, unban, set default category, decide appeal) require that moderator to be **assigned to the run’s game** (or the game being configured).
- Unknown or missing header on mutations → **401**. Assigned but wrong game → **403**. The same fail-closed rule applies to reads that expose pending or banned runs on a board.
- Public board reads (eligible ranking only) do not require the header. The UI still hides actions and extra runs the header cannot perform.
- A small **“act as moderator”** control in the web app that sets the header is allowed. It is not an authentication system.

### Seed data

- **Fixture seed:** small and deterministic. Must include everything the walking slice and constitution tests need (player vs run ranking with a dominant runner, pending/approved/rejected, each ban appeal state, split review history, mods not assigned to every game).
- **Bulk seed:** enough fake data to feel like a real site: **on the order of a few hundred thousand runs**, **at least 20 games**, multiple categories per game, many runners, mixed statuses. Same invariants as the fixture, scaled. Skew is specified in `docs/decisions.md`. **At least one board has more than 10 000 eligible approved runs**. After bulk, **no table has fewer than 20 rows** (≥20 moderators, ≥20 bans in every appeal state, multi-moderator games, etc.) and **every category has at least 50 non-rejected runs** (32 approved / 14 pending / 6 banned is an acceptable mix). Tests must not require this load.
- Tests run against the fixture (or a migration-only empty DB plus fixture). Tests must not require the bulk load.

## Out of scope (defer; note in README)

- Real accounts, passwords, sessions, OAuth
- Runner-facing submit UI (wishlist: paired public/runner app; web or email submit)
- Video hosting or embedded playback (a proof URL field is enough; wishlist: object storage for VODs and supporting files)
- Full appeal workspace (documents, message threads) — **stub only**
- Anti-cheat heuristics, automated verification
- Real-time updates / websockets
- Per-game vs global ban split (global for v1)
- Pixel-perfect design, marketing site, public anonymous leaderboard SEO

## Acceptance (minimum vertical slice)

When Compose is eventually wired, a reviewer should be able to:

1. Open a game and see the default category board in **player** ranking.
2. Toggle to **run** ranking and see a dominant runner occupy multiple places (seed this).
3. Switch category from the game page.
4. Search a runner by name and export CSV of the current view.
5. Open a run and see splits + review history.
6. As a scoped moderator, approve a pending run and reject another with reason + comment; as a moderator for a different game, those mutations fail.
7. Ban a runner (times leave boards), see appeal state, approve an appeal (times return, ban record still visible as inactive).

Items not reached in this **initial attempt** stay in `README.md` as unfinished — do not fake them. The assignment’s two-hour note is a scope hint, not a requirement to stop the clock.
