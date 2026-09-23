'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchWords, saveProgress, type Word } from '../../lib/api';

type Dir = 'vi-en' | 'en-vi';
type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'setup' | 'playing' | 'won' | 'lost';

const WORDS_PER_GAME = 20;
const MAX_LIVES = 3;
const GROUND_Y = 86;

interface Floater {
  id: number;
  prompt: string;
  answer: string;
  norm: string;
  hint: string;
  x: number;
  y: number;
  speed: number;
}

interface Boom { id: number; x: number; y: number; at: number; }

interface Snap {
  floaters: Floater[];
  booms: Boom[];
  buffer: string;
  targetId: number | null;
  badUntil: number;
  lives: number;
  score: number;
  blasted: number;
  spawned: number;
  level: number;
  lastSpawn: number;
  phase: Phase;
}

const SPEEDS = [
  { v: 1, label: 'Chậm' },
  { v: 2, label: 'Ổn định' },
  { v: 3, label: 'Nhanh' },
  { v: 4, label: 'Rất nhanh' },
  { v: 5, label: 'Cực nhanh' },
];

function normVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function makeHint(answer: string, diff: Diff): string {
  if (diff === 'hard') return '';
  const keep = diff === 'easy' ? 2 : 1;
  return [...answer].map((c, i) => (i < keep ? c : '_')).join(' ');
}

function pickWord(words: Word[]): Word {
  return words[Math.floor(Math.random() * words.length)] as Word;
}

let nextId = 1;

function spawnFloater(words: Word[], dir: Dir, diff: Diff, speedSetting: number, level: number, now: number): Floater {
  const w = pickWord(words);
  const answer = dir === 'vi-en' ? w.en : w.vi;
  const norm = dir === 'vi-en' ? w.en.toLowerCase() : normVi(w.vi);
  return {
    id: nextId++,
    prompt: dir === 'vi-en' ? w.vi : w.en,
    answer,
    norm,
    hint: makeHint(answer, diff),
    x: 8 + Math.random() * 78,
    y: -10,
    speed: (4.5 + speedSetting * 2) * (1 + 0.12 * (level - 1)),
  };
}

function stepGame(s: Snap, words: Word[], dir: Dir, diff: Diff, speedSetting: number, dtMs: number, now: number): Snap {
  if (s.phase !== 'playing') return s;
  const dt = dtMs / 1000;
  const level = 1 + Math.floor(s.blasted / 5);
  let { lives, score, blasted, spawned, lastSpawn } = s;
  let floaters = s.floaters.map((f) => ({ ...f, y: f.y + f.speed * dt }));
  const interval = Math.max(600, 2400 - speedSetting * 350);

  if (spawned < WORDS_PER_GAME && floaters.length < 4 && now - lastSpawn >= interval && words.length > 0) {
    floaters = [...floaters, spawnFloater(words, dir, diff, speedSetting, level, now)];
    spawned += 1;
    lastSpawn = now;
  }

  const survived = floaters.filter((f) => f.y < GROUND_Y);
  const fallen = floaters.length - survived.length;
  if (fallen > 0) lives -= fallen;
  floaters = survived;

  let phase: Phase = 'playing';
  if (lives <= 0) {
    lives = 0;
    phase = 'lost';
  } else if (spawned >= WORDS_PER_GAME && floaters.length === 0 && s.spawned > 0) {
    phase = 'won';
  }

  const booms = s.booms.filter((b) => now - b.at < 500);
  let { buffer, targetId } = s;
  if (targetId !== null && !floaters.some((f) => f.id === targetId)) {
    targetId = null;
    buffer = '';
  }

  return { ...s, floaters, booms, buffer, targetId, lives, score, blasted, spawned, level, lastSpawn, phase };
}

function typeChar(s: Snap, ch: string, now: number): Snap {
  if (s.phase !== 'playing') return s;
  const buffer = s.buffer + ch;
  const candidates = s.floaters.filter((f) => f.norm.startsWith(buffer));
  if (candidates.length === 0) {
    return { ...s, badUntil: now + 300 };
  }
  const still = s.targetId !== null && candidates.some((f) => f.id === s.targetId);
  const target = still
    ? (s.floaters.find((f) => f.id === s.targetId) as Floater)
    : (candidates[0] as Floater);
  if (target.norm === buffer) {
    return {
      ...s,
      floaters: s.floaters.filter((f) => f.id !== target.id),
      booms: [...s.booms, { id: nextId++, x: target.x, y: Math.max(target.y, 4), at: now }],
      buffer: '',
      targetId: null,
      score: s.score + 10 * s.level,
      blasted: s.blasted + 1,
    };
  }
  return { ...s, buffer, targetId: target.id };
}

function backspace(s: Snap): Snap {
  if (s.phase !== 'playing' || s.buffer.length === 0) return s;
  const buffer = s.buffer.slice(0, -1);
  const targetId =
    buffer.length === 0
      ? null
      : (s.floaters.find((f) => f.norm.startsWith(buffer))?.id ?? null);
  return { ...s, buffer, targetId };
}

const initialSnap = (now: number): Snap => ({
  floaters: [],
  booms: [],
  buffer: '',
  targetId: null,
  badUntil: 0,
  lives: MAX_LIVES,
  score: 0,
  blasted: 0,
  spawned: 0,
  level: 1,
  lastSpawn: now,
  phase: 'playing',
});

export default function Blast() {
  const [words, setWords] = useState<Word[]>([]);
  const [phase, setPhase] = useState<Phase>('setup');
  const [dir, setDir] = useState<Dir>('vi-en');
  const [diff, setDiff] = useState<Diff>('hard');
  const [speedSetting, setSpeedSetting] = useState(3);
  const [snap, setSnap] = useState<Snap>(() => initialSnap(0));
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const wordsRef = useRef<Word[]>(words);
  wordsRef.current = words;
  const cfgRef = useRef({ dir, diff, speedSetting });
  cfgRef.current = { dir, diff, speedSetting };
  const savedRef = useRef(false);

  useEffect(() => {
    fetchWords().then(setWords).catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(t - last, 200);
      last = t;
      const cfg = cfgRef.current;
      setSnap((prev) => stepGame(prev, wordsRef.current, cfg.dir, cfg.diff, cfg.speedSetting, dt, t));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        setSnap((prev) => backspace(prev));
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        setSnap((prev) => typeChar(prev, e.key.toLowerCase(), performance.now()));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  useEffect(() => {
    if ((snap.phase === 'won' || snap.phase === 'lost') && !savedRef.current) {
      savedRef.current = true;
      setPhase(snap.phase);
      saveProgress(snap.blasted, WORDS_PER_GAME).catch(() => {});
    }
  }, [snap.phase, snap.blasted]);

  function start() {
    if (words.length === 0) return;
    savedRef.current = false;
    setSnap(initialSnap(performance.now()));
    setPhase('playing');
  }

  if (phase === 'setup' || words.length === 0) {
    return (
      <main>
        <div className="blast-wrap">
          <div className="blast-sun">🌞</div>
          <h1 className="blast-title">Card Blast</h1>
          <p className="blast-sub">
            Chữ rơi từ trên xuống — <b>gõ đáp án</b> là tàu tự bắn hạ.
            Để lọt một từ xuống đáy là mất một mạng.
          </p>
          <div className="blast-opt-row">
            <button className={`blast-opt ${dir === 'vi-en' ? 'selected' : ''}`} onClick={() => setDir('vi-en')}>
              <h3>Việt → Anh</h3>
              <p>Nghĩa rơi xuống · gõ từ tiếng Anh</p>
            </button>
            <button className={`blast-opt ${dir === 'en-vi' ? 'selected' : ''}`} onClick={() => setDir('en-vi')}>
              <h3>Anh → Việt</h3>
              <p>Từ rơi xuống · gõ nghĩa tiếng Việt</p>
            </button>
          </div>
          <p className="blast-label">MỨC ĐỘ</p>
          <div className="blast-opt-row">
            <button className={`blast-opt ${diff === 'easy' ? 'selected' : ''}`} onClick={() => setDiff('easy')}>
              <h3>Dễ</h3>
              <p>Hé 2 chữ đầu</p>
              <p>i m _ _ _ _</p>
            </button>
            <button className={`blast-opt ${diff === 'normal' ? 'selected' : ''}`} onClick={() => setDiff('normal')}>
              <h3>Bình thường</h3>
              <p>Hé 1 chữ đầu</p>
              <p>i _ _ _ _ _</p>
            </button>
            <button className={`blast-opt ${diff === 'hard' ? 'selected' : ''}`} onClick={() => setDiff('hard')}>
              <h3>Siêu khó</h3>
              <p>Không gợi ý gì</p>
              <p>không có ô nào</p>
            </button>
          </div>
          <p className="blast-label">TỐC ĐỘ RƠI{SPEEDS.find((s) => s.v === speedSetting)?.label ? ` — ${SPEEDS.find((s) => s.v === speedSetting)?.label}` : ''}</p>
          <div className="blast-speed-row">
            {SPEEDS.map((s) => (
              <button
                key={s.v}
                className={`blast-speed ${speedSetting === s.v ? 'selected' : ''}`}
                onClick={() => setSpeedSetting(s.v)}
              >
                <div className="bar" style={{ height: 6 + s.v * 7 }} />
                {s.v}
              </button>
            ))}
          </div>
          <button className="blast-play" onClick={start}>Chơi</button>
          <p className="blast-note">{WORDS_PER_GAME} từ trong bộ · {MAX_LIVES} mạng · nhanh dần theo cấp</p>
          <div className="blast-tip">
            <p>⌨️ Gõ đáp án rồi thôi — không cần bấm Enter, khớp là bắn.</p>
            <p>🇻🇳 Chiều Anh → Việt gõ <b>không dấu</b> vẫn tính (“cai thien” = “cải thiện”).</p>
            <p>🎯 Từ đang gõ đỏ sáng vàng kèm vạch tiến độ — nhìn vào đó để gõ tiếp.</p>
          </div>
        </div>
      </main>
    );
  }

  const target = snap.floaters.find((f) => f.id === snap.targetId) ?? null;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;

  return (
    <main>
      <div className="blast-wrap">
        <div className="blast-hud">
          <span>❤ {'❤'.repeat(Math.max(snap.lives, 0))}{'🤍'.repeat(Math.max(MAX_LIVES - snap.lives, 0))}</span>
          <span>⭐ {snap.score}</span>
          <span>🎖️ Cấp {snap.level}</span>
          <span>💥 {snap.blasted}/{WORDS_PER_GAME}</span>
        </div>
        <div className="blast-arena">
          {snap.floaters.map((f) => {
            const isTarget = f.id === snap.targetId;
            const typedLen = isTarget ? snap.buffer.length : 0;
            return (
              <div
                key={f.id}
                className={`floater ${isTarget ? 'target' : ''} ${nowMs < snap.badUntil && isTarget ? 'bad' : ''}`}
                style={{ left: `${f.x}%`, top: `${Math.max(f.y, 0)}%` }}
              >
                <div className="prompt">{f.prompt}</div>
                {f.hint && <div className="hint">{f.hint}</div>}
                {isTarget && (
                  <div className="bar"><div style={{ width: `${(typedLen / f.norm.length) * 100}%` }} /></div>
                )}
              </div>
            );
          })}
          {snap.booms.map((b) => (
            <div key={b.id} className="floater-boom" style={{ left: `${b.x}%`, top: `${Math.max(b.y, 0)}%` }}>💥</div>
          ))}
          <div className="blast-ground">ĐÁY — đừng để lọt!</div>
        </div>
        <div className="blast-buffer">
          {snap.buffer || <span className="blast-buffer-empty">gõ đáp án… (không cần Enter)</span>}
        </div>
        {(snap.phase === 'won' || snap.phase === 'lost') && (
          <div className="blast-end">
            <h2>{snap.phase === 'won' ? `🏆 Thắng! ${snap.score} điểm` : `💀 Thua rồi! ${snap.blasted}/${WORDS_PER_GAME} từ`}</h2>
            <button className="blast-play" onClick={() => { savedRef.current = false; setSnap(initialSnap(performance.now())); }}>🔁 Chơi lại</button>
            <button className="btn btn-ghost" onClick={() => setPhase('setup')}>⚙️ Đổi chế độ</button>
          </div>
        )}
        {target === null && snap.phase === 'playing' && null}
      </div>
    </main>
  );
}
