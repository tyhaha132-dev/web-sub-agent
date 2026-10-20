'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fetchWords, speak, type Word } from '../../../lib/api';
import { gradeSrs, loadSrs } from '../../../lib/toeic';

const GRADES = [
  { v: 0, label: '😵 Quên', desc: 'ôn lại ngày mai', bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  { v: 1, label: '😅 Nhớ mờ', desc: 'ôn sớm', bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
  { v: 2, label: '🙂 Nhớ tốt', desc: 'giãn cách vừa', bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
  { v: 3, label: '🤩 Rất dễ', desc: 'lâu mới ôn lại', bg: '#ecfdf5', border: '#a7f3d0', color: '#059669' },
];

export default function ToeicVocabPage() {
  const [queue, setQueue] = useState<Word[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true);
    setError('');
    try {
      const words = (await fetchWords('toeic')) ?? [];
      if (words.length === 0) throw new Error('empty');
      const srs = loadSrs();
      const now = Date.now();
      const due = words.filter((w) => (srs[String(w.id)]?.due ?? 0) <= now);
      const fresh = words.filter((w) => !srs[String(w.id)]).slice(0, 10);
      const freshIds = new Set(fresh.map((w) => w.id));
      const review = due.filter((w) => !freshIds.has(w.id));
      const q = [...review.slice(0, 20), ...fresh].sort(() => Math.random() - 0.5);
      if (q.length === 0) throw new Error('empty');
      setQueue(q);
      setFlipped(false);
      setDone(0);
    } catch {
      setError('😢 Không tải được từ vựng TOEIC (backend chưa chạy?). Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  function grade(v: number) {
    const w = queue[0];
    if (!w) return;
    gradeSrs(w.id, v);
    setQueue((q) => q.slice(1));
    setFlipped(false);
    setDone((d) => d + 1);
  }

  return (
    <main>
      {/* Header Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/toeic" className="app-breadcrumb-link">
            ← TOEIC
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">TỪ VỰNG SRS</span>
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
          <span>🗂️</span> Từ vựng TOEIC — Thuật toán SM-2
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 840 }}>
          Rèn luyện và ghi nhớ từ vựng tiếng Anh công sở theo phương pháp lặp lại ngắt quãng (Spaced Repetition).
          Thuật toán tự động tính toán thời gian tối ưu để ôn lại giúp từ vựng đi sâu vào trí nhớ dài hạn.
        </p>
      </div>

      {error && (
        <div className="panel" style={{ color: '#ef4444', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            borderRadius: 20,
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <span style={{ fontSize: 44 }}>{done > 0 ? '🎉' : '🧠'}</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '14px 0 8px', color: 'var(--heading)' }}>
            {done === 0
              ? 'Sẵn sàng nạp từ vựng TOEIC hôm nay?'
              : `Xuất sắc! Bạn đã hoàn thành ${done} từ vựng!`}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: '0 0 24px', maxWidth: 520, marginInline: 'auto' }}>
            {done === 0
              ? 'Hệ thống sẽ bốc ngẫu nhiên 10 từ mới và các từ đã đến hạn cần ôn tập để bạn rèn luyện phản xạ.'
              : 'Hãy quay lại vào ngày mai hoặc khi có từ vựng đến hạn để tiếp tục duy trì trí nhớ đỉnh cao.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={start}
            disabled={loading}
            style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700 }}
          >
            {loading ? '⏳ Đang tải từ...' : done === 0 ? '🚀 Bắt đầu phiên ôn từ' : '🔁 Ôn thêm một phiên nữa'}
          </button>
        </div>
      ) : (
        <div>
          {/* Progress Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--heading)' }}>
              Thẻ số {done + 1} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(còn {queue.length} từ)</span>
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: '#0284c7',
                background: 'rgba(2, 132, 199, 0.1)',
                padding: '4px 12px',
                borderRadius: 9999,
              }}
            >
              TOEIC Vocabulary
            </span>
          </div>

          {/* Flashcard Box */}
          {(() => {
            const w = queue[0] as Word;
            return (
              <div
                className="panel"
                style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  borderRadius: 24,
                  border: '1px solid var(--border-soft)',
                  boxShadow: 'var(--card-shadow)',
                  minHeight: 340,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', fontWeight: 900, margin: '0 0 6px', color: 'var(--heading)' }}>
                    {w.en}
                  </h2>
                  {w.ipa && (
                    <div style={{ color: 'var(--muted)', fontSize: 16, fontFamily: 'monospace' }}>
                      {w.ipa}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => speak(w.en)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 9999,
                    border: '1px solid var(--border-soft)',
                    background: 'var(--surface-2)',
                    cursor: 'pointer',
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                    color: 'var(--heading)',
                  }}
                >
                  <span>🔊</span> Nghe phát âm
                </button>

                {!flipped ? (
                  <div style={{ marginTop: 24 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setFlipped(true)}
                      style={{ padding: '12px 32px', fontSize: 15, fontWeight: 700 }}
                    >
                      Lật thẻ xem nghĩa 🔄
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 20, width: '100%', maxWidth: 540 }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: '#0284c7',
                        marginBottom: 10,
                      }}
                    >
                      {w.vi}
                    </div>

                    {w.example && (
                      <div
                        style={{
                          background: 'var(--surface-2)',
                          padding: '12px 18px',
                          borderRadius: 14,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: 'var(--muted)',
                          fontStyle: 'italic',
                          marginBottom: 24,
                        }}
                      >
                        &ldquo;{w.example}&rdquo;
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>
                        ĐÁNH GIÁ ĐỘ GHI NHỚ (SRS):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                        {GRADES.map((g) => (
                          <button
                            key={g.v}
                            onClick={() => grade(g.v)}
                            title={g.desc}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 12,
                              background: g.bg,
                              border: `1px solid ${g.border}`,
                              color: g.color,
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                              transition: 'transform 0.15s ease',
                            }}
                          >
                            <span>{g.label}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.8 }}>{g.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </main>
  );
}
