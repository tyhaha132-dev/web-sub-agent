'use client';

import { useRef, useState } from 'react';
import { fetchToeicReading, formatPassage, submitToeic, type ToeicQuestion } from '../../../lib/toeic';

interface Group {
  passage: string;
  questions: ToeicQuestion[];
}

export default function ToeicSpeed() {
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
    setLoading(true); setError('');
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
      setGroups(g); setActive(null); setWpm(null); setPicked({}); setScore('');
    } catch {
      setError('😢 Không tải được (backend chưa chạy?). Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  function beginRead(i: number) {
    setActive(i); setWpm(null); setPicked({}); setScore('');
    const start = Date.now();
    setT0(start); setElapsed(0);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
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
      const r = await submitToeic(qs.map((q) => ({ id: q.id, choice: picked[q.id] ?? 0 })), 'practice', 'speed-p7');
      setScore(`${r.score}/${r.total} — ${r.band.level}`);
    } catch {
      setError('😢 Không chấm được (backend chưa chạy?).');
    }
  }

  if (groups.length === 0 || active === null) {
    return (
      <main>
        <h1>⚡ Đọc nhanh (Speed Reading)</h1>
        <div className="panel">
          <p>Chọn 1 đoạn Part 7, bấm giờ đọc hiểu rồi trả lời câu hỏi — rèn tốc độ mục tiêu 150+ từ/phút.</p>
          <button className="btn btn-primary" onClick={start} disabled={loading}>
            {loading ? '⏳ Đang tải...' : '🚀 Tải đoạn văn'}
          </button>
          {error && <p>{error}</p>}
        </div>
        {groups.map((g, i) => (
          <div key={i} className="panel" style={{ marginTop: 8 }}>
            <p><b>Đoạn {i + 1}</b> — {g.questions.length} câu hỏi</p>
            <button className="btn btn-light" onClick={() => beginRead(i)}>Đọc đoạn này →</button>
          </div>
        ))}
      </main>
    );
  }

  const g = groups[active];
  return (
    <main>
      <h1>⚡ Đoạn {active + 1} {wpm === null ? `(đang đọc: ${elapsed}s)` : `— ${wpm} từ/phút`}</h1>
      <div className="panel" style={{ whiteSpace: 'pre-line' }}>{formatPassage(g.passage)}</div>
      {wpm === null ? (
        <button className="btn btn-primary" onClick={finishRead} style={{ marginTop: 12 }}>Đọc xong ⏱️</button>
      ) : (
        <>
          {g.questions.map((q, i) => (
            <div key={q.id} className="panel" style={{ marginTop: 8 }}>
              <p><b>Câu {i + 1}:</b> {q.prompt}</p>
              {q.choices.map((c, idx) => (
                <button
                  key={idx}
                  className="choice-btn"
                  onClick={() => setPicked((p) => ({ ...p, [q.id]: idx }))}
                  style={picked[q.id] === idx ? { outline: '3px solid var(--accent, #7c3aed)' } : undefined}
                >
                  {`${String.fromCharCode(65 + idx)}. ${c}`}
                </button>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={submit}>Chấm ✅</button>{' '}
            <button className="btn" onClick={() => setActive(null)}>← Chọn đoạn khác</button>
          </div>
          {score && <p><b>Kết quả: {score}</b></p>}
        </>
      )}
    </main>
  );
}
