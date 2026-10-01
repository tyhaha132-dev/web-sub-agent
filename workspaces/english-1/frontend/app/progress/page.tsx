'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '../../lib/auth';

interface Attempt { id: number; score: number; total: number; kind: string; duration_sec: number; created_at: string; }
interface DayStat { day: string; attempts: number; minutes: number; }

const KIND_LABEL: Record<string, string> = {
  quiz: '🏆 Quiz',
  write: '✍️ Viết từ',
  listen: '🎧 Nghe–chép',
  blast: '💥 Card Blast',
};

export default function Progress() {
  const [attempts, setAttempts] = useState(0);
  const [avg, setAvg] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [daily, setDaily] = useState<DayStat[]>([]);
  const [history, setHistory] = useState<Attempt[]>([]);
  useEffect(() => {
    authFetch('/api/progress')
      .then((r) => r.json())
      .then((d: { attempts?: number; avg_rate?: number; total_minutes?: number; daily?: DayStat[]; history?: Attempt[] }) => {
        setAttempts(d.attempts ?? 0);
        setAvg(d.avg_rate ?? 0);
        setMinutes(d.total_minutes ?? 0);
        setDaily(d.daily ?? []);
        setHistory(d.history ?? []);
      })
      .catch(() => {});
  }, []);
  const pct = Math.round(avg * 100);
  const level = attempts === 0 ? '🌱 Mới bắt đầu' : pct >= 80 ? '🏆 Cao thủ' : pct >= 50 ? '🔥 Đang tiến bộ' : '💪 Cần cố gắng';
  const maxDay = Math.max(1, ...daily.map((d) => d.minutes));
  return (
    <main>
      <h1>📈 Tiến độ học tập</h1>
      <div className="card-grid">
        <div className="skill-card sk-orange"><h3>{attempts}</h3><p>lượt học (quiz + flashcards)</p></div>
        <div className="skill-card sk-green"><h3>{pct}%</h3><p>tỉ lệ đúng trung bình</p></div>
        <div className="skill-card sk-teal"><h3>{minutes}</h3><p>phút đã học tổng cộng</p></div>
        <div className="skill-card sk-purple"><h3>{level}</h3><p>cấp độ của bạn</p></div>
      </div>
      <div className="panel">
        <h3>🗓️ Số phút hoạt động mỗi ngày (14 ngày gần nhất)</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Mở web và thao tác là được tính — mọi trang (lật thẻ, quiz, TOEIC, từ điển...).</p>
        {daily.length === 0 && <p>Chưa có dữ liệu — <a href="/quiz">làm quiz</a> hoặc <a href="/flashcards">luyện flashcards</a> nhé! 🚀</p>}
        {daily.map((d) => (
          <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ width: 96 }}>{d.day.slice(5)}</span>
            <div className="progress-track" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${Math.round((d.minutes / maxDay) * 100)}%` }} />
            </div>
            <span style={{ width: 120, textAlign: 'right' }}><b>{d.minutes}</b> phút · {d.attempts} lượt</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>🕘 Lịch sử gần đây</h3>
        <ul>
          {history.map((h) => (
            <li key={h.id}>
              {KIND_LABEL[h.kind] ?? h.kind}: <b>{h.score}/{h.total}</b>
              {h.duration_sec > 0 && <> · {Math.round(h.duration_sec / 60 * 10) / 10} phút</>} — {new Date(h.created_at).toLocaleString('vi-VN')}
            </li>
          ))}
        </ul>
        {history.length === 0 && <p>Chưa có dữ liệu — <a href="/quiz">làm quiz ngay</a> để lưu điểm nhé! 🚀</p>}
      </div>
      <div className="panel">
        <a href="/leaderboard">🏆 Xem bảng xếp hạng</a>
      </div>
    </main>
  );
}
