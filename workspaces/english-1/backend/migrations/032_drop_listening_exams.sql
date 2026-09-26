-- Drop Listening + fixed exam bank: keep Reading only with real exam counts
-- (Part 5 = 30, Part 6 = 16, Part 7 = 54).

DELETE FROM toeic_questions WHERE section = 'listening';
DROP TABLE IF EXISTS toeic_exams;
