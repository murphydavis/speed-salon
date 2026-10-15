-- Speed Salon v1 schema. Applied on first Postgres init (see docker-compose.yml).
-- Domain meanings: docs/data-model.md and docs/requirements.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE run_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE reject_reason AS ENUM (
  'invalid_proof',
  'time_mismatch',
  'wrong_category',
  'illegal_play',
  'timing_method',
  'duplicate',
  'suspicious',
  'other'
);

CREATE TYPE appeal_state AS ENUM (
  'not_appealed',
  'pending',
  'rejected',
  'approved'
);

CREATE TYPE review_action AS ENUM (
  'approve',
  'reject',
  'ban',
  'unban',
  'appeal_submit',
  'appeal_reject',
  'appeal_approve',
  'set_default_category'
);

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  default_category_id uuid
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games (id),
  name text NOT NULL,
  slug text NOT NULL,
  UNIQUE (game_id, slug),
  UNIQUE (id, game_id)
);

ALTER TABLE games
  ADD CONSTRAINT games_default_category_same_game
  FOREIGN KEY (default_category_id, id)
  REFERENCES categories (id, game_id);

CREATE TABLE runners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE moderators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL
);

CREATE TABLE moderator_games (
  moderator_id uuid NOT NULL REFERENCES moderators (id),
  game_id uuid NOT NULL REFERENCES games (id),
  PRIMARY KEY (moderator_id, game_id)
);

CREATE TABLE runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id uuid NOT NULL REFERENCES runners (id),
  category_id uuid NOT NULL REFERENCES categories (id),
  status run_status NOT NULL DEFAULT 'pending',
  time_ms integer NOT NULL CHECK (time_ms >= 0),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  proof_url text
);

CREATE TABLE run_splits (
  run_id uuid NOT NULL REFERENCES runs (id),
  ordinal integer NOT NULL CHECK (ordinal >= 1),
  label text NOT NULL,
  time_ms integer NOT NULL CHECK (time_ms >= 0),
  PRIMARY KEY (run_id, ordinal)
);

CREATE TABLE bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id uuid NOT NULL REFERENCES runners (id),
  moderator_id uuid NOT NULL REFERENCES moderators (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  comment text NOT NULL CHECK (length(trim(comment)) > 0),
  appeal_state appeal_state NOT NULL DEFAULT 'not_appealed'
);

CREATE TABLE review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES runs (id),
  runner_id uuid REFERENCES runners (id),
  category_id uuid REFERENCES categories (id),
  moderator_id uuid NOT NULL REFERENCES moderators (id),
  action review_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT review_events_reject_payload CHECK (
    action <> 'reject'
    OR (
      length(trim(payload->>'comment')) > 0
      AND payload->>'reason' IN (
        'invalid_proof',
        'time_mismatch',
        'wrong_category',
        'illegal_play',
        'timing_method',
        'duplicate',
        'suspicious',
        'other'
      )
    )
  ),
  CONSTRAINT review_events_subject CHECK (
    (action IN ('approve', 'reject') AND run_id IS NOT NULL)
    OR (
      action IN ('ban', 'unban', 'appeal_submit', 'appeal_reject', 'appeal_approve')
      AND runner_id IS NOT NULL
    )
    OR (action = 'set_default_category' AND category_id IS NOT NULL)
  )
);

-- Ranking / seed-scale indexes (docs/data-model.md).
CREATE INDEX runs_board_status_time_idx
  ON runs (category_id, status, time_ms, submitted_at, id);

CREATE INDEX runs_runner_board_status_time_idx
  ON runs (runner_id, category_id, status, time_ms);

CREATE INDEX runners_name_trgm_idx
  ON runners USING gin (name gin_trgm_ops);

CREATE INDEX review_events_run_created_idx
  ON review_events (run_id, created_at);

CREATE INDEX bans_active_runner_idx
  ON bans (runner_id)
  WHERE appeal_state <> 'approved';

CREATE INDEX bans_runner_idx
  ON bans (runner_id);
