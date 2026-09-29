'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchWords,
  getCachedWords,
  speak,
  wakeBackend,
  SAMPLE_WORDS,
  type Word,
} from '../../lib/api';
import BlastGame from './blast-game';
import { FlipMode } from './flip-mode';
import { WriteMode } from './write-mode';
import { ListenMode } from './listen-mode';
import { MatchMode } from './match-mode';

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
  const [combine, setCombine] = useState(false);
  const [selected, setSelected] = useState<number[]>([0]);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wakeBackend();
    const cached = getCachedWords();
    if (cached.length > 0) {
      setWords(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    withTimeout(fetchWords(''), 15000).then((w) => {
      setWords((prev) => (w && w.length > 0 ? w : prev.length > 0 ? prev : SAMPLE_WORDS));
      setSelected([0]);
      setLoading(false);
    }).catch(() => {
      setWords((prev) => (prev.length > 0 ? prev : SAMPLE_WORDS));
      setSelected([0]);
      setLoading(false);
    });
  }, []);

  const decks = useMemo(() => buildDecks(words), [words]);
  const validSelected = selected.filter((i) => i >= 0 && i < decks.length);
  const activeIdx = validSelected.length > 0 ? validSelected : decks.length > 0 ? [0] : [];
  const deckWords = activeIdx.flatMap((i) => decks[i]?.words ?? []);

  function toggleDeck(i: number) {
    setSelected((prev) => {
      const valid = prev.filter((x) => x >= 0 && x < decks.length);
      if (valid.includes(i)) {
        const next = valid.filter((x) => x !== i);
        return next.length > 0 ? next : valid;
      }
      return [...valid, i].sort((a, b) => a - b);
    });
  }

  function clickDeck(i: number) {
    if (!combine) {
      setSelected([i]);
      return;
    }
    toggleDeck(i);
  }

  function toggleCombine() {
    if (!combine) {
      setCombine(true);
    } else {
      setCombine(false);
      setSelected((prev) => [prev[0] ?? 0]);
    }
  }

  return (
    <main>
      <h1>🃏 Luyện tập từ vựng</h1>
      <div className="topic-row">
        <button
          className={`topic-chip ${combine ? 'active' : ''}`}
          onClick={toggleCombine}
          title="Bật để chọn nhiều bộ gộp lại học chung"
        >
          🧩 Gộp bộ {combine ? '(đang bật)' : ''}
        </button>
        {decks.map((d, i) => (
          <button
            key={d.name}
            className={`topic-chip ${activeIdx.includes(i) ? 'active' : ''}`}
            onClick={() => clickDeck(i)}
          >
            {d.name} ({d.words.length})
          </button>
        ))}
      </div>
      <p style={{ marginTop: 8 }}>
        {combine
          ? `🗂️ Đang học ${activeIdx.length}/${decks.length} bộ — `
          : `📚 Bộ ${decks[activeIdx[0]]?.name ?? ''} — `}
        <b>{deckWords.length} từ</b>
        {combine ? ' (bấm để chọn/bỏ bộ)' : ' (bật Gộp bộ để học nhiều bộ chung)'}
      </p>
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
      {loading || deckWords.length === 0 ? (
        <div className="panel">⏳ Đang tải các bộ từ... (backend ngủ thì chờ một chút nhé)</div>
      ) : (
        <div key={`${mode}-${activeIdx.join(',')}`}>
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
