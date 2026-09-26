-- Attempt metadata for dashboard v2 + error log: which part/tag the attempt
-- covered, and the wrong answers (with explanations) as JSONB.

ALTER TABLE toeic_attempts ADD COLUMN IF NOT EXISTS meta TEXT NOT NULL DEFAULT '';
ALTER TABLE toeic_attempts ADD COLUMN IF NOT EXISTS errors JSONB NOT NULL DEFAULT '[]';
