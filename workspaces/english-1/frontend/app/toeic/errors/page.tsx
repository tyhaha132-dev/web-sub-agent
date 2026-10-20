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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {wrongs.map((w, i) => (
            <div
              key={`${w.id}-${i}`}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 16,
                padding: '20px',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  #{w.grammar_tag || 'grammar'}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  {w.when ? new Date(w.when).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--heading)', marginBottom: 12, lineHeight: 1.5 }}>
                {w.prompt}
              </div>

              <div
                style={{
                  background: 'var(--surface-2)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border-soft)',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: 'var(--ink)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💡</span> Lời giải thích &amp; Quy tắc:
                </div>
                <div>{w.explanation}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
