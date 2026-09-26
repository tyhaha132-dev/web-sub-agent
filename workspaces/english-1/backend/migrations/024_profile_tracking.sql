-- Device profiles (anonymous IDs, no passwords) + attempt tracking columns
-- for streak and time-per-question stats.

CREATE TABLE IF NOT EXISTS user_toeic_profile (
  client_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  target_score INTEGER NOT NULL DEFAULT 700,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE toeic_attempts ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT '';
ALTER TABLE toeic_attempts ADD COLUMN IF NOT EXISTS duration_s INTEGER NOT NULL DEFAULT 0;
