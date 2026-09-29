'use client';

import { useEffect, useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const total = order.length;
  const card = order[index % order.length] as Word;

  function restart() {
    const arr = [...words].sort(() => Math.random() - 0.5);
    setOrder(arr.length > 0 ? arr : words);
    setIndex(0); setValue(''); setVerdict('idle'); setScore(0); setDone(0);
  }

  useEffect(() => { restart(); }, [words.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [index, verdict]);

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

  function handleKey(e: { key: string; preventDefault: () => void }) {
    if (e.key === 'Enter' && verdict !== 'idle') {
      e.preventDefault();
      next();
    }
  }

  if (done >= total) {
    const rate = total === 0 ? 0 : score / total;
    return (
      <div>
        <div className="score-banner">{rate >= 0.8 ? '🏆 Tuyệt vời!' : rate >= 0.5 ? '💪 Khá lắm!' : '📚 Cố lên nào!'}<br />{score}/{total}</div>
        <div style={rowStyle}><button className="btn btn-primary" onClick={restart}>🔁 Chơi lại (bộ mới)</button></div>
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
          <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={handleKey} placeholder="Gõ từ tiếng Anh..." autoFocus />
          <button className="btn btn-primary" type="submit">OK</button>
        </form>
        {verdict === 'right' && <p>✅ Đúng rồi!</p>}
        {verdict === 'wrong' && <p>❌ Sai — đáp án: <b>{card.en}</b> {card.ipa}</p>}
        {verdict !== 'idle' && <button className="btn btn-ghost" onClick={next}>Tiếp →</button>}
      </div>
    </div>
  );
}
