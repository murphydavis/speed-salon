# Speed Salon — agent and human constitution

This file is the source of truth for how work is done. Documentation in `docs/` is the source of truth for *what* the product is. [`docs/roadmap.md`](docs/roadmap.md) is the source of truth for *build order*. Together they are binding on humans and agents.

If code and docs disagree, **stop and surface the conflict** — do not pick a silent winner. Resolution is an explicit decision: change the implementation, change the documentation, or both, in the same change. Silent drift is a defect.

Canonical roles: `docs/requirements.md` = domain rules; OpenAPI (or the short resource list) = HTTP shapes; tests = executable examples. Do not duplicate the same rule in three incompatible wordings.

A future engineer with no AI must be able to continue from these files alone.

## Identity

Speed Salon is a **moderator console** for a speedrunning site: leaderboards, run review, bans, and audit history. It is not a runner-facing submission product in this take-home.

This is an **initial best attempt** at the platform (cloneable, domain-correct, documented leftovers), not a production system perfected over years. The prompt’s “about 2 hours” is a **scope hint**, not a hard elapsed-time limit.

Stack (fixed by the assignment): Node, Express, TypeScript, Postgres, React. Local run: `docker compose up`.

## Non-negotiable product rules

Do not implement behavior that violates these. If a requested feature conflicts, stop and update `docs/requirements.md` first.

1. **Boards are categories of a game.** Each game has a nullable `default_category_id`. A game-only view uses that category, or if unset the first category by `name`, then `id`. Assigned moderators may set the default. The UI flags an unset default. Runs store `category_id` only — never a second `game_id`. The game page can list and switch other categories.
2. **Many approved runs per runner per board are allowed.** Default ranking is **by player** (each runner’s best approved time). A toggle switches to **by run** (every approved run ranks independently; one runner may occupy many places).
3. **Pending → approved | rejected** is the only status machine for submissions. Clients cannot PATCH status arbitrarily.
4. **Reject** requires an **enumerated reason** *and* a **non-empty moderator comment**.
5. **Leaderboards** include only **approved** runs whose runner’s ban is **inactive**. Rejected and pending runs stay in the database and appear on run detail / queues, not on the public ranking.
6. **Ban is reversible and never implemented as delete.** Ban records remain after an appeal is approved; they become inactive. Appeal state is stored: not appealed, pending, rejected, approved. Extra appeal artifacts (documents, correspondence) are **stubbed in docs only** until explicitly scheduled.
7. **Moderators may mutate only games they are assigned to.** Identify the current moderator with a request header (`X-Moderator-Id`). Missing/unknown identity **fails closed** on mutations. Do not build real login.
8. **Every moderation action appends an immutable review event** (who, what, when, optional payload). No overwriting a single “last reviewed” column as a substitute for history.
9. **List endpoints paginate.** Seed volume is on the order of **hundreds of thousands of runs**. Unbounded `SELECT *` of runs is forbidden.

## Documentation discipline

- Describe the **current** system. Do not record discarded options, uncommitted experiments, or “we almost did B” unless Murphy asks to keep that justification.
- Do not restate what schema or code already makes obvious. Comment and prose earn their keep only when they add a non-obvious constraint or tradeoff.
- Behavior change ⇒ update the relevant file under `docs/` in the same commit when possible.
- New architectural choice ⇒ add a dated entry in `docs/decisions.md` stating the choice. Extra justification only when the tradeoff is not obvious.
- Unfinished work, stubs, and known breakage live in `README.md` (and may be cross-linked from requirements).
- Build sequence and phase completion live in `docs/roadmap.md` (checkboxes). Completing a phase means checking it in the same change.
- Do not skip, reorder, or add phases without updating the roadmap first. A **walking slice** across phases is allowed when `docs/roadmap.md` defines it — that is not “skipping.”
- Do not leave “the model knows” as the only record of a decision.

## Engineering standards

- TypeScript **strict**. Shared vocabulary (statuses, header name, DTO shapes, reject reasons, ranking mode) lives in `packages/shared` once code exists — API and web must not fork string unions.
- Prefer **explicit SQL** (or a thin query layer) for leaderboard and seed paths. Do not hide ranking semantics inside an ORM convenience that cannot use the indexes. Persistence modules stay thin; no generic repository forest. An ORM (e.g. Prisma) is **wishlist only** — not this assignment; see `docs/roadmap.md` Later / unscheduled.
- Validate mutations on the **server**. The UI may hide illegal actions; the API still enforces them.
- Fail with **typed, structured errors** (status, code, message). Do not return raw stack traces to the client.
- No secrets in git. Compose and `.env.example` document required variables; real `.env` is gitignored.
- Do not add a dependency without an ADR in `docs/decisions.md` stating why the standard library or an existing package was insufficient.
- No drive-by refactors. No extra product surface (auth, video player, anti-cheat, websocket, GraphQL, microservices) unless `docs/requirements.md` is updated first.

## Git and commits

The take-home asks for a **readable history**. Do not squash the project into one commit.

Commit in small, named slices, for example: docs, schema, seed, list API, run detail, moderate, ban/appeal, ranking toggle, CSV, compose wiring.

Commit messages say **why**. Do not commit `.env`, credentials, or generated `node_modules` / `dist`.

## How to work in this repo

1. Read `README.md`, this file, `docs/requirements.md`, and `docs/roadmap.md` before changing behavior.
2. Prefer the current phase, but take the **walking slice** (schema + fixture → a few API tests → crude UI) as soon as the previous layer can support it. Do not block the demo on a complete spec or bulk seed.
3. If the change is product, architecture, or sequence, write or update docs first.
4. If you hit a conflict between docs, tests, spec, and code, stop and ask — then record the decision.
5. Tests: keep a list of constitution cases; implement **one failing test at a time**. Do not author an entire red suite before a server exists.
6. Note leftovers in `README.md` rather than pretending they shipped. Check the matching roadmap box when a phase is actually done.

Schema and fixture live in `db/`. API walking slice lives in `apps/api` and `packages/shared`. Follow `docs/project-structure.md` and `docs/architecture.md`.
