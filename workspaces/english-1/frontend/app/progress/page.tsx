'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { authFetch } from '../../lib/auth';

interface Attempt {
  id: number;
  score: number;
  total: number;
  kind: string;
  duration_sec: number;
  created_at: string;
}

interface DayStat {
  day: string;
  attempts: number;
  minutes: number;
}

interface ProgressResponse {
  attempts?: number;
  avg_rate?: number;
  total_minutes?: number;
  daily?: DayStat[];
  history?: Attempt[];
}

const KIND_LABEL: Record<string, { label: string; icon: string }> = {
  quiz: { label: 'Đấu trường Quiz', icon: '🏆' },
  write: { label: 'Điền từ vựng', icon: '✍️' },
  listen: { label: 'Nghe–chép chính tả', icon: '🎧' },
  match: { label: 'Ghép cặp từ vựng', icon: '⚡' },
  blast: { label: 'Card Blast Mini-game', icon: '💥' },
  toeic: { label: 'Luyện thi TOEIC', icon: '🎯' },
  reading: { label: 'TOEIC Reading', icon: '📖' },
};

export default function ProgressPage() {
  const [attempts, setAttempts] = useState(0);
  const [avg, setAvg] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [daily, setDaily] = useState<DayStat[]>([]);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/progress')
      .then((r) => r.json())
      .then((d: ProgressResponse) => {
        setAttempts(d.attempts ?? 0);
        setAvg(d.avg_rate ?? 0);
        setMinutes(d.total_minutes ?? 0);
        setDaily(d.daily ?? []);
        setHistory(d.history ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Tạo chuỗi 14 ngày liên tục chuẩn bio-app
  const last14Days = useMemo(() => {
    const map = new Map<string, { attempts: number; minutes: number }>();
    for (const d of daily) {
      map.set(d.day, { attempts: d.attempts, minutes: d.minutes });
    }
    const result: Array<{ day: string; attempts: number; minutes: number }> = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const entry = map.get(key) || { attempts: 0, minutes: 0 };
      result.push({ day: key, attempts: entry.attempts, minutes: entry.minutes });
    }
    return result;
  }, [daily]);

  // Thống kê độ chính xác theo hình thức luyện tập (tương đương by_chapter ở bio-app)
  const byKind = useMemo(() => {
    const map = new Map<string, { totalScore: number; totalMax: number; count: number }>();
    for (const h of history) {
      const k = h.kind || 'quiz';
      const cur = map.get(k) || { totalScore: 0, totalMax: 0, count: 0 };
      cur.totalScore += h.score;
      cur.totalMax += h.total;
      cur.count += 1;
      map.set(k, cur);
    }
    return Array.from(map.entries()).map(([kind, val]) => {
      const accuracy = val.totalMax > 0 ? (val.totalScore / val.totalMax) * 100 : 0;
      const info = KIND_LABEL[kind] || { label: kind, icon: '📝' };
      return {
        kind,
        label: `${info.icon} ${info.label}`,
        accuracy: Math.round(accuracy * 10) / 10,
        attempts: val.count,
      };
    });
  }, [history]);

  const pct = Math.round(avg * 100);
  const level =
    attempts === 0
      ? '🌱 Mới bắt đầu'
      : pct >= 80
      ? '🏆 Cao thủ tiếng Anh'
      : pct >= 50
      ? '🔥 Đang tiến bộ nhanh'
      : '💪 Cần chăm chỉ hơn';

  const maxMinutes = Math.max(1, ...last14Days.map((d) => d.minutes));
  const avgDailyMinutes = last14Days.length > 0 ? (minutes / last14Days.length).toFixed(1) : '0';

  if (loading) {
    return (
      <main>
        <div className="panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <span style={{ fontSize: 32 }}>⏳</span>
          <p style={{ marginTop: 8, color: 'var(--muted)' }}>Đang tải dữ liệu tiến độ học tập...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Header trang chuẩn bio-app */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/" className="bio-breadcrumb-link">← Trang chủ</Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">BÁO CÁO HỌC TẬP</span>
        </div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 900 }}>
          <span>📊</span> Tiến độ học tập
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: 0 }}>
          Theo dõi tổng thời gian rèn luyện, số lượt hoàn thành, biểu đồ hoạt động 14 ngày và lịch sử làm bài chi tiết.
        </p>
      </div>

      {/* Summary Cards Row chuẩn bio-app */}
      <div className="stats-row">
        <div className="stat">
          <span>⏱️</span>
          <span><b>{minutes}</b> phút đã học</span>
        </div>
        <div className="stat">
          <span>📝</span>
          <span><b>{attempts}</b> lượt luyện</span>
        </div>
        <div className="stat">
          <span>🎯</span>
          <span><b>{pct}%</b> chính xác TB</span>
        </div>
        <div className="stat">
          <span>{level}</span>
        </div>
      </div>

      {/* Biểu đồ hoạt động 14 ngày gần đây (Daily Activity Chart chuẩn bio-app) */}
      <div className="panel" style={{ marginBottom: 24, padding: '24px 24px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: 'var(--heading)', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📈</span> Hoạt động 14 ngày gần đây
          </h3>
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
            (Tính toàn bộ thời gian học trên mọi trang)
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'flex-end',
            height: 120,
            overflowX: 'auto',
            paddingBottom: 8,
            paddingTop: 16,
          }}
        >
          {last14Days.map((day) => {
            const height = Math.max(4, (day.minutes / maxMinutes) * 100);
            return (
              <div
                key={day.day}
                style={{
                  flex: 1,
                  minWidth: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${height}px`,
                    background:
                      day.minutes > 0
                        ? 'linear-gradient(to top, #0284c7, #38bdf8)'
                        : 'var(--border-soft)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.35s ease',
                    boxShadow: day.minutes > 0 ? '0 2px 8px rgba(56, 189, 248, 0.35)' : 'none',
                    cursor: 'pointer',
                  }}
                  title={`${day.day}: ${day.minutes} phút (${day.attempts} lượt)`}
                />
                <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>
                  {day.day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 14, marginBottom: 4 }}>
          Tổng cộng: <b>{minutes}</b> phút • Trung bình: <b>{avgDailyMinutes}</b> phút/ngày • Kỷ lục: <b>{maxMinutes}</b> phút/ngày
        </p>
      </div>

      {/* Độ chính xác theo hình thức luyện tập (chuẩn bio-app: Độ chính xác theo chương) */}
      <div className="panel" style={{ marginBottom: 24, padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--heading)', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📚</span> Độ chính xác theo hình thức luyện tập
        </h3>

        {byKind.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>Chưa có dữ liệu độ chính xác. Hãy làm Quiz hoặc luyện Flashcards để ghi nhận điểm số!</p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Link href="/quiz" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}>
                Làm Quiz ngay 🚀
              </Link>
              <Link href="/flashcards" className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: 13 }}>
                Luyện Flashcards 🃏
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {byKind.map((item) => (
              <div key={item.kind} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: 'var(--heading)' }}>{item.label}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                    <b style={{ color: item.accuracy >= 80 ? '#10b981' : item.accuracy >= 50 ? '#0284c7' : '#f59e0b' }}>
                      {item.accuracy}%
                    </b>{' '}
                    ({item.attempts} lượt)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${item.accuracy}%`,
                      background:
                        item.accuracy >= 80
                          ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                          : item.accuracy >= 50
                          ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                          : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lịch sử gần đây (Recent Attempts chuẩn bio-app) */}
      <div className="panel" style={{ marginBottom: 24, padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--heading)', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🕐</span> Lịch sử gần đây
        </h3>

        {history.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', margin: '20px 0' }}>
            Chưa có lịch sử làm bài. Làm Quiz hoặc luyện tập để lưu lại thành tích!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.slice(0, 20).map((attempt) => {
              const info = KIND_LABEL[attempt.kind] || { label: attempt.kind, icon: '📝' };
              const scorePct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
              const isPerfect = attempt.score === attempt.total && attempt.total > 0;
              const isZero = attempt.score === 0;

              return (
                <div key={attempt.id} className="attempt-row">
                  <span style={{ fontWeight: 700, color: 'var(--heading)', minWidth: 150, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                  </span>

                  <span style={{ fontWeight: 700, minWidth: 70 }}>
                    {attempt.score}/{attempt.total}
                  </span>

                  <span
                    style={{
                      fontWeight: 800,
                      minWidth: 60,
                      color: isPerfect ? '#10b981' : isZero ? '#ef4444' : '#8b5cf6',
                    }}
                  >
                    {scorePct}%
                  </span>

                  <span style={{ color: 'var(--muted)', fontSize: 13, flex: 1, minWidth: 90 }}>
                    ⏱️ {attempt.duration_sec > 0 ? `${Math.round(attempt.duration_sec / 60 * 10) / 10} phút` : '< 1 phút'}
                  </span>

                  <span style={{ color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    {new Date(attempt.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Điều hướng Bảng xếp hạng */}
      <div
        className="panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '18px 24px',
        }}
      >
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>🏆 Bảng xếp hạng học tập</h4>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5 }}>
            Xem thứ hạng điểm số và chuỗi ngày học của bạn so với cộng đồng người học.
          </p>
        </div>
        <Link href="/leaderboard" className="btn btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>
          Xem bảng xếp hạng ›
        </Link>
      </div>
    </main>
  );
}
