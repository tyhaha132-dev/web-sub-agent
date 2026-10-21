'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  answeredOf,
  avgSecondsPerQ,
  computeStreak,
  fetchToeicAttempts,
  fetchToeicLevels,
  fetchToeicProfile,
  loadToeicTarget,
  loadWeekDone,
  resetWeekDone,
  saveToeicProfile,
  saveToeicTarget,
  toggleWeekDone,
  WEEKLY_TASKS,
  type ToeicAttempt,
  type ToeicBand,
} from '../../lib/toeic';

const TARGETS = [500, 600, 700, 800, 900];

const MAIN_PARTS = [
  {
    part: 5,
    href: '/toeic/reading?part=5',
    title: 'Part 5: Incomplete Sentences',
    desc: 'Hoàn thành câu ngữ pháp & từ vựng công sở trọng điểm.',
    badge: '30 câu / đề',
    icon: '📖',
    accent: '#0284c7',
  },
  {
    part: 6,
    href: '/toeic/reading?part=6',
    title: 'Part 6: Text Completion',
    desc: 'Điền đoạn văn: email, thông báo, ghi nhớ (memo) kèm bài đọc.',
    badge: '16 câu / đề',
    icon: '📄',
    accent: '#0ea5e9',
  },
  {
    part: 7,
    href: '/toeic/reading?part=7',
    title: 'Part 7: Reading Comprehension',
    desc: 'Đọc hiểu đoạn đơn & đoạn kép thực tế chuẩn đề thi thật.',
    badge: '54 câu / đề',
    icon: '📚',
    accent: '#38bdf8',
  },
];

const TOEIC_TOOLS = [
  {
    href: '/toeic/grammar',
    icon: '📐',
    title: 'Chuyên đề Ngữ pháp',
    badge: '8 dạng cốt lõi',
    desc: 'Học nhanh quy tắc 30s các thì động từ, giới từ, liên từ, câu điều kiện, thể bị động,... và luyện đề lọc theo từng dạng.',
    action: 'Ôn quy tắc & luyện đề →',
    badgeBg: 'var(--color-purple-subtle)',
    badgeBorder: 'var(--color-purple-border)',
    badgeColor: 'var(--color-purple-text)',
  },
  {
    href: '/toeic/vocabulary',
    icon: '🗂️',
    title: 'Từ vựng TOEIC SRS',
    badge: 'Giãn cách SM-2',
    desc: 'Luyện phản xạ từ vựng công sở thông minh: thuật toán tự động ưu tiên từ mới và từ đến hạn cần ôn tập.',
    action: 'Vào ôn từ vựng →',
    badgeBg: 'var(--color-cyan-subtle)',
    badgeBorder: 'var(--color-cyan-border)',
    badgeColor: 'var(--color-cyan-text)',
  },
  {
    href: '/toeic/speed',
    icon: '⚡',
    title: 'Luyện đọc nhanh',
    badge: 'Đo WPM thực tế',
    desc: 'Rèn tốc độ đọc quét văn bản kinh doanh dưới áp lực thời gian, đo số từ/phút (WPM) và trả lời câu hỏi đọc hiểu.',
    action: 'Đo tốc độ đọc →',
    badgeBg: 'var(--color-warning-subtle)',
    badgeBorder: 'var(--color-warning-border)',
    badgeColor: 'var(--color-warning-text)',
  },
  {
    href: '/toeic/errors',
    icon: '🧾',
    title: 'Sổ tay lỗi sai',
    badge: 'Phân tích điểm yếu',
    desc: 'Thống kê tự động các câu bạn làm sai theo từng tag ngữ pháp, giúp tập trung sửa dứt điểm các lỗ hổng kiến thức.',
    action: 'Xem nhật ký câu sai →',
    badgeBg: 'var(--color-error-subtle)',
    badgeBorder: 'var(--color-error-border)',
    badgeColor: 'var(--color-error-text)',
  },
];

function WeekChecklist({ level }: { level: string }) {
  const tasks = WEEKLY_TASKS[level] ?? [];
  const [done, setDone] = useState<number[]>(() => loadWeekDone(level));
  if (tasks.length === 0) return null;
  const allDone = tasks.every((_, i) => done.includes(i));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--heading)', marginBottom: 8 }}>
        ✅ Nhiệm vụ trọng tâm tuần ({done.length}/{tasks.length}):
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((t, i) => (
          <label
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              cursor: 'pointer',
              color: done.includes(i) ? 'var(--muted)' : 'var(--ink)',
            }}
          >
            <input
              type="checkbox"
              checked={done.includes(i)}
              onChange={() => setDone(toggleWeekDone(level, i))}
            />
            <span style={{ textDecoration: done.includes(i) ? 'line-through' : 'none' }}>{t}</span>
          </label>
        ))}
      </div>
      {allDone && (
        <button
          onClick={() => { resetWeekDone(level); setDone([]); }}
          style={{
            marginTop: 12,
            padding: '6px 14px',
            borderRadius: 9999,
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #a7f3d0',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🎉 Đã xong tuần! Bắt đầu tuần mới →
        </button>
      )}
    </div>
  );
}

export default function ToeicHome() {
  const [levels, setLevels] = useState<ToeicBand[]>([]);
  const [target, setTarget] = useState(700);
  const [attempts, setAttempts] = useState<ToeicAttempt[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setTarget(loadToeicTarget());
    fetchToeicLevels().then(setLevels).catch(() => setError('😢 Không tải được thang điểm (backend chưa chạy?).'));
    fetchToeicAttempts().then(setAttempts).catch(() => {});
    fetchToeicProfile().then((p) => {
      if (p && p.target_score) {
        setTarget(p.target_score);
        saveToeicTarget(p.target_score);
      }
    }).catch(() => {});
  }, []);

  function pickTarget(v: number) {
    setTarget(v);
    saveToeicTarget(v);
    saveToeicProfile({ target_score: v }).catch(() => {});
  }

  const pathway = levels.filter((l) => l.max >= target).slice(0, 3);
  const streak = computeStreak(attempts);
  const avgSec = avgSecondsPerQ(attempts);

  return (
    <main className="page" style={{ maxWidth: 1160, margin: '0 auto', paddingBottom: 64 }}>
      {/* Breadcrumb Cirrus */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          ← Trang chủ
        </Link>
        <span style={{ color: 'var(--muted)', margin: '0 8px', fontSize: 13 }}>/</span>
        <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>LUYỆN THI TOEIC READING</span>
      </div>

      {/* Header Cirrus */}
      <div style={{ marginBottom: 28 }}>
        <span className="category-pill" style={{ marginBottom: 10, display: 'inline-block' }}>
          💼 LUYỆN THI TOEIC CHUẨN ETS
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '6px 0 10px', letterSpacing: '-0.02em' }}>
          Luyện thi TOEIC Reading
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, maxWidth: 720 }}>
          Kho 515 câu hỏi TOEIC Reading chuẩn format (Part 5, 6, 7) kèm lời giải thích song ngữ Việt – Anh, phân tích ngữ pháp và giao diện Computer-Based Test (CBT) hiện đại.
        </p>
      </div>

      {/* Target Score Card Cirrus */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: '20px 26px',
          boxShadow: 'var(--card-shadow)',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--heading)' }}>
                Mục tiêu điểm số TOEIC của bạn
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Chọn band điểm mong muốn để hệ thống tự động tối ưu hóa lộ trình luyện đề
              </div>
            </div>
          </div>

          {/* Target Score Pill Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TARGETS.map((v) => (
                <button
                  key={v}
                  onClick={() => pickTarget(v)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 9999,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: v === target ? '#0284c7' : 'var(--surface-2)',
                    color: v === target ? '#ffffff' : 'var(--chip-text)',
                    border: v === target ? '1.5px solid #0284c7' : '1.5px solid var(--border-soft)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {v}+
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Parts Grid (Part 5, 6, 7) */}
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px' }}>
        📚 Các phần luyện thi Reading chuẩn
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 36 }}>
        {MAIN_PARTS.map((p) => (
          <div
            key={p.part}
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border-soft)',
              borderRadius: 20,
              padding: '24px',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{p.icon}</span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 9999,
                  background: 'var(--color-primary-subtle)',
                  border: '1px solid var(--color-primary-border)',
                  color: 'var(--color-primary-text)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {p.badge}
              </span>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: 'var(--heading)' }}>
              {p.title}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
              {p.desc}
            </p>

            <div style={{ marginTop: 'auto' }}>
              <Link
                href={p.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '10px 18px',
                  borderRadius: 9999,
                  background: '#0f172a',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                }}
              >
                Vào luyện đề ngay →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* TOEIC Tools & Grammar */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🧭</span> Chuyên đề Ngữ pháp &amp; Công cụ bổ trợ
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {TOEIC_TOOLS.map((t) => (
            <div
              key={t.href}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 20,
                padding: '22px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{t.icon}</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: t.badgeBg,
                    border: `1px solid ${t.badgeBorder}`,
                    color: t.badgeColor,
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {t.badge}
                </span>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: 'var(--heading)' }}>
                {t.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 18px', lineHeight: 1.5, flex: 1 }}>
                {t.desc}
              </p>

              <div>
                <Link
                  href={t.href}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '9px 16px',
                    borderRadius: 9999,
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-soft)',
                    fontWeight: 600,
                    fontSize: 13,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.action}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quỹ đạo điểm số & Streak */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: 'var(--card-shadow)',
          marginBottom: 36,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            📈 Quỹ đạo điểm số 10 lượt gần nhất
          </h2>
          <div style={{ display: 'flex', gap: 14, fontSize: 14, color: 'var(--muted)' }}>
            <span>🔥 Chuỗi luyện tập: <b style={{ color: '#f59e0b' }}>{streak} ngày</b></span>
            {avgSec !== null && (
              <span>⏱️ Tốc độ trung bình: <b>{avgSec}s</b>/câu</span>
            )}
          </div>
        </div>

        {attempts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 14 }}>
            Chưa có lượt làm bài nào. Hãy chọn Part 5, 6 hoặc 7 ở trên để bắt đầu nhé! 🚀
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, marginTop: 16 }}>
            {attempts.slice(0, 10).reverse().map((a) => {
              const pct = a.total === 0 ? 0 : a.score / a.total;
              const answered = answeredOf(a);
              return (
                <div
                  key={a.id}
                  title={`${a.score}/${a.total} câu đúng (${a.band})${answered < a.total ? ` • đã làm ${answered}/${a.total}` : ''}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(10, pct * 100)}%`,
                    background: pct >= 0.8 ? '#10b981' : pct >= 0.5 ? '#0284c7' : '#f59e0b',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Lộ trình & Thang điểm TOEIC */}
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px' }}>
        🪜 Lộ trình mục tiêu điểm {target}+
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}>
        {pathway.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>Đang tải lộ trình học...</p>
        ) : (
          pathway.map((l) => (
            <div
              key={l.level}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 16,
                padding: '20px 24px',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--heading)' }}>
                  Band {l.level} ({l.min}–{l.max} điểm)
                </span>
                <span style={{ fontSize: 13, color: '#0284c7', fontWeight: 600 }}>
                  🗓️ {l.weekly}
                </span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '8px 0 12px' }}>
                {l.focus}
              </p>
              <WeekChecklist level={l.level} />
            </div>
          ))
        )}
      </div>

      {/* Lịch sử thi gần đây */}
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px' }}>
        🕘 Lịch sử làm bài thi gần đây ({attempts.length})
      </h2>
      {attempts.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Chưa có lượt làm bài nào.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {attempts.slice(0, 8).map((a) => (
            <div
              key={a.id}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 14,
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {a.part ? `Reading Part ${a.part}` : a.meta?.includes('part=') ? `Reading Part ${a.meta.split('part=')[1]?.slice(0, 1)}` : 'TOEIC Reading'}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 12 }}>
                  {answeredOf(a) < a.total ? `(Làm ${answeredOf(a)}/${a.total} câu)` : '(Làm đủ)'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{a.band}</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: 700,
                    background: a.score / a.total >= 0.8 ? '#ecfdf5' : '#eff6ff',
                    color: a.score / a.total >= 0.8 ? '#059669' : '#0284c7',
                    border: `1px solid ${a.score / a.total >= 0.8 ? '#a7f3d0' : '#bae6fd'}`,
                  }}
                >
                  {a.score} / {a.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
