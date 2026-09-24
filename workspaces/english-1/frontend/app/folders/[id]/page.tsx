'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildFolderQuiz,
  enrichMissing,
  knownCount,
  loadFolders,
  saveFolders,
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

type Tab = 'words' | 'flip' | 'write' | 'listen' | 'match' | 'blast' | 'quiz';

export default function FolderDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [folder, setFolder] = useState<Folder | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('words');

  useEffect(() => {
    const f = loadFolders().find((x) => x.id === id) ?? null;
    setFolder(f);
    setMissing(!f);
  }, [id]);

  function persist(next: Folder) {
    setFolder(next);
    const all = loadFolders().map((x) => (x.id === next.id ? next : x));
    saveFolders(all);
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
        saveFolders(loadFolders().map((x) => (x.id === current.id ? current : x)));
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
      <main>
        <h1>📁 Thư mục</h1>
        <div className="panel">😢 Không tìm thấy thư mục (có thể đã xóa hoặc đổi máy). <a href="/folders">Về danh sách</a></div>
      </main>
    );
  }
  if (!folder) {
    return (
      <main>
        <h1>📁 Thư mục</h1>
        <div className="panel">⏳ Đang tải...</div>
      </main>
    );
  }

  const known = knownCount(folder);
  const folderWords = folder.words.map((w) => ({ ...toWord(w), topic: folder.name }));

  return (
    <main>
      <p><a href="/folders">← Thư mục của bạn</a></p>
      <h1>📁 {folder.name}</h1>
      <div className="panel">
        <div>{folder.words.length} từ · Đã nhớ {known} · {folder.stats.attempts} lượt quiz</div>
        <div className="topic-row">
          <button className={`topic-chip ${tab === 'words' ? 'active' : ''}`} onClick={() => setTab('words')}>📝 Từ vựng</button>
          <button className={`topic-chip ${tab === 'flip' ? 'active' : ''}`} onClick={() => setTab('flip')}>🃏 Lật thẻ</button>
          <button className={`topic-chip ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>✍️ Điền từ</button>
          <button className={`topic-chip ${tab === 'listen' ? 'active' : ''}`} onClick={() => setTab('listen')}>🔊 Nghe–chép</button>
          <button className={`topic-chip ${tab === 'match' ? 'active' : ''}`} onClick={() => setTab('match')}>⚡ Ghép cặp</button>
          <button className={`topic-chip ${tab === 'blast' ? 'active' : ''}`} onClick={() => setTab('blast')}>💥 Card Blast</button>
          <button className={`topic-chip ${tab === 'quiz' ? 'active' : ''}`} onClick={() => setTab('quiz')}>🏆 Quiz</button>
        </div>
      </div>
      {tab === 'words' && (
        <>
          {folder.words.length === 0 && <div className="panel">Thư mục trống.</div>}
          {folder.words.map((w) => {
            const st = folder.status[w.en.toLowerCase()] ?? 'new';
            return (
              <div key={w.id} className="word-card">
                <h3>
                  {w.en}
                  <button className="speak-btn" title="Nghe phát âm" onClick={() => void speakWord(w)}>🔊</button>
                  {st === 'known' && <span className="badge">Đã nhớ</span>}
                  {st === 'learning' && <span className="badge">Đang học</span>}
                </h3>
                <div className="ipa">{w.ipa ? `${w.ipa} — ` : ''}{w.vi || '(chưa có nghĩa Việt)'}</div>
                {w.example && <div className="ex">“{w.example}”</div>}
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => removeWord(w.id)}>🗑️ Xóa từ</button>
                </div>
              </div>
            );
          })}
        </>
      )}
      {tab === 'flip' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, chưa luyện được.</div>
          : <FlipMode key={`flip-${folder.words.length}`} words={folderWords} onKnown={markKnown} />
      )}
      {tab === 'write' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, chưa luyện được.</div>
          : <WriteMode key={`write-${folder.words.length}`} words={folderWords} />
      )}
      {tab === 'listen' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, chưa luyện được.</div>
          : <ListenMode key={`listen-${folder.words.length}`} words={folderWords} />
      )}
      {tab === 'match' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, chưa luyện được.</div>
          : <MatchMode key={`match-${folder.words.length}`} words={folderWords} />
      )}
      {tab === 'blast' && (
        folder.words.length === 0
          ? <div className="panel">Thư mục trống, chưa luyện được.</div>
          : <BlastGame key={`blast-${folder.words.length}`} words={folderWords} saveServer={false} onDone={recordBlast} />
      )}
      {tab === 'quiz' && (
        <FolderQuiz key={`${folder.id}-${folder.words.length}`} folder={folder} onDone={recordQuiz} />
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
      <div className="panel">
        😢 Chưa đủ từ có nghĩa Việt để làm quiz (cần ít nhất 4 từ đã tra xong nghĩa).
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
    const rate = questions.length === 0 ? 0 : score / questions.length;
    const emoji = rate >= 0.8 ? '🏆 Tuyệt vời!' : rate >= 0.5 ? '💪 Khá lắm!' : '📚 Cố lên nào!';
    return (
      <div>
        <div className="score-banner">{emoji}<br />{score}/{questions.length}</div>
        <p>Đã lưu vào tiến độ thư mục này.</p>
        <button className="btn btn-primary" onClick={start}>🔁 Làm lại</button>
      </div>
    );
  }

  const q = questions[current] as QuizQuestion;
  return (
    <div>
      <h2>Câu {current + 1}/{questions.length}: “{q.en}” nghĩa là gì?</h2>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
      <p>⭐ Điểm hiện tại: {score}</p>
      {q.choices.map((c) => {
        let cls = 'choice-btn';
        if (picked !== null) {
          if (c === q.answer) cls += ' correct';
          else if (c === picked) cls += ' wrong';
        }
        return (
          <button key={c} className={cls} onClick={() => choose(c)} disabled={picked !== null}>
            {picked !== null && c === q.answer ? '✅ ' : picked !== null && c === picked ? '❌ ' : '🔹 '}{c}
          </button>
        );
      })}
      {picked !== null && <button className="btn btn-primary" onClick={next} style={{ marginTop: 12 }}>Tiếp →</button>}
    </div>
  );
}
