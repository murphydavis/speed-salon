# Constitution tests

Executable cases live in `apps/api`. They use fixture IDs and must pass on fixture-only or fixture+bulk (no seed-mode flag). `npm test` prints line/branch/function coverage for `apps/api/src`. This list is the backlog; implement one at a time.

Walking slice (in the test file):

- [x] Leaderboard default mode is players; DashMain occupies one place
- [x] Run mode lists multiple DashMain times
- [x] Run mode marks only the runner’s best eligible run as PB
- [x] Pending and rejected runs are absent from the board
- [x] Active bans are absent; appeal-approved ban remains
- [x] Lists are capped (`limit`)
- [x] Mutation without `X-Moderator-Id` → 401
- [x] Unknown moderator → 401
- [x] Alice cannot reject Bob’s Celeste pending run → 403
- [x] Reject with empty comment → 400
- [x] Reject already-rejected run → 409
- [x] Alice can approve SM64 pending; review event appended
- [x] Moderators list includes assignments
- [x] Games list includes SM64 run counts (including totalRuns); `q=Mario` matches Super Mario 64; game detail repeats game-wide counts and per-category counts
- [x] Game pending queue includes PendingPatty
- [x] includePending without header → 401; wrong-game mod → 403
- [x] Assigned mod can mix pending/banned; places stay eligible-only; total includes extras
- [x] includeApproved=false without header → 401; hiding approved leaves pending/banned without promoting medals; full board medals unchanged

- [x] Search q=DashMain returns that runner
- [x] Search does not re-rank Olympic playerPlace (BannedAppealWon stays 2)
- [x] CSV with no `q` exports the full board (DashMain and SecondPlace)
- [x] CSV `Content-Disposition` filename includes a UTC datetime stamp
- [x] CSV include flags appear in filename (`-pending`/`-banned`) and columns
- [x] Player podium: DashMain PB is gold (`playerPlace` 1); non-PB DashMain times are not silver/bronze; SecondPlace PB is bronze
- [x] CSV `ignoreMaxRows=true` is accepted and still returns CSV
- [x] Set default category (assigned only)
- [x] Ban removes runner from the board; lift restores
- [x] Approved appeal returns the runner to the board

Crash probes (bad input must not take down the process; next valid request still 200):

- [x] Malformed JSON body → 400 `invalid_json`
- [x] Non-UUID path param → 400 `invalid_id`
- [x] Unknown route → 404 JSON `not_found`
- [x] Illegal `limit` / ranking `mode` → 400 `invalid_query`
- [x] SQL-looking game search is parameterized (200, tables remain)
