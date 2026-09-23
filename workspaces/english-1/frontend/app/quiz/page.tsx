'use client';

import { useState } from 'react';
import { fetchQuiz, saveProgress, type QuizQuestion } from '../../lib/api';

export default function Quiz() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true); setError('');
    try {
      const q = await fetchQuiz(10);
      setQuestions(q); setCurrent(0); setScore(0); setDone(false); setPicked(null);
    } catch {
      setError('😢 Không tải được đề (backend chưa chạy?). Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  function choose(choice: string) {
    if (picked !== null) return;
    setPicked(choice);
    if (questions[current]?.answer === choice) setScore((s) => s + 1);
  }

  async function next() {
    if (current + 1 >= questions.length) {
      setDone(true);
      try { await saveProgress(score, questions.length); } catch { /* backend chưa chạy */ }
      return;
    }
    setCurrent((c) => c + 1);
    setPicked(null);
  }

  if (questions.length === 0 && !done) {
    return (
      <main>
        <h1>🏆 Quiz trắc nghiệm</h1>
        <div className="panel">
          <p>10 câu ngẫu nhiên từ ngân hàng từ vựng — đúng càng nhiều, sao càng to! ⭐</p>
          <button className="btn btn-primary" onClick={start} disabled={loading}>
            {loading ? '⏳ Đang tải đề...' : '🚀 Bắt đầu ngay'}
          </button>
          {error && <p>{error}</p>}
        </div>
      </main>
    );
  }
  if (done) {
    const rate = questions.length === 0 ? 0 : score / questions.length;
    const emoji = rate >= 0.8 ? '🏆 Tuyệt vời!' : rate >= 0.5 ? '💪 Khá lắm!' : '📚 Cố lên nào!';
    return (
      <main>
        <div className="score-banner">{emoji}<br />{score}/{questions.length}</div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={start}>🔁 Làm lại</button>
        </div>
      </main>
    );
  }
  const q = questions[current] as QuizQuestion;
  return (
    <main>
      <h1>Câu {current + 1}/{questions.length}: “{q.en}” nghĩa là gì?</h1>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
      <p>⭐ Điểm hiện tại: {score}</p>
      {q.choices.map((c) => {
        let cls = 'choice-btn';
        if (picked !== null) {
          if (c === q.answer) cls += ' correct';
          else if (c === picked) cls += ' wrong';
        }
        return (
          <button key={c} className={cls} onClick={() => choose(c)} disabled={picked !== null}>
            {picked !== null && c === q.answer ? '✅ ' : picked !== null && c === picked ? '❌ ' : '🔹 '}{c}
          </button>
        );
      })}
      {picked !== null && <button className="btn btn-primary" onClick={next} style={{ marginTop: 12 }}>Tiếp →</button>}
    </main>
  );
}
