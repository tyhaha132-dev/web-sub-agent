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
  const [deckIdx, setDeckIdx] = useState(0);
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
      setDeckIdx(0);
      setLoading(false);
    }).catch(() => {
      setWords((prev) => (prev.length > 0 ? prev : SAMPLE_WORDS));
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
