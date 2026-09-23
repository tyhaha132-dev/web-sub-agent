'use client';

import { useEffect, useState } from 'react';
import { fetchWords, speak, type Word } from '../../lib/api';

export default function Flashcards() {
  const [words, setWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  useEffect(() => {
    fetchWords().then((w) => { setWords(w); setIndex(0); });
  }, []);

  if (words.length === 0) return <p>⏳ Đang tải thẻ...</p>;
  const card = words[index % words.length] as Word;

  function shuffle() {
    const arr = [...words];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j] as Word, arr[i] as Word];
    }
    setWords(arr); setIndex(0); setFlipped(false);
  }

  return (
    <main>
      <h1>🃏 Flashcards ({(index % words.length) + 1}/{words.length}) ⭐ {known} từ đã thuộc</h1>
      <div className="flip-card" onClick={() => setFlipped((f) => !f)}>
        <div>
          {flipped ? card.vi : card.en}
          <button
            className="speak-btn"
            title="Nghe phát âm"
            onClick={(e) => { e.stopPropagation(); speak(card.en); }}
          >🔊</button>
        </div>
        <small>{flipped ? card.example : `${card.ipa} • Bấm để lật nghĩa 👆`}</small>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => { setIndex((i) => (i + words.length - 1) % words.length); setFlipped(false); }}>← Trước</button>
        <button className="btn btn-ghost" onClick={() => { setIndex((i) => (i + 1) % words.length); setFlipped(false); }}>Tiếp →</button>
        <button className="btn btn-ghost" onClick={() => { setKnown((k) => k + 1); setIndex((i) => (i + 1) % words.length); setFlipped(false); }}>✅ Đã thuộc</button>
        <button className="btn btn-ghost" onClick={shuffle}>🔀 Trộn</button>
      </div>
    </main>
  );
}
