'use client';

import { useEffect, useState } from 'react';
import { authFetch, fetchMe } from '../../lib/auth';

interface Row { username: string; attempts: number; minutes: number; accuracy: number; score: number; }

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [board, setBoard] = useState<Row[]>([]);
  const [me, setMe] = useState('');
  useEffect(() => {
    fetchMe().then(setMe).catch(() => {});
    authFetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d: { board?: Row[] }) => setBoard(d.board ?? []))
      .catch(() => {});
  }, []);
  return (
    <main>
      <h1>🏆 Bảng xếp hạng học tập</h1>
      <div className="panel">
        <p>Điểm xếp hạng = <b>số phút học × tỉ lệ đúng</b> — vừa chăm vừa chắc mới lên top!</p>
        {board.length === 0 && <p>Chưa có dữ liệu — <a href="/quiz">học ngay</a> để lên bảng nhé! 🚀</p>}
        {board.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border, #ddd)' }}>
                <th style={{ padding: 6 }}>Hạng</th>
                <th style={{ padding: 6 }}>Người học</th>
                <th style={{ padding: 6, textAlign: 'right' }}>Phút học</th>
                <th style={{ padding: 6, textAlign: 'right' }}>Đúng</th>
                <th style={{ padding: 6, textAlign: 'right' }}>Lượt</th>
                <th style={{ padding: 6, textAlign: 'right' }}>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r, i) => (
                <tr
                  key={r.username}
                  style={r.username === me ? { background: 'var(--accent-soft, #eef6ff)', fontWeight: 'bold' } : undefined}
                >
                  <td style={{ padding: 6 }}>{MEDAL[i] ?? `#${i + 1}`}</td>
                  <td style={{ padding: 6 }}>👤 {r.username}{r.username === me ? ' (bạn)' : ''}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{r.minutes}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{r.accuracy}%</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>{r.attempts}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}><b>{r.score}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
