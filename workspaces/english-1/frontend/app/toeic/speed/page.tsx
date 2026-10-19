'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { fetchToeicReading, formatPassage, submitToeic, type ToeicQuestion } from '../../../lib/toeic';

interface Group {
  passage: string;
  questions: ToeicQuestion[];
}

export default function ToeicSpeedPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [t0, setT0] = useState(0);
  const [wpm, setWpm] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [score, setScore] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  async function start() {
    setLoading(true);
    setError('');
    try {
      const qs = await fetchToeicReading(9, 7);
      const map = new Map<string, ToeicQuestion[]>();
      for (const q of qs) {
        const key = q.passage ?? `q-${q.id}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)?.push(q);
      }
      const g = [...map.entries()].map(([passage, questions]) => ({ passage, questions }));
      if (g.length === 0) throw new Error('empty');
      setGroups(g);
      setActive(null);
      setWpm(null);
      setPicked({});
      setScore('');
    } catch {
      setError('😢 Không tải được đoạn văn (backend chưa chạy?). Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  function beginRead(i: number) {
    setActive(i);
    setWpm(null);
    setPicked({});
    setScore('');
    const startNow = Date.now();
    setT0(startNow);
    setElapsed(0);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - startNow) / 1000)), 500);
  }

  function finishRead() {
    if (active === null) return;
    if (timer.current) clearInterval(timer.current);
    const secs = Math.max(1, Math.floor((Date.now() - t0) / 1000));
    const words = groups[active]?.passage.split(/\s+/).length ?? 0;
    setWpm(Math.round((words / secs) * 60));
  }

  async function submit() {
    if (active === null) return;
    const qs = groups[active]?.questions ?? [];
    try {
      const r = await submitToeic(
        qs.map((q) => ({ id: q.id, choice: picked[q.id] ?? 0 })),
        'practice',
        'speed-p7',
      );
      setScore(`${r.score}/${r.total} — ${r.band.level}`);
    } catch {
      setError('😢 Không chấm được điểm bài làm (backend chưa chạy?).');
    }
  }

  return (
    <main>
      {/* Header Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/toeic" className="bio-breadcrumb-link">
            ← TOEIC
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">LUYỆN ĐỌC NHANH</span>
        </div>

        <h1
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '6px 0 10px',
            fontSize: 'clamp(24px, 3.5vw, 32px)',
            fontWeight: 900,
            color: 'var(--heading)',
          }}
        >
          <span>⚡</span> Luyện Đọc Nhanh (Speed Reading)
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 840 }}>
          Rèn luyện phản xạ đọc quét (skimming &amp; scanning) cho TOEIC Part 7. Hệ thống tự động bấm giờ đọc hiểu
          và tính tốc độ đọc thực tế (Words Per Minute — WPM), mục tiêu đạt 150+ từ/phút để kịp giờ thi.
        </p>
      </div>

      {error && (
        <div className="panel" style={{ color: '#ef4444', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {groups.length === 0 || active === null ? (
        <div>
          <div
            className="panel"
            style={{
              padding: '24px 28px',
              borderRadius: 20,
              border: '1px solid var(--border-soft)',
              marginBottom: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px', color: 'var(--heading)' }}>
                Sẵn sàng thử thách tốc độ đọc?
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
                Bấm tải đề để hệ thống chọn ngẫu nhiên các đoạn văn thực tế từ ngân hàng đề TOEIC Part 7.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={start}
              disabled={loading}
              style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
            >
              {loading ? '⏳ Đang tải...' : '🚀 Bắt đầu tải đoạn văn'}
            </button>
          </div>

          {groups.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {groups.map((g, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 18,
                    padding: '20px',
                    boxShadow: 'var(--card-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>
                      ĐOẠN VĂN #{i + 1}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--heading)' }}>
                      Bài đọc hiểu Part 7
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 4 }}>
                      Gồm <b>{g.questions.length} câu hỏi</b> kiểm tra khả năng nắm ý chính và chi tiết.
                    </div>
                  </div>

                  <button
                    onClick={() => beginRead(i)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 9999,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--ink)',
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: 'pointer',
                    }}
                  >
                    Bấm giờ đọc đoạn này →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Header trạng thái đọc */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--heading)' }}>
              Đoạn #{active + 1}{' '}
              {wpm === null ? (
                <span style={{ color: '#0284c7', fontSize: 16 }}>⏱️ Đang đọc: {elapsed} giây</span>
              ) : (
                <span style={{ color: '#10b981', fontSize: 16 }}>⚡ Tốc độ: <b>{wpm} WPM</b> (từ/phút)</span>
              )}
            </div>

            <button
              onClick={() => setActive(null)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-soft)',
                padding: '6px 14px',
                borderRadius: 9999,
                color: 'var(--muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ← Chọn đoạn khác
            </button>
          </div>

          {/* Nội dung đoạn văn */}
          <div
            className="panel"
            style={{
              padding: '24px',
              borderRadius: 20,
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--card-shadow)',
              lineHeight: 1.7,
              fontSize: 15,
              whiteSpace: 'pre-line',
              marginBottom: 24,
            }}
          >
            {formatPassage(groups[active]?.passage ?? '')}
          </div>

          {wpm === null ? (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <button
                className="btn btn-primary"
                onClick={finishRead}
                style={{ padding: '12px 36px', fontSize: 15, fontWeight: 700 }}
              >
                Tôi đã đọc xong! Xem câu hỏi ⏱️
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', color: 'var(--heading)' }}>
                Trả lời câu hỏi đọc hiểu:
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                {groups[active]?.questions.map((q, i) => (
                  <div
                    key={q.id}
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: 16,
                      padding: '20px',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--heading)' }}>
                      Câu {i + 1}: {q.prompt}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.choices.map((c, idx) => (
                        <button
                          key={idx}
                          className={`choice-btn ${picked[q.id] === idx ? 'correct' : ''}`}
                          onClick={() => setPicked((p) => ({ ...p, [q.id]: idx }))}
                          style={{
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            borderColor: picked[q.id] === idx ? '#0284c7' : undefined,
                          }}
                        >
                          <span className="choice-badge">{String.fromCharCode(65 + idx)}</span>
                          <span style={{ fontSize: 14 }}>{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  className="btn btn-primary"
                  onClick={submit}
                  style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
                >
                  Chấm điểm câu hỏi ✅
                </button>
                {score && (
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>
                    Kết quả: {score}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
