-- Optional demo-scale load. Not applied on Compose init.
-- ~200000 runs on games that are not the fixture boards.
-- Every table ends with ≥20 rows. Bulk Demo Any% has >10000 eligible approved runs.
-- Catalog: docs/fixture.md. Distribution: docs/decisions.md.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM games WHERE id = '00000000-0000-4000-b000-000000000001'
  ) THEN
    RAISE EXCEPTION 'bulk seed already applied; reset then fixture, then bulk';
  END IF;
END $$;

INSERT INTO games (id, name, slug)
SELECT
  ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid,
  CASE i
    WHEN 1 THEN 'Bulk Demo'
    WHEN 2 THEN 'Bulk Secondary'
    ELSE 'Bulk Game ' || to_char(i, 'FM00')
  END,
  CASE i
    WHEN 1 THEN 'bulk-demo'
    WHEN 2 THEN 'bulk-secondary'
    ELSE 'bulk-game-' || to_char(i, 'FM00')
  END
FROM generate_series(1, 24) AS s(i);

-- Any% for all 24 games (ids 1, 3, 4…25 — slot 2 is Bulk Demo 100%).
INSERT INTO categories (id, game_id, name, slug)
SELECT
  ('00000000-0000-4000-b100-' || lpad(
    (CASE WHEN i = 1 THEN 1 WHEN i = 2 THEN 3 ELSE i + 1 END)::text,
    12,
    '0'
  ))::uuid,
  ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid,
  'Any%',
  'any'
FROM generate_series(1, 24) AS s(i);

-- 100% for all games (Bulk Demo keeps ...0002).
INSERT INTO categories (id, game_id, name, slug)
SELECT
  ('00000000-0000-4000-b100-' || lpad(
    (CASE WHEN i = 1 THEN 2 ELSE 100 + i END)::text,
    12,
    '0'
  ))::uuid,
  ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid,
  '100%',
  '100'
FROM generate_series(1, 24) AS s(i);

-- Third category on every third game.
INSERT INTO categories (id, game_id, name, slug)
SELECT
  ('00000000-0000-4000-b100-' || lpad((300 + i)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid,
  'Any% NMG',
  'any-nmg'
FROM generate_series(3, 24, 3) AS s(i);

-- Games 21–24 leave default unset (permutation).
UPDATE games g
SET default_category_id = c.id
FROM categories c
WHERE g.id = c.game_id
  AND c.slug = 'any'
  AND g.id IN (
    SELECT ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid
    FROM generate_series(1, 20) AS s(i)
  );

INSERT INTO moderators (id, display_name)
SELECT
  ('00000000-0000-4000-b200-' || lpad(i::text, 12, '0'))::uuid,
  'Bulk Mod ' || to_char(i, 'FM00')
FROM generate_series(1, 24) AS s(i);

-- Alice/Bob plus bulk mods: each bulk mod covers two games; some games have several mods.
INSERT INTO moderator_games (moderator_id, game_id)
SELECT DISTINCT moderator_id, game_id
FROM (
  SELECT
    '00000000-0000-4000-a200-000000000001'::uuid AS moderator_id,
    '00000000-0000-4000-b000-000000000001'::uuid AS game_id
  UNION ALL
  SELECT
    '00000000-0000-4000-a200-000000000002',
    '00000000-0000-4000-b000-000000000002'
  UNION ALL
  SELECT
    '00000000-0000-4000-a200-000000000001',
    '00000000-0000-4000-b000-000000000003'
  UNION ALL
  SELECT
    '00000000-0000-4000-a200-000000000002',
    '00000000-0000-4000-b000-000000000004'
  UNION ALL
  SELECT
    ('00000000-0000-4000-b200-' || lpad(i::text, 12, '0'))::uuid,
    ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid
  FROM generate_series(1, 24) AS s(i)
  UNION ALL
  SELECT
    ('00000000-0000-4000-b200-' || lpad(i::text, 12, '0'))::uuid,
    ('00000000-0000-4000-b000-' || lpad((1 + (i % 24))::text, 12, '0'))::uuid
  FROM generate_series(1, 24) AS s(i)
  UNION ALL
  SELECT
    ('00000000-0000-4000-b200-' || lpad(i::text, 12, '0'))::uuid,
    '00000000-0000-4000-b000-000000000001'::uuid
  FROM generate_series(8, 24, 8) AS s(i)
) assign;

INSERT INTO runners (id, name)
SELECT
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  'Bulk' || to_char(i, 'FM0000')
FROM generate_series(1, 8000) AS s(i);

-- i=1..13700 Bulk Demo Any% (12500 approved, 800 pending, 400 rejected)
-- i=13701..53700 Bulk Demo 100%
-- i=53701..200000 round-robin other bulk boards
INSERT INTO runs (
  id, runner_id, category_id, status, time_ms, submitted_at, proof_url
)
SELECT
  ('00000000-0000-4000-b500-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(runner_n::text, 12, '0'))::uuid,
  CASE
    WHEN i <= 13700 THEN '00000000-0000-4000-b100-000000000001'::uuid
    WHEN i <= 53700 THEN '00000000-0000-4000-b100-000000000002'::uuid
    ELSE other_board.id
  END,
  CASE
    WHEN i <= 12500 THEN 'approved'::run_status
    WHEN i <= 13300 THEN 'pending'::run_status
    WHEN i <= 13700 THEN 'rejected'::run_status
    WHEN i % 100 < 90 THEN 'approved'::run_status
    WHEN i % 100 < 97 THEN 'pending'::run_status
    ELSE 'rejected'::run_status
  END,
  CASE
    WHEN i <= 30 THEN 300000 + i * 1000
    ELSE 600000 + ((i * 7919) % 1400000)
  END,
  timestamptz '2023-01-01 00:00:00+00' + make_interval(secs => i),
  'https://example.invalid/bulk/' || i
FROM generate_series(1, 200000) AS s(i)
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN i <= 30 THEN 1
      WHEN i % 10 < 4 THEN 1 + (i % 20)
      WHEN i % 10 < 8 THEN 21 + (i % 480)
      ELSE 501 + (i % 7500)
    END AS runner_n
) skew
LEFT JOIN LATERAL (
  SELECT c.id, c.n, c.ncat
  FROM (
    SELECT
      cat.id,
      row_number() OVER (ORDER BY cat.id) AS n,
      count(*) OVER () AS ncat
    FROM categories cat
    WHERE cat.id NOT IN (
      '00000000-0000-4000-b100-000000000001',
      '00000000-0000-4000-b100-000000000002'
    )
      AND cat.id::text LIKE '00000000-0000-4000-b100-%'
  ) c
  WHERE i > 53700
    AND c.n = 1 + ((i - 53701) % c.ncat)
) other_board ON true;

INSERT INTO run_splits (run_id, ordinal, label, time_ms)
SELECT
  ('00000000-0000-4000-b500-' || lpad(r::text, 12, '0'))::uuid,
  s.ordinal,
  s.label,
  s.time_ms
FROM generate_series(1, 12) AS t(r)
CROSS JOIN (
  VALUES
    (1, 'Start', 80000),
    (2, 'Mid', 180000),
    (3, 'End', 280000)
) AS s(ordinal, label, time_ms);

-- 40 bans cycling all appeal states (runners with few Bulk Demo Any% times).
INSERT INTO bans (id, runner_id, moderator_id, comment, appeal_state)
SELECT
  ('00000000-0000-4000-b600-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  CASE
    WHEN i % 2 = 0 THEN '00000000-0000-4000-a200-000000000001'::uuid
    ELSE ('00000000-0000-4000-b200-' || lpad((1 + (i % 24))::text, 12, '0'))::uuid
  END,
  'bulk seed ban ' || i,
  (ARRAY['not_appealed', 'pending', 'rejected', 'approved']::appeal_state[])[1 + ((i - 7960) % 4)]
FROM generate_series(7960, 7999) AS s(i);

INSERT INTO review_events (id, runner_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b710-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  CASE
    WHEN i % 2 = 0 THEN '00000000-0000-4000-a200-000000000001'::uuid
    ELSE ('00000000-0000-4000-b200-' || lpad((1 + (i % 24))::text, 12, '0'))::uuid
  END,
  'ban',
  jsonb_build_object('comment', 'bulk seed ban ' || i)
FROM generate_series(7960, 7999) AS s(i);

INSERT INTO review_events (id, runner_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b711-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  '00000000-0000-4000-a200-000000000001',
  'appeal_submit',
  '{}'::jsonb
FROM generate_series(7960, 7999) AS s(i)
WHERE ((i - 7960) % 4) <> 0;

INSERT INTO review_events (id, runner_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b712-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  '00000000-0000-4000-a200-000000000001',
  'appeal_reject',
  jsonb_build_object('comment', 'bulk appeal rejected')
FROM generate_series(7960, 7999) AS s(i)
WHERE ((i - 7960) % 4) = 2;

INSERT INTO review_events (id, runner_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b713-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  '00000000-0000-4000-a200-000000000001',
  'appeal_approve',
  '{}'::jsonb
FROM generate_series(7960, 7999) AS s(i)
WHERE ((i - 7960) % 4) = 3;

INSERT INTO review_events (id, runner_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b713-' || lpad((i + 100)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b300-' || lpad(i::text, 12, '0'))::uuid,
  '00000000-0000-4000-a200-000000000001',
  'unban',
  jsonb_build_object('comment', 'bulk appeal approved')
FROM generate_series(7960, 7999) AS s(i)
WHERE ((i - 7960) % 4) = 3;

INSERT INTO review_events (id, run_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b720-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b500-' || lpad(i::text, 12, '0'))::uuid,
  '00000000-0000-4000-a200-000000000001',
  'approve',
  '{}'::jsonb
FROM generate_series(1, 12) AS s(i);

INSERT INTO review_events (id, run_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b721-' || lpad(i::text, 12, '0'))::uuid,
  ('00000000-0000-4000-b500-' || lpad(i::text, 12, '0'))::uuid,
  '00000000-0000-4000-a200-000000000001',
  'reject',
  jsonb_build_object(
    'reason',
    (ARRAY[
      'invalid_proof',
      'time_mismatch',
      'wrong_category',
      'illegal_play',
      'timing_method',
      'duplicate',
      'suspicious',
      'other'
    ])[1 + ((i - 13301) % 8)],
    'comment',
    'bulk reject ' || i
  )
FROM generate_series(13301, 13320) AS s(i);

INSERT INTO review_events (id, category_id, moderator_id, action, payload)
SELECT
  ('00000000-0000-4000-b730-' || lpad(i::text, 12, '0'))::uuid,
  c.id,
  '00000000-0000-4000-a200-000000000001',
  'set_default_category',
  jsonb_build_object('categoryId', c.id)
FROM generate_series(1, 8) AS s(i)
JOIN categories c
  ON c.game_id = ('00000000-0000-4000-b000-' || lpad(i::text, 12, '0'))::uuid
 AND c.slug = 'any';

COMMIT;
