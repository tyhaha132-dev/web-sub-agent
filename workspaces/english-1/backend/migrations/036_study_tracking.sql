-- Study tracking: loai hoat dong + thoi gian hoc moi luot (phut/ngay + bang xep hang).
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'quiz';
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS duration_sec INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_quiz_user_created ON quiz_results(user_id, created_at);
