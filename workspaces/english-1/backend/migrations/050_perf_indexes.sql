-- Index cho duong nong: auth moi request, loc words theo topic, cau hoi theo part.
-- Idempotent (IF NOT EXISTS), chay lai an toan.

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_words_topic ON words(topic);
CREATE INDEX IF NOT EXISTS idx_toeic_part ON toeic_questions(part);
