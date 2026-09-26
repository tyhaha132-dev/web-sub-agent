'use client';

import { useEffect, useState } from 'react';
import {
  avgSecondsPerQ,
  computeStreak,
  fetchToeicAttempts,
  fetchToeicLevels,
  fetchToeicProfile,
  getClientId,
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

const SECTIONS = [
  { href: '/toeic/reading?part=5', icon: '📖', label: 'Reading Part 5 (30 câu)' },
  { href: '/toeic/reading?part=6', icon: '📄', label: 'Reading Part 6 (16 câu)' },
  { href: '/toeic/reading?part=7', icon: '📚', label: 'Reading Part 7 (54 câu)' },
  { href: '/toeic/vocabulary', icon: '🗂️', label: 'Từ vựng SRS' },
  { href: '/toeic/grammar', icon: '📐', label: 'Ngữ pháp' },
  { href: '/toeic/speed', icon: '⚡', label: 'Đọc nhanh' },
  { href: '/toeic/errors', icon: '🧾', label: 'Nhật ký lỗi' },
];

function WeekChecklist({ level }: { level: string }) {
  const tasks = WEEKLY_TASKS[level] ?? [];
  const [done, setDone] = useState<number[]>(() => loadWeekDone(level));
  if (tasks.length === 0) return null;
  const allDone = tasks.every((_, i) => done.includes(i));
  return (
    <div style={{ marginTop: 8 }}>
      <p><b>✅ Nhiệm vụ tuần này ({done.length}/{tasks.length}):</b></p>
      {tasks.map((t, i) => (
        <label key={i} style={{ display: 'block', marginTop: 4 }}>
          <input
            type="checkbox"
            checked={done.includes(i)}
            onChange={() => setDone(toggleWeekDone(level, i))}
          />{' '}
          <span style={{ textDecoration: done.includes(i) ? 'line-through' : 'none' }}>{t}</span>
        </label>
      ))}
      {allDone && (
        <button className="btn" style={{ marginTop: 8 }} onClick={() => { resetWeekDone(level); setDone([]); }}>
          🎉 Xong tuần! Sang tuần mới →
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
  const [name, setName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    setTarget(loadToeicTarget());
    fetchToeicLevels().then(setLevels).catch(() => setError('😢 Không tải được thang điểm (backend chưa chạy?).'));
    const cid = getClientId();
    fetchToeicAttempts(cid).then(setAttempts).catch(() => {});
    fetchToeicProfile(cid).then((p) => {
      if (p) {
        if (p.display_name) setName(p.display_name);
        if (p.target_score) {
          setTarget(p.target_score);
          saveToeicTarget(p.target_score);
        }
      }
    }).catch(() => {});
  }, []);

  function pickTarget(v: number) {
    setTarget(v);
    saveToeicTarget(v);
    saveToeicProfile({ client_id: getClientId(), display_name: name, target_score: v }).catch(() => {});
  }

  async function saveName() {
    setNameSaved(false);
    try {
      await saveToeicProfile({ client_id: getClientId(), display_name: name.trim(), target_score: target });
      setNameSaved(true);
    } catch { /* backend chưa chạy */ }
  }

  const pathway = levels.filter((l) => l.max >= target).slice(0, 3);

  return (
    <main>
      <h1>💼 TOEIC — Luyện thi công sở</h1>
      <div className="panel">
        <p>
          👤 Tên hiển thị:{' '}
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
            placeholder="Tên của bạn (lưu theo máy)"
            style={{ padding: 6, maxWidth: 220 }}
          />{' '}
          <button className="btn" onClick={saveName}>Lưu</button>{' '}
          {nameSaved && '✅ đã lưu'}
        </p>
        <p>🎯 Mục tiêu của bạn: <b>{target}</b></p>
        <div>
          {TARGETS.map((v) => (
            <button
              key={v}
              className="btn"
              onClick={() => pickTarget(v)}
              disabled={v === target}
              style={{ marginRight: 8, marginTop: 8 }}
            >
              {v}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <a className="btn btn-light" href="/toeic/reading">📖 Luyện Part 5 ngay</a>
        </div>
        {error && <p>{error}</p>}
      </div>

      <h2>🧭 Các phần luyện</h2>
      <div className="card-grid">
        {SECTIONS.map((s) => (
          <a key={s.href} href={s.href} className="skill-card sk-teal">
            <div className="icon">{s.icon}</div>
            <h3>{s.label}</h3>
          </a>
        ))}
      </div>

      <h2>📈 Quỹ đạo điểm (10 lần gần nhất)</h2>
      {attempts.length === 0 && <p>Chưa có dữ liệu.</p>}
      {attempts.length > 0 && (
        <p>🔥 Streak: <b>{computeStreak(attempts)} ngày</b>
          {avgSecondsPerQ(attempts) !== null && <> · ⏱️ TB <b>{avgSecondsPerQ(attempts)}s</b>/câu</>}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {attempts.slice(0, 10).reverse().map((a) => {
          const pct = a.total === 0 ? 0 : a.score / a.total;
          return (
            <div
              key={a.id}
              title={`${a.score}/${a.total} ${a.band}`}
              style={{ flex: 1, height: `${Math.max(6, pct * 100)}%`, background: 'var(--accent, #7c3aed)', borderRadius: 4 }}
            />
          );
        })}
      </div>

      <h2>🪜 Lộ trình tới {target}</h2>
      {pathway.length === 0 && <p>Chưa tải được thang điểm.</p>}
      {pathway.map((l) => (
        <div key={l.level} className="panel" style={{ marginTop: 8 }}>
          <p><b>{l.level}</b> ({l.min}–{l.max}) — {l.focus}</p>
          <p>🗓️ {l.weekly}</p>
          <WeekChecklist level={l.level} />
        </div>
      ))}

      <h2>📊 Thang điểm TOEIC</h2>
      {levels.map((l) => (
        <div key={l.level} className="panel" style={{ marginTop: 8 }}>
          <p><b>{l.level}</b> ({l.min}–{l.max})</p>
          <p>{l.focus}</p>
        </div>
      ))}

      <h2>🕘 Lịch sử làm bài ({attempts.length})</h2>
      {attempts.length === 0 && <p>Chưa có lượt nào — làm bài đầu tiên đi! 🚀</p>}
      {attempts.slice(0, 10).map((a) => (
        <div key={a.id} className="panel" style={{ marginTop: 8 }}>
          <p>{a.score}/{a.total} — {a.band} ({a.kind === 'placement' ? 'kiểm tra (cũ)' : a.kind === 'mock' ? 'thi thử (cũ)' : 'luyện tập'})</p>
        </div>
      ))}
    </main>
  );
}
