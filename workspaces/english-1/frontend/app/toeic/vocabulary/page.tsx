'use client';

import { useState } from 'react';
import { fetchWords, speak, type Word } from '../../../lib/api';
import { gradeSrs, loadSrs } from '../../../lib/toeic';

const GRADES = [
  { v: 0, label: '😵 Quên', desc: 'ôn lại ngày mai' },
  { v: 1, label: '😅 Nhớ mờ', desc: 'ôn sớm' },
  { v: 2, label: '🙂 Nhớ', desc: 'giãn cách xa hơn' },
  { v: 3, label: '🤩 Thuộc', desc: 'lâu mới ôn lại' },
];

export default function ToeicVocab() {
  const [queue, setQueue] = useState<Word[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true); setError('');
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
      setQueue(q); setFlipped(false); setDone(0);
    } catch {
      setError('😢 Không tải được từ (backend chưa chạy?). Thử lại nhé!');
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

  if (queue.length === 0) {
    return (
      <main>
        <h1>🗂️ Từ vựng SRS (SM-2)</h1>
        <div className="panel">
          <p>{done === 0
            ? 'Ôn từ TOEIC theo giãn cách: từ mới + từ đến hạn, tự chấm 4 mức.'
            : `🎉 Xong ${done} thẻ hôm nay! Quay lại khi có thẻ đến hạn nhé.`}</p>
          <button className="btn btn-primary" onClick={start} disabled={loading}>
            {loading ? '⏳ Đang tải...' : done === 0 ? '🚀 Bắt đầu ôn' : '🔁 Ôn tiếp'}
          </button>
          {error && <p>{error}</p>}
        </div>
      </main>
    );
  }

  const w = queue[0] as Word;
  return (
    <main>
      <h1>Thẻ {done + 1} (còn {queue.length})</h1>
      <div className="panel" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p style={{ fontSize: '2em' }}><b>{w.en}</b></p>
        <button className="btn btn-light" onClick={() => speak(w.en)}>🔊</button>
        {!flipped ? (
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => setFlipped(true)}>Lật thẻ 🔄</button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: '1.4em' }}>{w.vi}</p>
            {w.example && <p><i>{w.example}</i></p>}
            <div style={{ marginTop: 12 }}>
              {GRADES.map((g) => (
                <button key={g.v} className="btn" title={g.desc} onClick={() => grade(g.v)} style={{ marginRight: 8, marginTop: 8 }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
