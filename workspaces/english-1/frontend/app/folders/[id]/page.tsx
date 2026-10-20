'use client';

import { toast } from '../../../lib/toast';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  buildFolderQuiz,
  enrichMissing,
  exportFolderToExcel,
  fetchFolders,
  knownCount,
  putFolder,
  toWord,
  type Folder,
} from '../../../lib/folders';
import { fetchAudio, playAudio } from '../../../lib/api';
import type { QuizQuestion } from '../../../lib/api';
import { FlipMode } from '../../flashcards/flip-mode';
import { WriteMode } from '../../flashcards/write-mode';
import { ListenMode } from '../../flashcards/listen-mode';
import { MatchMode } from '../../flashcards/match-mode';
import BlastGame from '../../flashcards/blast-game';
import ImportModal from '../import-modal';
import { MAX_FOLDER_WORDS, type ImportEntry } from '../../../lib/folders';

type Tab = 'words' | 'flip' | 'write' | 'listen' | 'match' | 'blast' | 'quiz';

export default function FolderDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [folder, setFolder] = useState<Folder | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('words');
  const [showAppend, setShowAppend] = useState(false);
  const [searchWord, setSearchWord] = useState('');

  useEffect(() => {
    fetchFolders()
      .then((all) => {
        const f = all.find((x) => x.id === id) ?? null;
        setFolder(f);
        setMissing(!f);
      })
      .catch(() => setMissing(true));
  }, [id]);

  function persist(next: Folder) {
    const prev = folder;
    setFolder(next);
    putFolder(next).catch(() => {
      if (prev) setFolder(prev);
    });
  }

  // làm giàu lặng lẽ: điền nghĩa/audio còn thiếu khi mở thư mục
  useEffect(() => {
    if (!folder || folder.words.every((w) => w.vi && w.audio)) return;
    const signal = { cancelled: false };
    let current: Folder = folder;
    enrichMissing(
      folder.words,
      (en, patch) => {
        if (signal.cancelled) return;
        const key = en.toLowerCase();
        current = {
          ...current,
          words: current.words.map((w) => (w.en.toLowerCase() === key ? { ...w, ...patch } : w)),
        };
        setFolder(current);
        putFolder(current).catch(() => {});
      },
      signal,
    );
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder?.id]);

  // bấm loa: có audio thì phát ngay, chưa có thì lấy 1 lần rồi lưu lại
  async function speakWord(w: { en: string; audio: string }) {
    if (w.audio) {
      playAudio(w.audio, w.en);
      return;
    }
    const a = await fetchAudio(w.en);
    if (a) {
      const key = w.en.toLowerCase();
      const next = folder
        ? { ...folder, words: folder.words.map((x) => (x.en.toLowerCase() === key ? { ...x, audio: a } : x)) }
        : null;
      if (next) persist(next);
      playAudio(a, w.en);
    } else {
      playAudio(null, w.en);
    }
  }

  function appendEntries(entries: ImportEntry[]) {
    if (!folder || entries.length === 0) return;
    const have = new Set(folder.words.map((w) => w.en.toLowerCase()));
    const base = Date.now();
    const fresh = entries
      .filter((e) => !have.has(e.en.toLowerCase()))
      .slice(0, Math.max(MAX_FOLDER_WORDS - folder.words.length, 0))
      .map((e, i) => ({ id: base + i, en: e.en, vi: e.vi, ipa: e.ipa, example: e.example, audio: '' }));
    if (fresh.length === 0) return;
    persist({ ...folder, words: [...folder.words, ...fresh] });
    setShowAppend(false);
  }

  function removeWord(wordId: number) {
    if (!folder) return;
    persist({ ...folder, words: folder.words.filter((w) => w.id !== wordId) });
  }

  function recordBlast(blasted: number, total: number) {
    if (!folder) return;
    persist({
      ...folder,
      stats: {
        attempts: folder.stats.attempts + 1,
        correct: folder.stats.correct + blasted,
        total: folder.stats.total + total,
      },
    });
  }

  function markKnown(en: string) {
    if (!folder) return;
    const key = en.toLowerCase();
    if (folder.status[key] === 'known') return;
    persist({ ...folder, status: { ...folder.status, [key]: 'known' } });
  }

  function recordQuiz(score: number, total: number, answers: Array<{ en: string; ok: boolean }>) {
    if (!folder) return;
    const status = { ...folder.status };
    for (const a of answers) {
      const key = a.en.toLowerCase();
      if (a.ok) status[key] = 'known';
      else if (status[key] !== 'known') status[key] = 'learning';
    }
    persist({
      ...folder,
      status,
      stats: {
        attempts: folder.stats.attempts + 1,
        correct: folder.stats.correct + score,
        total: folder.stats.total + total,
      },
    });
  }

  if (missing) {
    return (
      <main className="page" style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center', padding: '60px 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😢</div>
        <h2>Không tìm thấy thư mục</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Thư mục này có thể đã bị xóa hoặc không thuộc tài khoản hiện tại.</p>
        <Link
          href="/folders"
          style={{
            padding: '10px 22px',
            borderRadius: 9999,
            background: '#0f172a',
            color: '#fff',
            fontWeight: 600,
            display: 'inline-block',
          }}
        >
          ← Quay lại danh sách thư mục
        </Link>
      </main>
    );
  }

  if (!folder) {
    return (
      <main className="page" style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center', padding: '60px 16px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div>Đang tải nội dung thư mục...</div>
      </main>
    );
  }

  const known = knownCount(folder);
  const rate = folder.words.length === 0 ? 0 : Math.round((known / folder.words.length) * 100);
  const folderWords = folder.words.map((w) => ({ ...toWord(w), topic: folder.name }));

  const filteredWords = folder.words.filter((w) => {
    if (!searchWord.trim()) return true;
    const s = searchWord.toLowerCase().trim();
    return w.en.toLowerCase().includes(s) || (w.vi && w.vi.toLowerCase().includes(s));
  });

  return (
    <main className="page" style={{ maxWidth: 1160, margin: '0 auto', paddingBottom: 64 }}>
      {/* Breadcrumb Cirrus */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/folders" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          ← Thư mục của bạn
        </Link>
        <span style={{ color: 'var(--muted)', margin: '0 8px', fontSize: 13 }}>/</span>
        <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>{folder.name.toUpperCase()}</span>
      </div>

      {/* Header Panel Cirrus */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: 'var(--card-shadow)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="category-pill" style={{ marginBottom: 8, display: 'inline-block' }}>
              📁 BỘ TỪ VỰNG RIÊNG
            </span>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: '4px 0 8px' }}>
              {folder.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: 'var(--muted)', fontSize: 14 }}>
              <span><b>{folder.words.length}</b> từ vựng</span>
              <span>•</span>
              <span>Đã nhớ <b>{known}</b> từ ({rate}%)</span>
              <span>•</span>
              <span><b>{folder.stats.attempts}</b> lượt luyện</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAppend(true)}
              style={{
                padding: '9px 18px',
                borderRadius: 9999,
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>➕</span> Thêm từ mới
            </button>
            <button
              onClick={() => exportFolderToExcel(folder)}
              title="Xuất danh sách từ vựng ra file Excel (.xlsx)"
              style={{
                padding: '9px 18px',
                borderRadius: 9999,
                background: 'var(--surface-2)',
                color: 'var(--ink)',
                border: '1px solid var(--border-soft)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📥</span> Xuất Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs Cirrus */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-soft)' }}>
          <button
            className={`topic-chip ${tab === 'words' ? 'active' : ''}`}
            onClick={() => setTab('words')}
          >
            📝 Danh sách ({folder.words.length})
          </button>
          <button
            className={`topic-chip ${tab === 'flip' ? 'active' : ''}`}
            onClick={() => setTab('flip')}
          >
            🃏 Lật thẻ 3D
          </button>
          <button
            className={`topic-chip ${tab === 'write' ? 'active' : ''}`}
            onClick={() => setTab('write')}
          >
            ✍️ Điền từ
          </button>
          <button
            className={`topic-chip ${tab === 'listen' ? 'active' : ''}`}
            onClick={() => setTab('listen')}
          >
            🔊 Nghe–chép
          </button>
          <button
            className={`topic-chip ${tab === 'match' ? 'active' : ''}`}
            onClick={() => setTab('match')}
          >
            ⚡ Ghép cặp
          </button>
          <button
            className={`topic-chip ${tab === 'blast' ? 'active' : ''}`}
            onClick={() => setTab('blast')}
          >
            💥 Card Blast
          </button>
          <button
            className={`topic-chip ${tab === 'quiz' ? 'active' : ''}`}
            onClick={() => setTab('quiz')}
          >
            🏆 Quiz
          </button>
        </div>
      </div>

      {/* Tab 1: Words List */}
      {tab === 'words' && (
        <>
          {folder.words.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <input
                type="text"
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                placeholder="🔍 Tìm nhanh từ trong thư mục này..."
                style={{
                  padding: '9px 16px',
                  borderRadius: 9999,
                  border: '1px solid var(--border-soft)',
                  background: 'var(--input-bg)',
                  color: 'var(--ink)',
                  fontSize: 14,
                  minWidth: 260,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Hiển thị {filteredWords.length}/{folder.words.length} từ
              </span>
            </div>
          )}

          {folder.words.length === 0 ? (
            <div
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 18,
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--muted)',
              }}
            >
              Thư mục đang trống. Bấm <b>➕ Thêm từ mới</b> để thêm từ vựng nhé!
            </div>
          ) : filteredWords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted)' }}>
              Không tìm thấy từ vựng nào khớp với từ khóa tìm kiếm.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredWords.map((w) => {
                const st = folder.status[w.en.toLowerCase()] ?? 'new';
                return (
                  <div
                    key={w.id}
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: 16,
                      padding: '18px 20px',
                      boxShadow: 'var(--card-shadow)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--heading)' }}>
                          {w.en}
                        </span>
                        <button
                          className="speak-btn"
                          title="Nghe phát âm"
                          onClick={() => void speakWord(w)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: '1px solid var(--border-soft)',
                            background: 'var(--surface-2)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                          }}
                        >
                          🔊
                        </button>
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 9999,
                          background: st === 'known' ? '#ecfdf5' : st === 'learning' ? '#fef3c7' : 'var(--surface-2)',
                          color: st === 'known' ? '#059669' : st === 'learning' ? '#d97706' : 'var(--muted)',
                          border: `1px solid ${st === 'known' ? '#a7f3d0' : st === 'learning' ? '#fde68a' : 'var(--border-soft)'}`,
                        }}
                      >
                        {st === 'known' ? '⭐ Đã thuộc' : st === 'learning' ? '⚡ Đang học' : '🌱 Mới'}
                      </span>
                    </div>

                    <div style={{ margin: '8px 0 6px', fontSize: 14 }}>
                      {w.ipa && <span style={{ color: '#0284c7', marginRight: 8, fontFamily: 'monospace' }}>{w.ipa}</span>}
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{w.vi || '(Chưa có nghĩa Việt)'}</span>
                    </div>

                    {w.example && (
                      <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', margin: '4px 0 12px' }}>
                        “{w.example}”
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => removeWord(w.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted)',
                          fontSize: 12,
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: 6,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                      >
                        🗑️ Xóa từ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Flip 3D */}
      {tab === 'flip' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, hãy thêm từ trước khi luyện tập.</div>
          : <FlipMode key={`flip-${folder.words.length}`} words={folderWords} onKnown={markKnown} />
      )}

      {/* Tab 3: Write */}
      {tab === 'write' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, hãy thêm từ trước khi luyện tập.</div>
          : <WriteMode key={`write-${folder.words.length}`} words={folderWords} />
      )}

      {/* Tab 4: Listen */}
      {tab === 'listen' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, hãy thêm từ trước khi luyện tập.</div>
          : <ListenMode key={`listen-${folder.words.length}`} words={folderWords} />
      )}

      {/* Tab 5: Match */}
      {tab === 'match' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, hãy thêm từ trước khi luyện tập.</div>
          : <MatchMode key={`match-${folder.words.length}`} words={folderWords} />
      )}

      {/* Tab 6: Blast */}
      {tab === 'blast' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, hãy thêm từ trước khi luyện tập.</div>
          : <BlastGame key={`blast-${folder.words.length}`} words={folderWords} saveServer={false} onDone={recordBlast} />
      )}

      {/* Tab 7: Quiz */}
      {tab === 'quiz' && (
        <FolderQuiz key={`${folder.id}-${folder.words.length}`} folder={folder} onDone={recordQuiz} />
      )}

      {showAppend && (
        <ImportModal
          mode="append"
          existingCount={folder.words.length}
          existingKeys={new Set(folder.words.map((w) => w.en.toLowerCase()))}
          onClose={() => setShowAppend(false)}
          onSaveEntries={(entries) => appendEntries(entries)}
        />
      )}
    </main>
  );
}

function FolderQuiz({
  folder,
  onDone,
}: {
  folder: Folder;
  onDone: (score: number, total: number, answers: Array<{ en: string; ok: boolean }>) => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<Array<{ en: string; ok: boolean }>>([]);
  const savedRef = useRef(false);

  function start() {
    const q = buildFolderQuiz(folder.words, 10);
    setQuestions(q);
    setCurrent(0);
    setScore(0);
    setDone(false);
    setPicked(null);
    setAnswers([]);
    savedRef.current = false;
  }

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (questions.length === 0) {
    return (
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-soft)',
          borderRadius: 18,
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--muted)',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
        Chưa đủ từ có nghĩa tiếng Việt để làm quiz (cần ít nhất 4 từ có nghĩa).
      </div>
    );
  }

  function choose(choice: string) {
    if (picked !== null) return;
    const q = questions[current];
    if (!q) return;
    const ok = q.answer === choice;
    setPicked(choice);
    if (ok) setScore((s) => s + 1);
    setAnswers((a) => [...a, { en: q.en, ok }]);
  }

  function next() {
    if (current + 1 >= questions.length) {
      setDone(true);
      if (!savedRef.current) {
        savedRef.current = true;
        const finalAnswers = answers;
        const finalScore = score;
        setTimeout(() => onDone(finalScore, questions.length, finalAnswers), 0);
      }
      return;
    }
    setCurrent((c) => c + 1);
    setPicked(null);
  }

  if (done) {
    const rate = questions.length === 0 ? 0 : Math.round((score / questions.length) * 100);
    const emoji = rate >= 80 ? '🏆 Tuyệt vời!' : rate >= 50 ? '💪 Khá lắm!' : '📚 Cố lên nào!';
    return (
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: '40px 24px',
          textAlign: 'center',
          maxWidth: 600,
          margin: '0 auto',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="score-banner" style={{ margin: '0 auto 16px' }}>
          {emoji}<br />{score}/{questions.length} ({rate}%)
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 24 }}>
          Kết quả đã được tự động lưu vào tiến độ ghi nhớ của thư mục này.
        </p>
        <button
          onClick={start}
          style={{
            padding: '11px 26px',
            borderRadius: 9999,
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          🔁 Làm lại bài quiz
        </button>
      </div>
    );
  }

  const q = questions[current] as QuizQuestion;
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border-soft)',
        borderRadius: 20,
        padding: '28px',
        maxWidth: 680,
        margin: '0 auto',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>
          CÂU HỎI {current + 1} / {questions.length}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0284c7' }}>
          ⭐ Điểm: {score}
        </span>
      </div>

      <div className="progress-track" style={{ height: 6, marginBottom: 20 }}>
        <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 20px', textAlign: 'center' }}>
        Từ “<span style={{ color: '#0284c7' }}>{q.en}</span>” có nghĩa là gì?
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.choices.map((c, idx) => {
          let cls = 'choice-btn';
          if (picked !== null) {
            if (c === q.answer) cls += ' correct';
            else if (c === picked) cls += ' wrong';
          }
          return (
            <button
              key={c}
              className={cls}
              onClick={() => choose(c)}
              disabled={picked !== null}
              style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span className="choice-badge">{String.fromCharCode(65 + idx)}</span>
              <span style={{ flex: 1 }}>{c}</span>
              {picked !== null && c === q.answer && <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Đúng</span>}
              {picked !== null && c === picked && c !== q.answer && <span style={{ color: '#ef4444', fontWeight: 700 }}>✗ Sai</span>}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            onClick={next}
            style={{
              padding: '10px 24px',
              borderRadius: 9999,
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {current + 1 >= questions.length ? 'Xem kết quả →' : 'Câu tiếp theo →'}
          </button>
        </div>
      )}
    </div>
  );
}