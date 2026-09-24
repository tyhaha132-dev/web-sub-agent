'use client';

import { useState } from 'react';
import { speak, type Word } from '../../lib/api';

const rowStyle = { marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } as const;

export function FlipMode({ words, onKnown }: { words: Word[]; onKnown?: (en: string) => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const card = words[index % words.length] as Word;

  function random() {
    setIndex(Math.floor(Math.random() * words.length));
    setFlipped(false);
  }

  return (
    <div>
      <p>Thẻ {(index % words.length) + 1}/{words.length} — ⭐ {known} từ đã thuộc</p>
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
      <div style={rowStyle}>
        <button className="btn btn-ghost" onClick={() => { setIndex((i) => (i + words.length - 1) % words.length); setFlipped(false); }}>← Trước</button>
        <button className="btn btn-ghost" onClick={() => { setIndex((i) => (i + 1) % words.length); setFlipped(false); }}>Tiếp →</button>
        <button className="btn btn-ghost" onClick={() => { setKnown((k) => k + 1); onKnown?.(card.en); setIndex((i) => (i + 1) % words.length); setFlipped(false); }}>✅ Đã thuộc</button>
        <button className="btn btn-ghost" onClick={random}>🔀 Thẻ ngẫu nhiên</button>
      </div>
    </div>
  );
}
