-- TOEIC mock exam bank: fixed exam forms (de thi thu) composed from the bank.
-- Detail order = array order. Time in minutes.

CREATE TABLE IF NOT EXISTS toeic_exams (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  time_min INTEGER NOT NULL DEFAULT 45,
  question_ids JSONB NOT NULL DEFAULT '[]'
);

INSERT INTO toeic_exams (code, title, time_min, question_ids) VALUES
('DE-01', 'Đề thi thử 01 — 54 câu / 45 phút', 45,
 '[101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,1,2,3,4,5,6,7,8,9,10,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47]'),
('DE-02', 'Đề thi thử 02 — 54 câu / 45 phút', 45,
 '[270,271,272,273,274,280,281,282,283,284,285,286,287,288,289,300,301,302,303,304,305,312,313,314,315,316,317,200,201,202,203,204,205,206,207,208,209,240,241,242,243,244,245,246,247,250,251,252,253,254,255,256,257,258]')
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, time_min = EXCLUDED.time_min, question_ids = EXCLUDED.question_ids;
