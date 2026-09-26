-- Part 1 photo scenes: emoji "photo" frame (real photos need an asset pipeline).

ALTER TABLE toeic_questions ADD COLUMN IF NOT EXISTS image TEXT;

UPDATE toeic_questions SET image = '👥📊' WHERE id = 101;
UPDATE toeic_questions SET image = '👩‍💻' WHERE id = 102;
UPDATE toeic_questions SET image = '🧳✈️' WHERE id = 103;
UPDATE toeic_questions SET image = '📦🚚' WHERE id = 104;
UPDATE toeic_questions SET image = '📞👨‍💼' WHERE id = 105;
UPDATE toeic_questions SET image = '👨‍🍳🔪' WHERE id = 270;
UPDATE toeic_questions SET image = '🤝🏢' WHERE id = 271;
UPDATE toeic_questions SET image = '✈️🌅' WHERE id = 272;
UPDATE toeic_questions SET image = '🛒🧾' WHERE id = 273;
UPDATE toeic_questions SET image = '👷⚙️' WHERE id = 274;
UPDATE toeic_questions SET image = '🚌🧍' WHERE id = 275;
UPDATE toeic_questions SET image = '🗂️👩‍💼' WHERE id = 276;
UPDATE toeic_questions SET image = '🚚🏭' WHERE id = 277;
UPDATE toeic_questions SET image = '🎤👥' WHERE id = 278;
UPDATE toeic_questions SET image = '📸🗼' WHERE id = 279;
