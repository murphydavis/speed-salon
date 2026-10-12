# Speed Salon — agent and human constitution

This file is the source of truth for how work is done. Documentation in `docs/` is the source of truth for *what* the product is. If code and docs disagree, **fix the code or update the docs in the same change** — silent drift is a defect.

A future engineer with no AI must be able to continue from these files alone.

## Identity

Speed Salon is a **moderator console** for a speedrunning site: leaderboards, run review, bans, and audit history. It is not a runner-facing submission product in this take-home.

Stack (fixed by the assignment): Node, Express, TypeScript, Postgres, React. Local run: `docker compose up`.

## Non-negotiable product rules

Do not implement behavior that violates these. If a requested feature conflicts, stop and update `docs/requirements.md` first.

1. **Boards are game + category.** A game-only view uses that game’s **default category** (typically Any%). Assigned moderators may change the default. The game page can list and switch other categories.
2. **Many approved runs per runner per board are allowed.** Default ranking is **by player** (each runner’s best approved time). A toggle switches to **by run** (every approved run ranks independently; one runner may occupy many places).
3. **Pending → approved | rejected** is the only status machine for submissions. Clients cannot PATCH status arbitrarily.
4. **Reject** requires an **enumerated reason** *and* a **non-empty moderator comment**.
5. **Leaderboards** include only **approved** runs whose runner’s ban is **inactive**. Rejected and pending runs stay in the database and appear on run detail / queues, not on the public ranking.
6. **Ban is reversible and never implemented as delete.** Ban records remain after an appeal is approved; they become inactive. Appeal state is stored: not appealed, pending, rejected, approved. Extra appeal artifacts (documents, correspondence) are **stubbed in docs only** until explicitly scheduled.
7. **Moderators may mutate only games they are assigned to.** Identify the current moderator with a request header (`X-Moderator-Id`). Missing/unknown identity **fails closed** on mutations. Do not build real login.
8. **Every moderation action appends an immutable review event** (who, what, when, optional payload). No overwriting a single “last reviewed” column as a substitute for history.
9. **List endpoints paginate.** Seed volume is on the order of **hundreds of thousands of runs**. Unbounded `SELECT *` of runs is forbidden.

## Documentation discipline

- Behavior change ⇒ update the relevant file under `docs/` in the same commit when possible.
- New architectural choice ⇒ add a dated entry in `docs/decisions.md`.
- Unfinished work, stubs, and known breakage live in `README.md` (and may be cross-linked from requirements).
- Do not leave “the model knows” as the only record of a decision.

## Engineering standards

- TypeScript **strict**. Shared vocabulary (statuses, header name, DTO shapes, reject reasons, ranking mode) lives in `packages/shared` once code exists — API and web must not fork string unions.
- Prefer **explicit SQL** (or a thin query layer) for leaderboard and seed paths. Do not hide ranking semantics inside an ORM convenience that cannot use the indexes.
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

1. Read `README.md`, this file, and `docs/requirements.md` before changing behavior.
2. If the change is product or architecture, write or update docs first.
3. Implement the smallest slice that preserves the rules above.
4. Note leftovers in `README.md` rather than pretending they shipped.

## Code is not started yet

Application packages, Compose, and schema will be added after this documentation outline. Until then, do not invent a parallel structure — follow `docs/project-structure.md` and `docs/architecture.md`.
