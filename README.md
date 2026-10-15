# Speed Salon

Moderator console for a speedrunning site: boards by **game + category**, run review, reversible bans, audit history. Senior take-home (Node, Express, TypeScript, Postgres, React). Initial attempt, not years of polish.

## Run (evaluator)

Docker. First empty volume loads schema + fixture + bulk seed (**several minutes**). Later `up` does not wipe data.

```bash
docker compose up
```

Then open **[http://localhost:5173](http://localhost:5173)**. Act as **Alice Koopa** (header is identity; no login). API: [http://localhost:3000](http://localhost:3000), spec [http://localhost:3000/docs](http://localhost:3000/docs). Seeded IDs: [`docs/fixture.md`](docs/fixture.md).

After code changes: `docker compose up --build`. Reset DB: `docker compose down -v` then `up`. Fixture-only first init: `SEED_MODE=fixture docker compose up`.

Host Node against Compose Postgres: `docker compose up -d db`, then `npm install`, `npm test`, `npm run dev`.

Optional click-through video: [`docs/assets/smoke.webm`](docs/assets/smoke.webm) ([captions](docs/assets/smoke.vtt)). Same path: `npx playwright install chromium` in `apps/web`, then `npm run smoke` (app must be up).

## Reviewer walk (acceptance)

With Alice on Super Mario 64 (Any% is the default board):

1. Default board is **rank by players**.
2. **Rank by runs** — DashMain occupies several places (PB marked).
3. Switch category (**100%** / **Any%**).
4. Search runner **DashMain**; **Export CSV** (omit search for the full board; cap 10 000 unless you attempt uncapped).
5. Click a **time** — splits + review history.
6. **Show pending**, open PendingPatty, **approve** or **reject** (reason + comment). Switch act-as to **Bob Brinstar** — SM64 mutations fail.
7. Ban a runner (times leave the board); appeal state on the run; an **approved** appeal returns times and leaves the ban row inactive.

`npm test` is the API constitution suite (same DB, no seed-mode flag; slower on bulk; prints coverage).

## Layout

`apps/api`, `apps/web`, `packages/shared`, `db/`, product rules in [`docs/`](docs/). How to work: [`AGENTS.md`](AGENTS.md). Domain: [`docs/requirements.md`](docs/requirements.md). Sequence: [`docs/roadmap.md`](docs/roadmap.md).

## Honest leftovers

- Board search is runner name only.
- Compose image bakes source; rebuild after edits.
- Playwright Chromium is host-only (not in Compose).
- Appeal evidence files are stubbed. Rejected runs are not mixed onto the board yet.

## Next (ranked wishlist)

Full list with ease × value: [`docs/roadmap.md`](docs/roadmap.md) Later / unscheduled. Suggested order: **sortable columns** → **rejected runs on the board** → **moderator dashboard** (assigned games + pending queue).
