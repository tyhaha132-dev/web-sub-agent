'use client';

import { useEffect, useState } from 'react';
import type { Word } from '../../lib/api';

const rowStyle = { marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } as const;

function maskAnswer(example: string, answer: string): string {
  if (!example || !answer) return example;
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return example.replace(new RegExp(escaped, 'gi'), '___');
}

export function WriteMode({ words }: { words: Word[] }) {
  const [order, setOrder] = useState<Word[]>(words);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<'idle' | 'right' | 'wrong'>('idle');
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);
  const total = Math.min(order.length, 10);
  const card = order[index % order.length] as Word;

  function restart() {
    const arr = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
    setOrder(arr.length > 0 ? arr : words);
    setIndex(0); setValue(''); setVerdict('idle'); setScore(0); setDone(0);
  }

  useEffect(() => { restart(); }, [words.length]);

  function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (verdict !== 'idle' || done >= total) return;
    const ok = value.trim().toLowerCase() === card.en.toLowerCase();
    setVerdict(ok ? 'right' : 'wrong');
    if (ok) setScore((s) => s + 1);
    setDone((d) => d + 1);
  }

  function next() {
    if (done >= total) return;
    setIndex((i) => i + 1); setValue(''); setVerdict('idle');
  }

  if (done >= total) {
    return (
      <div>
        <div className="score-banner">{score >= 8 ? '🏆 Tuyệt vời!' : score >= 5 ? '💪 Khá lắm!' : '📚 Cố lên nào!'}<br />{score}/{total}</div>
        <div style={rowStyle}><button className="btn btn-primary" onClick={restart}>🔁 Chơi lại (10 từ mới)</button></div>
      </div>
    );
  }

  return (
    <div>
      <p>Câu {done + 1}/{total} — ⭐ {score} đúng</p>
      <div className="panel">
        <h2 style={{ margin: '0 0 4px' }}>{card.vi} <span className="badge">{card.topic}</span></h2>
        <p style={{ color: 'var(--muted)' }}>{maskAnswer(card.example, card.en)}</p>
        <form className="search-row" onSubmit={submit}>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Gõ từ tiếng Anh..." autoFocus />
          <button className="btn btn-primary" type="submit">OK</button>
        </form>
        {verdict === 'right' && <p>✅ Đúng rồi!</p>}
        {verdict === 'wrong' && <p>❌ Sai — đáp án: <b>{card.en}</b> {card.ipa}</p>}
        {verdict !== 'idle' && <button className="btn btn-ghost" onClick={next}>Tiếp →</button>}
      </div>
    </div>
  );
}
