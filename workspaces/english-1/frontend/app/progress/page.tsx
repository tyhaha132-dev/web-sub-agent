'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '../../lib/api';

interface Attempt { id: number; score: number; total: number; created_at: string; }

export default function Progress() {
  const [attempts, setAttempts] = useState(0);
  const [avg, setAvg] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/progress`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { attempts?: number; avg_rate?: number; history?: Attempt[] }) => {
        setAttempts(d.attempts ?? 0);
        setAvg(d.avg_rate ?? 0);
        setHistory(d.history ?? []);
      })
      .catch(() => {});
  }, []);
  const pct = Math.round(avg * 100);
  const level = attempts === 0 ? '🌱 Mới bắt đầu' : pct >= 80 ? '🏆 Cao thủ' : pct >= 50 ? '🔥 Đang tiến bộ' : '💪 Cần cố gắng';
  return (
    <main>
      <h1>📈 Tiến độ học tập</h1>
      <div className="card-grid">
        <div className="skill-card sk-orange"><h3>{attempts}</h3><p>lượt làm quiz</p></div>
        <div className="skill-card sk-green"><h3>{pct}%</h3><p>tỉ lệ đúng trung bình</p></div>
        <div className="skill-card sk-purple"><h3>{level}</h3><p>cấp độ của bạn</p></div>
      </div>
      <div className="panel">
        <h3>🕘 Lịch sử gần đây</h3>
        <ul>
          {history.map((h) => (
            <li key={h.id}>#{h.id}: <b>{h.score}/{h.total}</b> — {new Date(h.created_at).toLocaleString('vi-VN')}</li>
          ))}
        </ul>
        {history.length === 0 && <p>Chưa có dữ liệu — <a href="/quiz">làm quiz ngay</a> để lưu điểm nhé! 🚀</p>}
      </div>
    </main>
  );
}
