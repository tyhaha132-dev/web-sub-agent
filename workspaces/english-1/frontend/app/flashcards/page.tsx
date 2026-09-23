'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchWords,
  speak,
  SAMPLE_WORDS,
  type Word,
} from '../../lib/api';
import BlastGame from './blast-game';

type Mode = 'flip' | 'write' | 'listen' | 'match' | 'blast';

const TABS: Array<{ id: Mode; label: string }> = [
  { id: 'flip', label: '🃏 Lật thẻ' },
  { id: 'write', label: '✍️ Điền từ' },
  { id: 'listen', label: '🔊 Nghe–chép' },
  { id: 'match', label: '⚡ Ghép cặp' },
  { id: 'blast', label: '💥 Card Blast' },
];

const rowStyle = { marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } as const;

interface Deck {
  name: string;
  words: Word[];
}

const DECK_SIZE = 20;

function buildDecks(all: Word[]): Deck[] {
  if (all.length === 0) return [];
  const count = Math.max(1, Math.round(all.length / DECK_SIZE));
  const decks: Deck[] = [];
  let i = 0;
  let n = 0;
  while (i < all.length) {
    n += 1;
    const left = count - decks.length;
    const size = Math.max(1, Math.ceil((all.length - i) / left));
    decks.push({ name: `Toeic ${n}`, words: all.slice(i, i + size) });
    i += size;
  }
  return decks;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export default function Flashcards() {
  const [mode, setMode] = useState<Mode>('flip');
  const [deckIdx, setDeckIdx] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    withTimeout(fetchWords(''), 15000).then((w) => {
      setWords(w && w.length > 0 ? w : SAMPLE_WORDS);
      setDeckIdx(0);
      setLoading(false);
    }).catch(() => {
      setWords(SAMPLE_WORDS);
      setDeckIdx(0);
      setLoading(false);
    });
  }, []);

  const decks = useMemo(() => buildDecks(words), [words]);
  const deck = decks[Math.min(deckIdx, Math.max(decks.length - 1, 0))] ?? null;
  const deckWords = deck ? deck.words : [];

  return (
    <main>
      <h1>🃏 Luyện tập từ vựng</h1>
      <div className="topic-row">
        {decks.map((d, i) => (
          <button
            key={d.name}
            className={`topic-chip ${i === deckIdx ? 'active' : ''}`}
            onClick={() => setDeckIdx(i)}
          >
            {d.name} ({d.words.length})
          </button>
        ))}
      </div>
      <div className="topic-row">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`topic-chip ${mode === t.id ? 'active' : ''}`}
            onClick={() => setMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading || !deck ? (
        <div className="panel">⏳ Đang tải các bộ từ... (backend ngủ thì chờ một chút nhé)</div>
      ) : (
        <div key={`${mode}-${deck.name}`}>
          {mode === 'flip' && <FlipMode words={deckWords} />}
          {mode === 'write' && <WriteMode words={deckWords} />}
          {mode === 'listen' && <ListenMode words={deckWords} />}
          {mode === 'match' && <MatchMode words={deckWords} />}
          {mode === 'blast' && <BlastGame words={deckWords} />}
        </div>
      )}
    </main>
  );
}

function FlipMode({ words }: { words: Word[] }) {
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
        <button className="btn btn-ghost" onClick={() => { setKnown((k) => k + 1); setIndex((i) => (i + 1) % words.length); setFlipped(false); }}>✅ Đã thuộc</button>
        <button className="btn btn-ghost" onClick={random}>🔀 Thẻ ngẫu nhiên</button>
      </div>
    </div>
  );
}

function maskAnswer(example: string, answer: string): string {
  if (!example || !answer) return example;
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return example.replace(new RegExp(escaped, 'gi'), '___');
}

function WriteMode({ words }: { words: Word[] }) {
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
        <p style={{ color: '#6b7280' }}>{maskAnswer(card.example, card.en)}</p>
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

function ListenMode({ words }: { words: Word[] }) {
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

interface Tile {
  key: number;
  wordId: number;
  label: string;
  lang: 'en' | 'vi';
  matched: boolean;
  open: boolean;
}

function MatchMode({ words }: { words: Word[] }) {
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
