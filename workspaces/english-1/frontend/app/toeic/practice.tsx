'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchToeicReading,
  formatPassage,
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
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('all');

  // Khởi tạo thời gian làm bài chuẩn (Part 5: 20p, Part 6: 16p, Part 7: 54p)
  const defaultSeconds = part === 5 ? 20 * 60 : part === 6 ? 16 * 60 : 54 * 60;

  useEffect(() => {
    if (questions.length === 0 || result !== null) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [questions.length, result]);

  async function start() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const q = await fetchToeicReading(count, part, tag);
      if (q.length === 0) throw new Error('empty');
      setQuestions(q);
      setCurrent(0);
      setPicked(null);
      setAnswers([]);
      setT0(Date.now());
      setSecondsLeft(defaultSeconds);
    } catch {
      setError('😢 Không tải được đề thi (backend chưa chạy?). Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  function choose(idx: number) {
    const q = questions[current];
    if (!q) return;
    setPicked(idx);
    setAnswers((a) => {
      const rest = a.filter((x) => x.id !== q.id);
      return [...rest, { id: q.id, choice: idx }];
    });
  }

  async function finish() {
    if (submitting || answers.length === 0) return;
    const ok = window.confirm(
      `Bạn đã trả lời ${answers.length}/${questions.length} câu hỏi. Bạn có chắc chắn muốn nộp bài?`,
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const r = await submitToeic(answers, kind, `reading-p${part}`, {
        duration_s: Math.max(0, Math.round((Date.now() - t0) / 1000)),
        expected_total: questions.length,
      });
      setResult(r);
    } catch {
      setError('😢 Không chấm được bài thi (backend chưa chạy?).');
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    if (current + 1 >= questions.length) {
      await finish();
      return;
    }
    setCurrent((c) => c + 1);
    const nq = questions[current + 1];
    const prev = nq ? answers.find((x) => x.id === nq.id)?.choice ?? null : null;
    setPicked(prev);
  }

  function prevQuestion() {
    if (current <= 0) return;
    setCurrent((c) => c - 1);
    const prevQ = questions[current - 1];
    const prev = prevQ ? answers.find((x) => x.id === prevQ.id)?.choice ?? null : null;
    setPicked(prev);
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Màn hình xem kết quả sau khi nộp bài
  if (result) {
    const rate = result.total === 0 ? 0 : Math.round((result.score / result.total) * 100);
    const emoji = rate >= 80 ? '🏆 Xuất sắc!' : rate >= 50 ? '💪 Khá lắm!' : '📚 Cố lên nào!';
    const answered = Math.min(result.total, result.answered ?? result.details.length);
    const skipped = Math.max(0, result.total - answered);
    const wrongCount = result.details.filter((d) => !d.correct).length;

    const filteredDetails = reviewFilter === 'wrong'
      ? result.details.filter((d) => !d.correct)
      : result.details;

    return (
      <main className="page" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 64 }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/toeic" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
            ← Quay lại TOEIC
          </Link>
          <span style={{ color: 'var(--muted)', margin: '0 8px', fontSize: 13 }}>/</span>
          <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>KẾT QUẢ BÀI THI</span>
        </div>

        <div className="score-banner" style={{ margin: '0 auto 20px', textAlign: 'center' }}>
          {emoji}<br />
          {result.score} / {result.total} ({rate}%)
        </div>

        {skipped > 0 && (
          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: 12,
              padding: '12px 18px',
              color: '#92400e',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            📝 Bạn đã làm <b>{answered}/{result.total} câu</b> — bỏ qua <b>{skipped} câu</b> (tính 0 điểm).
          </div>
        )}

        {/* Trình độ ước tính Card */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-soft)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 24,
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                ĐÁNH GIÁ NĂNG LỰC
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--heading)', marginTop: 4 }}>
                Band {result.band.level} ({result.band.min}–{result.band.max} điểm)
              </div>
            </div>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Ước tính: {result.estimate}
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '12px 0 0' }}>
            🎯 <b>Trọng tâm cải thiện:</b> {result.band.focus}
          </p>
        </div>

        {/* Review Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            📝 Chi tiết lời giải bài thi
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setReviewFilter('all')}
              className={`topic-chip ${reviewFilter === 'all' ? 'active' : ''}`}
            >
              Tất cả câu ({result.details.length})
            </button>
            <button
              onClick={() => setReviewFilter('wrong')}
              className={`topic-chip ${reviewFilter === 'wrong' ? 'active' : ''}`}
            >
              Chỉ câu sai ({wrongCount})
            </button>
          </div>
        </div>

        {filteredDetails.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            🎉 Không có câu hỏi nào trong mục này. Tuyệt vời!
          </div>
        )}

        {/* List of answers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredDetails.map((d: ToeicDetail, i: number) => {
            const q = questions.find((x) => x.id === d.id);
            return (
              <div
                key={d.id}
                style={{
                  background: 'var(--panel)',
                  border: `1px solid ${d.correct ? 'var(--border-soft)' : '#fca5a5'}`,
                  borderRadius: 16,
                  padding: '20px 24px',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {q?.passage && (
                  <div
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--ex-text)',
                      background: 'var(--bg)',
                      padding: '14px 18px',
                      borderRadius: 10,
                      marginBottom: 14,
                      border: '1px solid var(--border-soft)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {formatPassage(q.passage)}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--heading)' }}>
                    Câu {i + 1}: {q?.prompt ?? ''}
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 700,
                      background: d.correct ? '#ecfdf5' : '#fef2f2',
                      color: d.correct ? '#059669' : '#dc2626',
                      border: `1px solid ${d.correct ? '#a7f3d0' : '#fecaca'}`,
                      flexShrink: 0,
                    }}
                  >
                    {d.correct ? '✓ Đúng' : '✗ Chưa đúng'}
                  </span>
                </div>

                {!d.correct && (
                  <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 600, margin: '6px 0' }}>
                    Đáp án đúng: {q?.choices[d.answer] ?? ''}
                  </div>
                )}

                <div
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: 'var(--ink)',
                    marginTop: 10,
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>💡 Lời giải song ngữ: </span>
                  {d.explanation}
                  {d.grammar_tag && (
                    <span style={{ color: 'var(--muted)', marginLeft: 8, fontStyle: 'italic' }}>
                      (#{d.grammar_tag})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={start}
            style={{
              padding: '12px 28px',
              borderRadius: 9999,
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            🔁 Làm đề thi mới
          </button>
          <Link
            href="/toeic"
            style={{
              padding: '12px 24px',
              borderRadius: 9999,
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              border: '1px solid var(--border-soft)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            ← Về trung tâm TOEIC
          </Link>
        </div>
      </main>
    );
  }

  // Màn hình chờ bắt đầu
  if (questions.length === 0) {
    return (
      <main className="page" style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/toeic" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
            ← Quay lại TOEIC
          </Link>
        </div>

        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-soft)',
            borderRadius: 24,
            padding: '40px 32px',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 14 }}>⏱️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px' }}>{title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 540, margin: '0 auto 28px', lineHeight: 1.6 }}>
            {intro}
          </p>

          <div
            style={{
              display: 'inline-flex',
              gap: 16,
              background: 'var(--surface-2)',
              padding: '10px 20px',
              borderRadius: 9999,
              marginBottom: 28,
              fontSize: 14,
              color: 'var(--ink)',
              fontWeight: 500,
            }}
          >
            <span>📝 Số lượng: <b>{count} câu hỏi</b></span>
            <span>•</span>
            <span>⏳ Thời gian đề xuất: <b>{Math.round(defaultSeconds / 60)} phút</b></span>
          </div>

          <div>
            <button
              onClick={start}
              disabled={loading}
              style={{
                padding: '13px 36px',
                borderRadius: 9999,
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
              }}
            >
              {loading ? '⏳ Đang tải đề...' : '✨ Bắt đầu làm bài thi ngay'}
            </button>
          </div>

          {error && (
            <div className="account-alert-banner error" style={{ marginTop: 20 }}>
              {error}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Màn hình làm bài thi (CBT 2 Columns nếu có bài đọc passage)
  const q = questions[current] as ToeicQuestion;
  const hasPassage = Boolean(q.passage);

  return (
    <main className="page" style={{ maxWidth: hasPassage ? 1240 : 840, margin: '0 auto', paddingBottom: 64 }}>
      {/* Top Bar: Progress, Timer, Câu hỏi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/toeic" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
            ← Rời bài thi
          </Link>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)' }}>
            Câu hỏi {current + 1} / {questions.length}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            (Đã làm {answers.length}/{questions.length})
          </span>
        </div>

        <div className={`toeic-timer-badge ${secondsLeft < 180 ? 'warning' : ''}`}>
          <span>⏱️</span>
          <span>{formatTimer(secondsLeft)}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="progress-track" style={{ height: 6, marginBottom: 20 }}>
        <div
          className="progress-fill"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Layout thi: 2 cột CBT nếu có passage, 1 cột nếu không có */}
      {hasPassage ? (
        <div className="toeic-cbt-container">
          {/* Cột trái: Bài đọc Passage cuộn độc lập */}
          <div className="toeic-passage-pane">
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              📄 ĐOẠN VĂN ĐỌC HIỂU (PASSAGE)
            </div>
            <div className="toeic-passage-text">
              {formatPassage(q.passage ?? '')}
            </div>
          </div>

          {/* Cột phải: Câu hỏi và Lựa chọn */}
          <div className="toeic-question-pane">
            <div style={{ fontSize: 13, color: '#0284c7', fontWeight: 700, marginBottom: 6 }}>
              CÂU {current + 1}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, margin: '0 0 18px', color: 'var(--heading)' }}>
              {q.prompt}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.choices.map((c, idx) => (
                <button
                  key={idx}
                  className={`choice-btn ${picked === idx ? 'correct' : ''}`}
                  onClick={() => choose(idx)}
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderColor: picked === idx ? '#38bdf8' : undefined,
                  }}
                >
                  <span className="choice-badge">{String.fromCharCode(65 + idx)}</span>
                  <span style={{ flex: 1, fontSize: 15 }}>{c}</span>
                </button>
              ))}
            </div>

            {/* Actions Bottom */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={prevQuestion}
                disabled={current === 0}
                style={{
                  padding: '9px 16px',
                  borderRadius: 9999,
                  background: 'transparent',
                  border: '1px solid var(--border-soft)',
                  color: current === 0 ? 'var(--muted)' : 'var(--ink)',
                  cursor: current === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: current === 0 ? 0.5 : 1,
                }}
              >
                ‹ Câu trước
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={finish}
                  disabled={submitting || answers.length === 0}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 9999,
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-soft)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? '⏳ Đang nộp...' : `📝 Nộp bài (${answers.length}/${questions.length})`}
                </button>

                <button
                  onClick={next}
                  disabled={submitting}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 9999,
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {current + 1 >= questions.length ? (submitting ? '⏳ Đang chấm...' : 'Xem kết quả ✅') : 'Câu tiếp ›'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Layout 1 cột cho Part 5 (Câu đơn không có passage) */
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-soft)',
            borderRadius: 20,
            padding: '32px',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ fontSize: 13, color: '#0284c7', fontWeight: 700, marginBottom: 8 }}>
            PART 5 — INCOMPLETE SENTENCES
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, margin: '0 0 24px', color: 'var(--heading)' }}>
            {q.prompt}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {q.choices.map((c, idx) => (
              <button
                key={idx}
                className={`choice-btn ${picked === idx ? 'correct' : ''}`}
                onClick={() => choose(idx)}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderColor: picked === idx ? '#38bdf8' : undefined,
                }}
              >
                <span className="choice-badge">{String.fromCharCode(65 + idx)}</span>
                <span style={{ flex: 1, fontSize: 15 }}>{c}</span>
              </button>
            ))}
          </div>

          {/* Actions Bottom */}
          <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <button
              onClick={prevQuestion}
              disabled={current === 0}
              style={{
                padding: '9px 16px',
                borderRadius: 9999,
                background: 'transparent',
                border: '1px solid var(--border-soft)',
                color: current === 0 ? 'var(--muted)' : 'var(--ink)',
                cursor: current === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                opacity: current === 0 ? 0.5 : 1,
              }}
            >
              ‹ Câu trước
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={finish}
                disabled={submitting || answers.length === 0}
                style={{
                  padding: '9px 18px',
                  borderRadius: 9999,
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                  border: '1px solid var(--border-soft)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {submitting ? '⏳ Đang nộp...' : `📝 Nộp bài (${answers.length}/${questions.length})`}
              </button>

              <button
                onClick={next}
                disabled={submitting}
                style={{
                  padding: '9px 22px',
                  borderRadius: 9999,
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {current + 1 >= questions.length ? (submitting ? '⏳ Đang chấm...' : 'Xem kết quả ✅') : 'Câu tiếp ›'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
