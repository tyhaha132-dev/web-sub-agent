'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchWords,
  getCachedWords,
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
type Filter = 'all' | 'unlearned' | 'learned';

const TABS: Array<{ id: Mode; label: string }> = [
  { id: 'flip', label: '🃏 Lật thẻ 3D' },
  { id: 'write', label: '✍️ Điền từ' },
  { id: 'listen', label: '🔊 Nghe–chép' },
  { id: 'match', label: '⚡ Ghép cặp' },
  { id: 'blast', label: '💥 Card Blast' },
];

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
    decks.push({ name: `Flashcards ${n}`, words: all.slice(i, i + size) });
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

  // Bộ lọc & Tốc độ phát âm (chuẩn bio-app)
  const [filter, setFilter] = useState<Filter>('all');
  const [speed, setSpeed] = useState<number>(1);
  const [shuffleKey, setShuffleKey] = useState<number>(0);
  const [knownWords, setKnownWords] = useState<Set<string>>(() => new Set());

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
  const rawDeckWords = useMemo(() => {
    return activeIdx.flatMap((i) => decks[i]?.words ?? []);
  }, [activeIdx, decks]);

  // Xáo trộn từ khi shuffleKey thay đổi
  const deckWords = useMemo(() => {
    if (shuffleKey === 0) return rawDeckWords;
    return [...rawDeckWords].sort(() => Math.random() - 0.5);
  }, [rawDeckWords, shuffleKey]);

  // Thống kê từ đã thuộc trong bộ hiện tại
  const learnedCount = useMemo(() => {
    return deckWords.filter((w) => knownWords.has(w.en)).length;
  }, [deckWords, knownWords]);

  const unlearnedCount = deckWords.length - learnedCount;

  // Lọc theo bộ lọc
  const filteredWords = useMemo(() => {
    if (filter === 'learned') return deckWords.filter((w) => knownWords.has(w.en));
    if (filter === 'unlearned') return deckWords.filter((w) => !knownWords.has(w.en));
    return deckWords;
  }, [deckWords, filter, knownWords]);

  function handleKnown(en: string) {
    setKnownWords((prev) => {
      const next = new Set(prev);
      if (next.has(en)) next.delete(en);
      else next.add(en);
      return next;
    });
  }

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

  function handleShuffle() {
    setShuffleKey((k) => k + 1);
  }

  const activeDeckName = decks[activeIdx[0]]?.name ?? 'Flashcards 1';

  return (
    <main>
      {/* Header trang chuẩn bio-app */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/" className="bio-breadcrumb-link">← Trang chủ</Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">THẺ TỪ VỰNG 3D</span>
        </div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 900 }}>
          <span>🃏</span> Luyện tập từ vựng 3D
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: 0 }}>
          Lật thẻ 3D hai mặt tương tác chuẩn quốc tế, nghe phát âm IPA bản ngữ, ngữ cảnh câu ví dụ và mẹo đề thi.
        </p>
      </div>

      {/* Toolbar panel chuẩn bio-app với thanh chọn phần, bộ lọc, tốc độ & xáo trộn */}
      <div className="panel toolbar-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* 1. Thanh chọn phần / bộ từ */}
          <select
            value={activeIdx[0] ?? 0}
            onChange={(e) => clickDeck(Number(e.target.value))}
            className="chip-select"
            aria-label="Chọn bộ Flashcards"
          >
            {decks.map((d, i) => (
              <option key={d.name} value={i}>
                Bộ {d.name} ({d.words.length} từ)
              </option>
            ))}
          </select>

          {/* 2. Bộ lọc (Tất cả / Chưa thuộc / Đã thuộc) */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="chip-select"
            aria-label="Lọc từ vựng"
          >
            <option value="all">Tất cả từ ({deckWords.length})</option>
            <option value="unlearned">Chưa thuộc ({unlearnedCount})</option>
            <option value="learned">Đã thuộc ({learnedCount} ⭐)</option>
          </select>

          {/* 3. Tốc độ đọc */}
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="chip-select"
            aria-label="Tốc độ phát âm"
          >
            <option value={0.75}>Tốc độ: Chậm (0.75x)</option>
            <option value={1}>Tốc độ: Chuẩn (1.0x)</option>
            <option value={1.25}>Tốc độ: Nhanh (1.25x)</option>
          </select>

          {/* 4. Nút Xáo trộn */}
          <button
            type="button"
            className="topic-chip"
            onClick={handleShuffle}
            title="Xáo trộn thứ tự các từ trong bộ"
          >
            🔀 Xáo trộn
          </button>

          {/* 5. Nút Gộp bộ */}
          <button
            type="button"
            className={`topic-chip ${combine ? 'active' : ''}`}
            onClick={toggleCombine}
            title="Bật/tắt chế độ gộp nhiều bộ để học chung"
          >
            🧩 {combine ? 'Gộp bộ (đang bật)' : 'Gộp bộ'}
          </button>
        </div>

        {/* Khung danh sách bộ mở rộng khi bật chế độ Gộp bộ */}
        {combine && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border-soft)' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Chọn các bộ muốn gộp chung (đang chọn <b>{activeIdx.length}/{decks.length}</b> bộ — <b>{deckWords.length}</b> từ):
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '2px 10px', fontSize: 12, borderRadius: 999 }}
                onClick={() => setSelected(decks.map((_, i) => i))}
              >
                Chọn tất cả ({decks.length} bộ)
              </button>
            </div>
            <div className="topic-row" style={{ maxHeight: 180, overflowY: 'auto', padding: '4px 0' }}>
              {decks.map((d, i) => (
                <button
                  key={d.name}
                  type="button"
                  className={`topic-chip ${activeIdx.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDeck(i)}
                >
                  {d.name} ({d.words.length})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs chuyển chế độ luyện tập */}
      <div className="topic-row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`topic-chip ${mode === t.id ? 'active' : ''}`}
            onClick={() => setMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Hiển thị chế độ luyện tập tương ứng */}
      {loading || deckWords.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <span style={{ fontSize: 32 }}>⏳</span>
          <p style={{ marginTop: 8, color: 'var(--muted)' }}>Đang tải dữ liệu thẻ từ vựng...</p>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <span style={{ fontSize: 32 }}>📭</span>
          <p style={{ margin: '8px 0 16px', color: 'var(--muted)' }}>
            Không có từ vựng nào phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setFilter('all')}
          >
            Xem tất cả từ ({deckWords.length})
          </button>
        </div>
      ) : (
        <div key={`${mode}-${activeIdx.join(',')}-${shuffleKey}-${filter}`}>
          {mode === 'flip' && (
            <FlipMode
              words={filteredWords}
              deckName={activeDeckName}
              speed={speed}
              onKnown={handleKnown}
            />
          )}
          {mode === 'write' && <WriteMode words={filteredWords} />}
          {mode === 'listen' && <ListenMode words={filteredWords} />}
          {mode === 'match' && <MatchMode words={filteredWords} />}
          {mode === 'blast' && <BlastGame words={filteredWords} />}
        </div>
      )}
    </main>
  );
}
