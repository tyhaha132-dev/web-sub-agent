-- Fix ambiguous options found in bank audit (2026-09-25):
-- Q7: "were you to need" is also valid inversion -> replace "were" with "are".
-- Q232: both "whether" and "if" are valid -> replace "if" with "and".

UPDATE toeic_questions
SET choices = '["should", "would", "had", "are"]'
WHERE id = 7;

UPDATE toeic_questions
SET choices = '["whether", "so", "and", "that"]'
WHERE id = 232;
