'use client';

import { useEffect, useState } from 'react';
import { speak, type Word } from '../../lib/api';

const rowStyle = { marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } as const;

export function ListenMode({ words }: { words: Word[] }) {
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

  useEffect(() => {
    restart();
    const t = setTimeout(() => speak(words[0]?.en ?? 'hello'), 600);
    return () => clearTimeout(t);
  }, [words.length]);

  function play() {
    speak(card.en);
  }

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
    const ni = index + 1;
    setIndex(ni); setValue(''); setVerdict('idle');
    const nextCard = order[ni % order.length] as Word;
    setTimeout(() => speak(nextCard.en), 400);
  }

  if (done >= total) {
    return (
      <div>
        <div className="score-banner">{score >= 8 ? '🏆 Tai thính!' : score >= 5 ? '💪 Nghe khá!' : '📚 Nghe thêm nhé!'}<br />{score}/{total}</div>
        <div style={rowStyle}><button className="btn btn-primary" onClick={restart}>🔁 Chơi lại</button></div>
      </div>
    );
  }

  return (
    <div>
      <p>Câu {done + 1}/{total} — ⭐ {score} đúng</p>
      <div className="panel" style={{ textAlign: 'center' }}>
        <button className="btn btn-primary" onClick={play} style={{ fontSize: 22, padding: '16px 40px' }}>🔊 Nghe lại</button>
        <form className="search-row" onSubmit={submit} style={{ marginTop: 16 }}>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nghe được từ gì? Gõ vào..." autoFocus />
          <button className="btn btn-primary" type="submit">OK</button>
        </form>
        {verdict === 'right' && <p>✅ Đúng rồi!</p>}
        {verdict === 'wrong' && <p>❌ Sai — đáp án: <b>{card.en}</b> ({card.vi})</p>}
        {verdict !== 'idle' && <button className="btn btn-ghost" onClick={next}>Tiếp →</button>}
      </div>
    </div>
  );
}
