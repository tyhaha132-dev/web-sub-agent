-- Active web time: so giay hoat dong that tren web theo user + ngay (heartbeat).
CREATE TABLE IF NOT EXISTS study_activity (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
