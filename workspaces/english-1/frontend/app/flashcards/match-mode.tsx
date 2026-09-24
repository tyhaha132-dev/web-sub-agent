'use client';

import { useEffect, useState } from 'react';
import type { Word } from '../../lib/api';

const rowStyle = { marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } as const;

interface Tile {
  key: number;
  wordId: number;
  label: string;
  lang: 'en' | 'vi';
  matched: boolean;
  open: boolean;
}

export function MatchMode({ words }: { words: Word[] }) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [first, setFirst] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const [lock, setLock] = useState(false);

  function deal() {
    const picked = [...words].sort(() => Math.random() - 0.5).slice(0, 6);
    const deck: Tile[] = picked.flatMap((w, i) => [
      { key: i * 2, wordId: w.id, label: w.en, lang: 'en' as const, matched: false, open: false },
      { key: i * 2 + 1, wordId: w.id, label: w.vi, lang: 'vi' as const, matched: false, open: false },
    ]).sort(() => Math.random() - 0.5);
    setTiles(deck);
    setFirst(null); setMoves(0); setSeconds(0); setWon(false); setLock(false);
  }

  useEffect(() => {
    deal();
  }, [words.length]);

  useEffect(() => {
    if (won) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [words.length, won]);

  useEffect(() => {
    if (tiles.length > 0 && tiles.every((t) => t.matched)) setWon(true);
  }, [tiles]);

  function flip(key: number) {
    if (lock || won) return;
    const tile = tiles.find((t) => t.key === key);
    if (!tile || tile.matched || tile.open) return;
    const opened = tiles.map((t) => (t.key === key ? { ...t, open: true } : t));
    if (first === null) {
      setTiles(opened);
      setFirst(key);
      return;
    }
    setMoves((m) => m + 1);
    const a = tiles.find((t) => t.key === first);
    if (a && a.wordId === tile.wordId && a.lang !== tile.lang) {
      setTiles(opened.map((t) => (t.key === key || t.key === first ? { ...t, matched: true } : t)));
      setFirst(null);
    } else {
      setLock(true);
      setTiles(opened);
      setTimeout(() => {
        setTiles((prev) => prev.map((t) => (t.key === key || t.key === first ? { ...t, open: false } : t)));
        setFirst(null);
        setLock(false);
      }, 600);
    }
  }

  const matchedPairs = tiles.filter((t) => t.matched).length / 2;
  const fmt = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div>
      <p>⏱️ {fmt} — 👆 {moves} lượt lật — ✅ {matchedPairs}/6 cặp</p>
      {won ? (
        <div>
          <div className="score-banner">🎉 Xong trong {fmt}!<br />{moves} lượt lật</div>
          <div style={rowStyle}><button className="btn btn-primary" onClick={deal}>🔁 Chơi lại</button></div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {tiles.map((t) => (
              <button
                key={t.key}
                onClick={() => flip(t.key)}
                disabled={t.matched}
                style={{
                  borderRadius: 14,
                  padding: '18px 8px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: t.matched ? 'default' : 'pointer',
                  border: '2px solid',
                  borderColor: t.matched ? '#16a34a' : t.open ? '#7c3aed' : '#e9d5ff',
                  background: t.matched ? '#dcfce7' : t.open ? '#ede9fe' : '#fff',
                  color: '#1e1b4b',
                  minHeight: 70,
                }}
              >
                {t.matched || t.open ? t.label : '❓'}
              </button>
            ))}
          </div>
          <div style={rowStyle}><button className="btn btn-ghost" onClick={deal}>🔀 Ván mới</button></div>
        </div>
      )}
    </div>
  );
}
