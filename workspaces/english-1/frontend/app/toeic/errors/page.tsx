'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchToeicAttempts, type ToeicAttempt, type ToeicError } from '../../../lib/toeic';

export default function ToeicErrorsPage() {
  const [attempts, setAttempts] = useState<ToeicAttempt[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToeicAttempts()
      .then(setAttempts)
      .catch(() => setError('😢 Không tải được nhật ký (backend chưa chạy?).'))
      .finally(() => setLoading(false));
  }, []);

  const wrongs: Array<ToeicError & { when: string }> = [];
  for (const a of attempts) {
    for (const e of a.errors ?? []) {
      wrongs.push({ ...e, when: a.created_at });
      if (wrongs.length >= 40) break;
    }
    if (wrongs.length >= 40) break;
  }

  const byTag = new Map<string, number>();
  for (const a of attempts) {
    for (const e of a.errors ?? []) {
      byTag.set(e.grammar_tag, (byTag.get(e.grammar_tag) ?? 0) + 1);
    }
  }
  const weakest = [...byTag.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);

  return (
    <main>
      {/* Header Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/toeic" className="app-breadcrumb-link">
            ← TOEIC
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">NHẬT KÝ LỖI SAI</span>
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
          <span>🧾</span> Sổ tay Lỗi sai &amp; Điểm yếu
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 840 }}>
          Hệ thống tự động ghi nhận các câu hỏi bạn từng làm sai trong các đề luyện tập. Xem lại lời giải thích chi
          tiết và luyện tập tập trung theo các điểm yếu nhất để không bị lặp lại lỗi sai.
        </p>
      </div>

      {error && (
        <div className="panel" style={{ color: '#ef4444', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Phân tích điểm yếu (Weakest points) */}
      {weakest.length > 0 && (
        <div
          className="panel"
          style={{
            padding: '22px 24px',
            marginBottom: 28,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(245, 158, 11, 0.04))',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--heading)' }}>
              Top các điểm yếu ngữ pháp cần khắc phục ngay:
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {weakest.map(([tag, n]) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  borderRadius: 9999,
                  background: 'var(--panel)',
                  border: '1px solid var(--border-soft)',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#ef4444' }}>
                  #{tag} ({n} lần sai)
                </span>
                <Link
                  href={`/toeic/reading?part=5&tag=${encodeURIComponent(tag)}`}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#0284c7',
                    textDecoration: 'none',
                    padding: '3px 8px',
                    borderRadius: 9999,
                    background: 'var(--surface-2)',
                  }}
                >
                  Luyện dạng này ›
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách câu hỏi sai gần nhất */}
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', color: 'var(--heading)' }}>
        📝 Danh sách câu sai đã ghi nhận ({wrongs.length})
      </h2>

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
          ⏳ Đang tải dữ liệu câu sai...
        </div>
      ) : wrongs.length === 0 ? (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            borderRadius: 20,
            border: '1px solid var(--border-soft)',
          }}
        >
          <span style={{ fontSize: 40 }}>🎉</span>
          <h3 style={{ margin: '12px 0 6px', fontSize: 18, fontWeight: 700 }}>Chưa có lỗi sai nào!</h3>
          <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 14 }}>
            Hãy vào luyện các đề Part 5, 6, 7. Các câu bạn chưa trả lời đúng sẽ được tự động lưu vào đây để bạn ôn lại.
          </p>
          <Link href="/toeic" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 14 }}>
            Vào luyện đề TOEIC ngay 🚀
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {wrongs.map((w, i) => {
            const letters = ['A', 'B', 'C', 'D'];
            const userIdx = w.choice;
            const correctIdx = w.answer;

            const userLetter =
              w.user_choice_letter ||
              (typeof userIdx === 'number' && userIdx >= 0 && userIdx < 4 ? letters[userIdx] : '—');
            const userText =
              w.user_choice_text ||
              (userIdx < 0
                ? 'Chưa chọn (Bỏ qua)'
                : userLetter !== '—'
                ? `Lựa chọn ${userLetter}`
                : 'Chưa xác định');

            const correctLetter =
              w.correct_choice_letter ||
              (typeof correctIdx === 'number' && correctIdx >= 0 && correctIdx < 4 ? letters[correctIdx] : '—');
            const correctText =
              w.correct_choice_text ||
              (correctLetter !== '—' ? `Lựa chọn ${correctLetter}` : 'Chưa xác định');

            return (
              <div
                key={`${w.id}-${i}`}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 18,
                  padding: '22px 24px',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                {/* Tag & Thoi gian lam bai */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 9999,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}
                  >
                    #{w.grammar_tag || 'grammar'}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                    {w.when ? new Date(w.when).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>

                {/* Noi dung cau hoi */}
                <div
                  style={{
                    fontSize: 16.5,
                    fontWeight: 700,
                    color: 'var(--heading)',
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  {w.prompt}
                </div>

                {/* 4 lua chon neu co du lieu */}
                {w.choices && w.choices.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    {w.choices.map((c, cIdx) => {
                      const letter = letters[cIdx] || String(cIdx);
                      const isUserChoice = cIdx === userIdx;
                      const isCorrect = cIdx === correctIdx;

                      let bg = 'var(--surface-2)';
                      let border = '1px solid var(--border-soft)';
                      let color = 'var(--ink)';
                      let badgeBg = 'var(--border-soft)';
                      let badgeColor = 'var(--muted)';

                      if (isCorrect) {
                        bg = 'rgba(16, 185, 129, 0.12)';
                        border = '1.5px solid #10b981';
                        color = 'var(--heading)';
                        badgeBg = '#10b981';
                        badgeColor = '#ffffff';
                      } else if (isUserChoice) {
                        bg = 'rgba(239, 68, 68, 0.12)';
                        border = '1.5px solid #ef4444';
                        color = 'var(--heading)';
                        badgeBg = '#ef4444';
                        badgeColor = '#ffffff';
                      }

                      return (
                        <div
                          key={cIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 14px',
                            borderRadius: 12,
                            background: bg,
                            border,
                            color,
                            fontSize: 13.5,
                            fontWeight: isCorrect || isUserChoice ? 700 : 500,
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: badgeBg,
                              color: badgeColor,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {letter}
                          </span>
                          <span style={{ flex: 1 }}>{c}</span>
                          {isCorrect && (
                            <span style={{ color: '#059669', fontSize: 12, fontWeight: 700 }}>
                              ✓ Đúng
                            </span>
                          )}
                          {isUserChoice && !isCorrect && (
                            <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
                              ✗ Bạn chọn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bang doi chieu truc tiep: Ban chon vs Dap an dung */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  {/* O Dap an ban da chon */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1.5px solid rgba(239, 68, 68, 0.28)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#ef4444',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span>✗</span> Đáp án bạn đã chọn:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: 800,
                          marginRight: 8,
                          flexShrink: 0,
                        }}
                      >
                        {userLetter}
                      </span>
                      <span>{userText}</span>
                    </div>
                  </div>

                  {/* O Dap an chinh xac */}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1.5px solid rgba(16, 185, 129, 0.32)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#10b981',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span>✓</span> Đáp án chính xác:
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: 800,
                          marginRight: 8,
                          flexShrink: 0,
                        }}
                      >
                        {correctLetter}
                      </span>
                      <span>{correctText}</span>
                    </div>
                  </div>
                </div>

                {/* Loi giai thich va quy tac */}
                <div
                  style={{
                    background: 'var(--surface-2)',
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: '1px solid var(--border-soft)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>💡</span> Lời giải thích &amp; Quy tắc:
                  </div>
                  <div>{w.explanation}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
