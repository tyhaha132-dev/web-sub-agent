'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchQuiz,
  fetchTopics,
  getCachedTopics,
  saveProgress,
  speak,
  studySeconds,
  type QuizQuestion,
  type Topic,
} from '../../lib/api';
import EnglishIllustration from '../english-illustration';

const PER_Q_SECONDS = 20;

function formatIpa(ipa?: string): string {
  if (!ipa) return '';
  const clean = ipa.trim();
  if (clean.startsWith('/') && clean.endsWith('/')) return clean;
  return `/${clean}/`;
}

type Phase = 'setup' | 'playing' | 'done';

export default function Quiz() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [count, setCount] = useState<number>(10);
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState<number>(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [left, setLeft] = useState<number>(PER_Q_SECONDS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const startRef = useRef<number>(0);
  const savedRef = useRef<boolean>(false);

  // Load danh sách chuyên đề
  useEffect(() => {
    const cached = getCachedTopics();
    if (cached.length > 0) setTopics(cached);
    fetchTopics()
      .then((t) => {
        if (t && t.length > 0) setTopics(t);
      })
      .catch(() => {});
  }, []);

  // Đếm ngược 20s mỗi câu hỏi
  useEffect(() => {
    if (phase !== 'playing' || picked !== null) return;
    if (left <= 0) {
      setPicked('__timeout__');
      return;
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, picked, left]);

  // Bắt đầu làm bài
  async function start() {
    setLoading(true);
    setError('');
    try {
      const q = await fetchQuiz(count, selectedTopic);
      if (!q || q.length === 0) {
        setError('Chuyên đề này chưa đủ câu hỏi để tạo Quiz (cần ≥4 từ).');
        return;
      }
      setQuestions(q);
      setIdx(0);
      setPicked(null);
      setScore(0);
      setLeft(PER_Q_SECONDS);
      startRef.current = Date.now();
      savedRef.current = false;
      setPhase('playing');
    } catch {
      setError('😢 Không thể tải đề thi từ máy chủ. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setLoading(false);
    }
  }

  // Chọn đáp án
  const answer = useCallback(
    (choice: string) => {
      if (picked !== null || !questions[idx]) return;
      const q = questions[idx];
      setPicked(choice);
      if (choice === q.answer) {
        setScore((s) => s + 1);
      }
    },
    [picked, questions, idx]
  );

  // Chuyển câu tiếp theo hoặc hoàn thành
  const next = useCallback(() => {
    if (idx + 1 >= questions.length) {
      finish();
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
    setLeft(PER_Q_SECONDS);
  }, [idx, questions.length]);

  // Hoàn thành bài thi và lưu tiến độ
  function finish() {
    if (!savedRef.current) {
      savedRef.current = true;
      const secs = studySeconds(startRef.current);
      void saveProgress(score, questions.length, 'quiz', secs).catch(() => {});
    }
    setPhase('done');
  }

  const q = questions[idx];

  // Phím tắt bàn phím: 1-4 hoặc A-D chọn đáp án, Enter chuyển câu, P phát âm
  useEffect(() => {
    if (phase !== 'playing') return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const key = e.key.toUpperCase();
      if (picked === null && q) {
        if (key === '1' || key === 'A') {
          e.preventDefault();
          if (q.choices[0]) answer(q.choices[0]);
        } else if (key === '2' || key === 'B') {
          e.preventDefault();
          if (q.choices[1]) answer(q.choices[1]);
        } else if (key === '3' || key === 'C') {
          e.preventDefault();
          if (q.choices[2]) answer(q.choices[2]);
        } else if (key === '4' || key === 'D') {
          e.preventDefault();
          if (q.choices[3]) answer(q.choices[3]);
        }
      } else if (picked !== null) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          next();
        }
      }

      if (key === 'P' && q) {
        e.preventDefault();
        speak(q.en);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, picked, q, answer, next]);

  // 1. Giao diện Setup cấu hình bài thi (chuẩn bio-app)
  if (phase === 'setup') {
    const totalWords = topics.reduce((acc, t) => acc + (t.total || 0), 0) || 862;
    return (
      <main style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Link href="/" className="bio-breadcrumb-link" style={{ textDecoration: 'none', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
            ← Trang chủ
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill" style={{ fontSize: 12 }}>ĐẤU TRƯỜNG PHẢN XẠ 20S</span>
        </div>

        <div className="panel quiz-card" style={{ textAlign: 'center', padding: '36px 28px' }}>
          <div className="quiz-setup-icon" aria-hidden="true">🎓</div>
          <span
            className="category-pill"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              display: 'inline-block',
              marginBottom: 8,
            }}
          >
            ĐÁNH GIÁ PHẢN XẠ TỪ VỰNG ANH – VIỆT
          </span>
          <h1 style={{ color: 'var(--heading)', margin: '12px 0 8px', fontSize: 26, fontWeight: 800 }}>
            Kiểm tra phản xạ từ vựng tiếng Anh
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6, fontSize: 15 }}>
            Thử thách phản xạ nhận diện từ vựng, phát âm IPA và câu ngữ cảnh trong thời gian giới hạn 20 giây mỗi câu.
          </p>

          <div
            style={{
              textAlign: 'left',
              background: 'var(--surface-2)',
              padding: '20px 22px',
              borderRadius: 18,
              border: '1px solid var(--border-soft)',
            }}
          >
            <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--heading)' }}>
              CHỌN CHUYÊN ĐỀ KIỂM TRA:
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="chip-select"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  marginTop: 8,
                  borderRadius: 12,
                  border: '2px solid var(--border-soft)',
                  background: 'var(--input-bg)',
                  color: 'var(--ink)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                <option value="">Tổng hợp tất cả chuyên đề ({totalWords} từ)</option>
                {topics.map((t) => (
                  <option key={t.topic} value={t.topic}>
                    {t.topic.toUpperCase()} ({t.total} từ)
                  </option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: 20 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--heading)', marginBottom: 10 }}>
                SỐ LƯỢNG CÂU HỎI:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`topic-chip ${count === n ? 'active' : ''}`}
                    onClick={() => setCount(n)}
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ⚡ {n} câu
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 12,
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: 14,
                fontWeight: 600,
              }}
              role="alert"
            >
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className="btn btn-primary quiz-start-btn"
            onClick={() => void start()}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 24,
              padding: '15px 24px',
              fontSize: 17,
              fontWeight: 800,
              borderRadius: 16,
              color: '#ffffff',
            }}
          >
            {loading ? '⏳ Đang tạo bộ đề thi...' : '✨ Bắt đầu làm bài thi ngay'}
          </button>
        </div>
      </main>
    );
  }

  // 2. Giao diện Hoàn thành bài thi (chuẩn bio-app)
  if (phase === 'done') {
    const rate = questions.length > 0 ? score / questions.length : 0;
    const isMaster = rate >= 0.8;
    const isPass = rate >= 0.5;

    return (
      <main style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 48 }}>
        <div className="score-banner" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden', padding: '40px 24px', marginTop: 16 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>
            {isMaster ? '🏆' : isPass ? '💪' : '📚'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {isMaster
              ? 'Xuất sắc! Phản xạ từ vựng tuyệt vời'
              : isPass
              ? 'Khá lắm! Cần luyện tập thêm một chút'
              : 'Cố lên! Hãy ôn lại từ vựng với Flashcard 3D'}
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, margin: '12px 0', color: '#ffffff' }}>
            {score} / {questions.length}
          </div>
          <div style={{ fontSize: 16, opacity: 0.95 }}>
            Độ chính xác: <b>{Math.round(rate * 100)}%</b>
          </div>
        </div>

        <div
          className="panel"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginTop: 18,
            padding: 20,
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => setPhase('setup')}
            style={{ padding: '14px 18px', fontWeight: 700, borderRadius: 12 }}
          >
            🔁 Làm bài mới
          </button>
          <Link
            href="/progress"
            className="btn btn-ghost"
            style={{
              textAlign: 'center',
              padding: '14px 18px',
              fontWeight: 700,
              borderRadius: 12,
              textDecoration: 'none',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
            }}
          >
            📊 Xem bảng tiến độ
          </Link>
          <Link
            href="/flashcards"
            className="btn btn-ghost"
            style={{
              textAlign: 'center',
              padding: '14px 18px',
              fontWeight: 700,
              borderRadius: 12,
              textDecoration: 'none',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
            }}
          >
            🃏 Ôn Flashcard 3D
          </Link>
          <Link
            href="/leaderboard"
            className="btn btn-ghost"
            style={{
              textAlign: 'center',
              padding: '14px 18px',
              fontWeight: 700,
              borderRadius: 12,
              textDecoration: 'none',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-soft)',
            }}
          >
            🏆 Bảng xếp hạng
          </Link>
        </div>
      </main>
    );
  }

  // 3. Giao diện Đang làm bài thi (chuẩn bio-app)
  if (!q) return <div className="panel" style={{ maxWidth: 680, margin: '0 auto' }}>⏳ Đang tải câu hỏi...</div>;

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 48 }}>
      {/* Thanh tiến trình & đếm ngược */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--muted)',
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600 }}>
          Câu hỏi <b>{idx + 1}</b> / {questions.length}
        </span>
        <span
          style={{
            color: left <= 5 ? '#ef4444' : 'var(--heading)',
            fontWeight: 800,
            fontSize: 15,
            padding: '3px 8px',
            borderRadius: 8,
            background: left <= 5 ? '#fee2e2' : 'var(--surface-2)',
            transition: 'all 0.3s ease',
          }}
        >
          ⏱ {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
        </span>
      </div>

      <div className="progress-track" style={{ marginBottom: 18 }}>
        <div
          className="progress-fill"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Thẻ câu hỏi trung tâm */}
      <div className="panel quiz-card" style={{ padding: '28px 24px' }}>
        {/* Header câu hỏi */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="category-pill"
              style={{
                textTransform: 'uppercase',
                fontSize: 11,
                padding: '4px 10px',
              }}
            >
              {q.topic || 'General'}
            </span>
            {q.ipa && (
              <span
                style={{
                  fontFamily: 'serif',
                  fontSize: 13,
                  color: 'var(--primary)',
                  fontWeight: 600,
                  background: 'var(--chip-bg)',
                  padding: '3px 8px',
                  borderRadius: 8,
                }}
              >
                {formatIpa(q.ipa)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
            ⭐ Điểm: {score}
          </span>
        </div>

        {/* Nội dung từ & câu hỏi */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--surface-2)',
            padding: '16px 20px',
            borderRadius: 16,
            border: '1px solid var(--border-soft)',
            marginBottom: 20,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <EnglishIllustration word={q.en} topic={q.topic} size={56} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
              Từ tiếng Anh:
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 2,
              }}
            >
              <h2
                style={{
                  color: 'var(--heading)',
                  fontSize: 26,
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {q.en}
              </h2>
              <button
                type="button"
                className="speak-btn"
                title="Phát âm từ (Phím tắt: P)"
                onClick={() => speak(q.en)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                🔊
              </button>
            </div>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--heading)', marginBottom: 12 }}>
          Chọn nghĩa tiếng Việt chính xác nhất:
        </div>

        {/* Danh sách 4 đáp án */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.choices.map((c, i) => {
            const isAnswer = c === q.answer;
            const isPicked = c === picked;
            const cls = picked === null ? '' : isAnswer ? 'correct' : isPicked ? 'wrong' : '';
            const letter = ['A', 'B', 'C', 'D'][i] ?? String(i + 1);

            return (
              <button
                key={i}
                type="button"
                className={`choice-btn ${cls}`}
                onClick={() => answer(c)}
                disabled={picked !== null}
              >
                <span className="choice-badge">{letter}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{c}</span>
                {picked !== null && isAnswer && (
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#059669' }}>
                    ✓ Chính xác
                  </span>
                )}
                {picked !== null && isPicked && !isAnswer && (
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#dc2626' }}>
                    ✗ Chưa đúng
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hộp giải thích & ngữ cảnh xuất hiện sau khi chọn */}
        {picked !== null && (
          <div style={{ marginTop: 18 }}>
            <div className="quiz-explain">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 800,
                  color: 'var(--primary)',
                  marginBottom: 6,
                  fontSize: 13.5,
                }}
              >
                <span>💡</span> PHÂN TÍCH TỪ VỰNG & MẸO GHI NHỚ:
              </div>
              <div style={{ lineHeight: 1.6, color: 'var(--ink)' }}>
                <div>
                  Từ: <strong style={{ color: 'var(--primary)' }}>{q.en}</strong>{' '}
                  {q.ipa && <span style={{ fontFamily: 'serif' }}>{formatIpa(q.ipa)}</span>}
                  {' — Nghĩa: '}
                  <strong>{q.answer}</strong>
                </div>
                {q.example && (
                  <div
                    style={{
                      marginTop: 8,
                      fontStyle: 'italic',
                      color: 'var(--muted)',
                      padding: '8px 12px',
                      background: 'var(--surface)',
                      borderRadius: 10,
                      border: '1px solid var(--border-soft)',
                    }}
                  >
                    “{q.example}”
                  </div>
                )}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={next}
              style={{
                width: '100%',
                marginTop: 18,
                padding: '14px',
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 14,
              }}
            >
              {idx + 1 >= questions.length ? 'Xem kết quả bài thi →' : 'Câu tiếp theo › (Phím Enter)'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
