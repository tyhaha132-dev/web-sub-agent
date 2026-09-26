'use client';

import { useState } from 'react';
import {
  fetchToeicReading,
  formatPassage,
  getClientId,
  submitToeic,
  type ToeicDetail,
  type ToeicQuestion,
  type ToeicResult,
} from '../../lib/toeic';

interface Props {
  kind: 'practice';
  count: number;
  part: 5 | 6 | 7;
  tag?: string;
  title: string;
  intro: string;
}

export default function ToeicPractice({ kind, count, part, tag = '', title, intro }: Props) {
  const [questions, setQuestions] = useState<ToeicQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ id: number; choice: number }>>([]);
  const [result, setResult] = useState<ToeicResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [t0, setT0] = useState(0);

  async function start() {
    setLoading(true); setError(''); setResult(null);
    try {
      const q = await fetchToeicReading(count, part, tag);
      if (q.length === 0) throw new Error('empty');
      setQuestions(q); setCurrent(0); setPicked(null); setAnswers([]);
      setT0(Date.now());
    } catch {
      setError('😢 Không tải được đề (backend chưa chạy?). Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  function choose(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    const q = questions[current];
    if (q) setAnswers((a) => [...a, { id: q.id, choice: idx }]);
  }

  async function next() {
    if (current + 1 >= questions.length) {
      if (submitting) return;
      setSubmitting(true);
      try {
        const r = await submitToeic(answers, kind, `reading-p${part}`, {
          client_id: getClientId(),
          duration_s: Math.max(0, Math.round((Date.now() - t0) / 1000)),
        });
        setResult(r);
      } catch {
        setError('😢 Không chấm được bài (backend chưa chạy?).');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setCurrent((c) => c + 1);
    setPicked(null);
  }

  if (result) {
    const rate = result.total === 0 ? 0 : result.score / result.total;
    const emoji = rate >= 0.8 ? '🏆 Xuất sắc!' : rate >= 0.5 ? '💪 Khá lắm!' : '📚 Cố lên nào!';
    return (
      <main>
        <div className="score-banner">{emoji}<br />{result.score}/{result.total}</div>
        <div className="panel" style={{ marginTop: 12 }}>
          <p>🎯 Trình độ ước tính: <b>{result.estimate}</b> ({result.band.level} {result.band.min}–{result.band.max})</p>
          <p>📌 Trọng tâm: {result.band.focus}</p>
        </div>
        <h2>📝 Xem lại từng câu</h2>
        {result.details.map((d: ToeicDetail, i: number) => {
          const q = questions.find((x) => x.id === d.id);
          return (
            <div key={d.id} className="panel" style={{ marginTop: 8 }}>
              {q?.passage && (
                <p style={{ whiteSpace: 'pre-line', fontSize: '0.9em' }}>{formatPassage(q.passage)}</p>
              )}
              <p><b>Câu {i + 1}:</b> {q?.prompt ?? ''}</p>
              <p>{d.correct ? '✅ Đúng' : `❌ Sai — đáp án: ${q?.choices[d.answer] ?? ''}`}</p>
              <p>💡 {d.explanation} <i>(#{d.grammar_tag})</i></p>
            </div>
          );
        })}
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={start}>🔁 Làm đề mới</button>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main>
        <h1>{title}</h1>
        <div className="panel">
          <p>{intro}</p>
          <button className="btn btn-primary" onClick={start} disabled={loading}>
            {loading ? '⏳ Đang tải đề...' : '🚀 Bắt đầu'}
          </button>
          {error && <p>{error}</p>}
        </div>
      </main>
    );
  }

  const q = questions[current] as ToeicQuestion;
  return (
    <main>
      <h1>Câu {current + 1}/{questions.length}</h1>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        {q.passage && (
          <div className="panel" style={{ whiteSpace: 'pre-line', marginBottom: 12, background: 'var(--card-alt, #f6f4ff)' }}>
            {formatPassage(q.passage)}
          </div>
        )}
        <p><b>{q.prompt}</b></p>
        {q.choices.map((c, idx) => (
          <button
            key={idx}
            className="choice-btn"
            onClick={() => choose(idx)}
            disabled={picked !== null}
          >
            {picked === null ? `🔹 ${String.fromCharCode(65 + idx)}. ${c}` : `${picked === idx ? '👉 ' : ''}${String.fromCharCode(65 + idx)}. ${c}`}
          </button>
        ))}
        {picked !== null && (
          <button className="btn btn-primary" onClick={next} disabled={submitting} style={{ marginTop: 12 }}>
            {current + 1 >= questions.length ? (submitting ? '⏳ Đang chấm...' : 'Xem kết quả ✅') : 'Tiếp →'}
          </button>
        )}
      </div>
    </main>
  );
}
