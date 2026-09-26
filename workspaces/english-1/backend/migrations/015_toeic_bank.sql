-- TOEIC practice bank (Phase 1.1/1.2 slice): Part 5 Incomplete Sentences + attempts.
-- No user accounts in this app: attempts are anonymous, like quiz_results.

CREATE TABLE IF NOT EXISTS toeic_questions (
  id INTEGER PRIMARY KEY,
  part INTEGER NOT NULL DEFAULT 5,
  section TEXT NOT NULL DEFAULT 'reading',
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL,
  answer INTEGER NOT NULL CHECK (answer BETWEEN 0 AND 3),
  explanation TEXT NOT NULL DEFAULT '',
  grammar_tag TEXT NOT NULL DEFAULT 'vocabulary',
  topic TEXT NOT NULL DEFAULT 'business'
);

CREATE TABLE IF NOT EXISTS toeic_attempts (
  id SERIAL PRIMARY KEY,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'practice',
  band TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO toeic_questions (id, part, section, prompt, choices, answer, explanation, grammar_tag, topic) VALUES
(1, 5, 'reading', 'The meeting has been ___ until next Monday due to the manager''s business trip.', '["postponed", "canceled", "held", "attended"]', 0, 'Postpone (hoãn lại) là từ đúng khi dời lịch họp sang thời gian khác.', 'vocabulary', 'meetings'),
(2, 5, 'reading', 'All employees must submit their expense reports ___ the end of this month.', '["by", "at", "in", "for"]', 0, '"By + mốc thời gian" nghĩa là chậm nhất vào lúc đó — đúng với deadline.', 'prepositions', 'finance'),
(3, 5, 'reading', 'Ms. Lan, who has worked here ___ 2019, was promoted to sales director.', '["since", "for", "from", "during"]', 0, '"Since + mốc thời gian cụ thể" (2019), còn "for" đi với khoảng thời gian.', 'prepositions', 'hr'),
(4, 5, 'reading', 'The new marketing strategy ___ by the board yesterday.', '["was approved", "approved", "has approved", "approves"]', 0, 'Câu bị động quá khứ: chủ ngữ (strategy) nhận hành động + mốc "yesterday".', 'passive', 'marketing'),
(5, 5, 'reading', 'If the shipment ___ on time, we will lose an important client.', '["doesn''t arrive", "won''t arrive", "didn''t arrive", "hasn''t arrived"]', 0, 'Câu điều kiện loại 1: If + hiện tại đơn, mệnh đề chính dùng will.', 'conditionals', 'logistics'),
(6, 5, 'reading', 'The company offers a ___ salary and excellent benefits.', '["competitive", "compete", "competition", "competitively"]', 0, 'Cần tính từ bổ nghĩa cho danh từ "salary" → competitive (cạnh tranh).', 'word-forms', 'hr'),
(7, 5, 'reading', 'Please contact our support team ___ you need further assistance.', '["should", "would", "had", "were"]', 0, 'Đảo ngữ điều kiện loại 1: "Should you need..." = "If you need...".', 'conditionals', 'support'),
(8, 5, 'reading', 'The annual financial report will be ___ to all shareholders next week.', '["distributed", "distribution", "distribute", "distributing"]', 0, 'Bị động tương lai "will be + V3" → distributed (phân phối).', 'passive', 'finance'),
(9, 5, 'reading', 'Neither the director nor the managers ___ aware of the system error.', '["were", "was", "is", "are"]', 0, 'Cấu trúc "neither...nor" chia động từ theo chủ ngữ gần nhất (managers → were).', 'agreement', 'it'),
(10, 5, 'reading', 'The project was completed on schedule ___ several unexpected delays.', '["despite", "unless", "without", "besides"]', 0, '"Despite + cụm danh từ" diễn tả sự tương phản (mặc dù trễ vẫn xong đúng hạn).', 'conjunctions', 'general'),
(11, 5, 'reading', 'She is responsible ___ training new staff.', '["for", "of", "to", "with"]', 0, 'Cụm cố định: "be responsible for + V-ing" (chịu trách nhiệm về...).', 'prepositions', 'hr'),
(12, 5, 'reading', 'The CEO requested that all departments ___ their budgets by Friday.', '["submit", "submitted", "submits", "will submit"]', 0, 'Thể giả định sau "request that": động từ nguyên mẫu không "to".', 'subjunctive', 'finance'),
(13, 5, 'reading', 'Sales have increased ___ 20% compared to last quarter.', '["by", "to", "with", "at"]', 0, '"Increase by + số %" diễn tả mức tăng; "increase to" là tăng đến mốc nào.', 'prepositions', 'sales'),
(14, 5, 'reading', 'This laptop is designed ___ business travelers.', '["for", "to", "with", "by"]', 0, '"Designed for + đối tượng" (thiết kế dành cho...).', 'prepositions', 'travel'),
(15, 5, 'reading', 'He has been working as an accountant ___ more than ten years.', '["for", "since", "during", "from"]', 0, '"For + khoảng thời gian" (more than ten years).', 'prepositions', 'hr'),
(16, 5, 'reading', 'The contract ___ signed by both parties last week.', '["was", "is", "has", "will"]', 0, 'Bị động quá khứ với mốc "last week" → was signed.', 'passive', 'contracts'),
(17, 5, 'reading', 'Customers complained ___ the poor quality of after-sales service.', '["about", "to", "with", "for"]', 0, 'Cụm cố định: "complain about + vấn đề" (phàn nàn về...).', 'prepositions', 'support'),
(18, 5, 'reading', '___ the high demand, the company decided to expand production.', '["Due to", "Despite", "Unless", "Without"]', 0, '"Due to + nguyên nhân" (do nhu cầu cao); "despite" mang nghĩa trái ngược.', 'conjunctions', 'manufacturing'),
(19, 5, 'reading', 'Our products are known ___ their durability.', '["for", "as", "to", "with"]', 0, 'Cụm cố định: "be known for + đặc điểm" (nổi tiếng về...).', 'prepositions', 'marketing'),
(20, 5, 'reading', 'She speaks English ___ fluently that she handles all foreign clients.', '["so", "such", "very", "too"]', 0, 'Cấu trúc "so + adv + that" (quá... đến nỗi mà...).', 'conjunctions', 'general'),
(21, 5, 'reading', 'The more you practice presentations, ___ confident you become.', '["the", "a", "an", "—"]', 0, 'So sánh kép: "The more..., the more..." (càng... càng...).', 'comparatives', 'general'),
(22, 5, 'reading', 'He apologized ___ arriving late to the negotiation.', '["for", "of", "to", "about"]', 0, '"Apologize for + V-ing" (xin lỗi vì đã...).', 'prepositions', 'meetings'),
(23, 5, 'reading', 'The new policy takes ___ next month.', '["effect", "affect", "effective", "effectively"]', 0, 'Cụm cố định: "take effect" (có hiệu lực).', 'vocabulary', 'general'),
(24, 5, 'reading', 'We look forward to ___ from you soon.', '["hearing", "hear", "heard", "hears"]', 0, '"Look forward to + V-ing" (mong nhận được...).', 'gerunds', 'emails'),
(25, 5, 'reading', 'The IT department will ___ the new software across all branches.', '["install", "installment", "installation", "installed"]', 0, 'Sau "will" dùng động từ nguyên mẫu → install (cài đặt).', 'word-forms', 'it'),
(26, 5, 'reading', '___ Mr. Brown is on leave, Ms. Green handles his clients.', '["Since", "Despite", "Unless", "Without"]', 0, '"Since" ở đây nghĩa là "vì" (lý do nghỉ phép → đồng nghiệp thay thế).', 'conjunctions', 'office'),
(27, 5, 'reading', 'The proposal was rejected because it lacked ___ data.', '["sufficient", "suffice", "sufficiently", "suffered"]', 0, 'Cần tính từ bổ nghĩa "data" → sufficient (đầy đủ).', 'word-forms', 'general'),
(28, 5, 'reading', 'Employees ___ work overtime will receive extra pay.', '["who", "which", "whose", "whom"]', 0, 'Mệnh đề quan hệ chỉ người làm chủ ngữ → who.', 'relative-clauses', 'hr'),
(29, 5, 'reading', 'The company invested heavily ___ employee training this year.', '["in", "on", "to", "for"]', 0, 'Cụm cố định: "invest in + lĩnh vực" (đầu tư vào...).', 'prepositions', 'finance'),
(30, 5, 'reading', 'By the time the meeting started, the report ___ already.', '["had been sent", "has been sent", "was send", "sent"]', 0, 'Quá khứ hoàn thành bị động: hành động xong trước một mốc quá khứ khác.', 'tenses', 'meetings')
ON CONFLICT (id) DO NOTHING;
