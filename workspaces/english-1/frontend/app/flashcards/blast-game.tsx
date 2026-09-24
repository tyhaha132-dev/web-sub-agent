'use client';

import { useEffect, useRef, useState } from 'react';
import { saveProgress, type Word } from '../../lib/api';

type Dir = 'vi-en' | 'en-vi';
type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'setup' | 'ready' | 'playing' | 'won' | 'lost';

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

function lettersOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

function spawnFloater(words: Word[], dir: Dir, diff: Diff, speedSetting: number, level: number): Floater {
  const w = pickWord(words);
  const answer = dir === 'vi-en' ? w.en : w.vi;
  const norm = dir === 'vi-en' ? lettersOnly(w.en) : lettersOnly(normVi(w.vi));
  return {
    id: nextId++,
    prompt: dir === 'vi-en' ? w.vi : w.en,
    answer,
    norm,
    hint: makeHint(norm.length > 0 ? norm : answer, diff),
    x: 8 + Math.random() * 78,
    y: -10,
    speed: (3.2 + speedSetting * 1.4) * (1 + 0.1 * (level - 1)),
  };
}

function stepGame(s: Snap, words: Word[], dir: Dir, diff: Diff, speedSetting: number, dtMs: number, now: number): Snap {
  if (s.phase !== 'playing') return s;
  const dt = dtMs / 1000;
  const level = 1 + Math.floor(s.blasted / 5);
  let { lives, score, blasted, spawned, lastSpawn } = s;
  let floaters = s.floaters.map((f) => ({ ...f, y: f.y + f.speed * dt }));
  const interval = Math.max(900, 3000 - speedSetting * 400);

  if (spawned < WORDS_PER_GAME && floaters.length < 4 && now - lastSpawn >= interval && words.length > 0) {
    floaters = [...floaters, spawnFloater(words, dir, diff, speedSetting, level)];
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

const freshSnap = (now: number): Snap => ({
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

export default function BlastGame({ words }: { words: Word[] }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [dir, setDir] = useState<Dir>('vi-en');
  const [diff, setDiff] = useState<Diff>('hard');
  const [speedSetting, setSpeedSetting] = useState(3);
  const [snap, setSnap] = useState<Snap>(() => freshSnap(0));
  const [count, setCount] = useState(3);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      return Number(window.localStorage.getItem('blast-best') ?? 0) || 0;
    } catch {
      return 0;
    }
  });
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const wordsRef = useRef<Word[]>(words);
  wordsRef.current = words;
  const cfgRef = useRef({ dir, diff, speedSetting });
  cfgRef.current = { dir, diff, speedSetting };
  const savedRef = useRef(false);

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

  const prevRef = useRef({ blasted: 0, lives: MAX_LIVES });
  useEffect(() => {
    const p = prevRef.current;
    if (snap.blasted > p.blasted) setStreak((s) => s + 1);
    if (snap.lives < p.lives) setStreak(0);
    prevRef.current = { blasted: snap.blasted, lives: snap.lives };
  }, [snap.blasted, snap.lives]);

  useEffect(() => {
    setBest((b) => {
      const nb = Math.max(b, streak);
      try {
        window.localStorage.setItem('blast-best', String(nb));
      } catch {
        /* bỏ qua */
      }
      return nb;
    });
  }, [streak]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (count <= 0) {
      savedRef.current = false;
      setSnap(freshSnap(performance.now()));
      prevRef.current = { blasted: 0, lives: MAX_LIVES };
      setStreak(0);
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  function start() {
    if (words.length === 0) return;
    restart();
  }

  function restart() {
    savedRef.current = false;
    setStreak(0);
    prevRef.current = { blasted: 0, lives: MAX_LIVES };
    setCount(3);
    setPhase('ready');
  }

  if (phase === 'setup') {
    return (
      <div className="blast-wrap blast-breakout">
        <div className="blast-sun">🌞</div>
        <h2 className="blast-title">💥 Card Blast</h2>
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
          </button>
          <button className={`blast-opt ${diff === 'normal' ? 'selected' : ''}`} onClick={() => setDiff('normal')}>
            <h3>Bình thường</h3>
            <p>Hé 1 chữ đầu</p>
          </button>
          <button className={`blast-opt ${diff === 'hard' ? 'selected' : ''}`} onClick={() => setDiff('hard')}>
            <h3>Siêu khó</h3>
            <p>Không gợi ý gì</p>
          </button>
        </div>
        <p className="blast-label">TỐC ĐỘ RƠI — {SPEEDS.find((s) => s.v === speedSetting)?.label}</p>
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
        <button className="blast-play" onClick={start} disabled={words.length === 0}>
          {words.length === 0 ? '⏳ Đang tải từ...' : 'Chơi'}
        </button>
        <p className="blast-note">{WORDS_PER_GAME} từ trong bộ · {MAX_LIVES} mạng · nhanh dần theo cấp</p>
        <div className="blast-tip">
          <p>⌨️ Gõ đáp án rồi thôi — không cần bấm Enter, khớp là bắn.</p>
          <p>🇻🇳 Chiều Anh → Việt gõ <b>không dấu</b> vẫn tính (“cai thien” = “cải thiện”).</p>
        </div>
      </div>
    );
  }

  const target = snap.floaters.find((f) => f.id === snap.targetId) ?? null;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : 0;
  const diffLabel = diff === 'easy' ? 'DỄ' : diff === 'normal' ? 'BÌNH THƯỜNG' : 'SIÊU KHÓ';

  if (phase === 'ready') {
    return (
      <div className="blast-wrap blast-breakout">
        <div className="blast-arena blast-arena-tall">
          <div className="blast-count">
            <b>{count}</b>
            <span>SẴN SÀNG — GÕ TỪ TIẾNG ANH</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blast-wrap blast-breakout">
      <div className="blast-topbar">
        <div className="tb"><small>ĐIỂM</small><b className="gold">{snap.score}</b></div>
        <div className="tb"><small>CẤP</small><b>{snap.level}</b></div>
        <div className="tb"><small>CHUỖI · KỶ LỤC {best}</small><b>🔥 {streak} liên tục</b></div>
        <div className="spacer" />
        <span className="blast-mode-badge">{diffLabel} · TỐC ĐỘ {speedSetting}</span>
        <span className="blast-hearts">{'❤'.repeat(Math.max(snap.lives, 0))}{'🤍'.repeat(Math.max(MAX_LIVES - snap.lives, 0))}</span>
      </div>
      <div className="blast-arena blast-arena-tall">
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
        <div className="blast-ground">ĐÁY — đừng để lọt! 💥 {snap.blasted}/{WORDS_PER_GAME}</div>
      </div>
      <div className="blast-cannon">🌞</div>
      <div className="blast-inputbox">
        {snap.buffer || <span className="ph">Gõ đáp án…</span>}
      </div>
      {(snap.phase === 'won' || snap.phase === 'lost') && (
        <div className="blast-end">
          <h2>{snap.phase === 'won' ? `🏆 Thắng! ${snap.score} điểm` : `💀 Thua rồi! ${snap.blasted}/${WORDS_PER_GAME} từ`}</h2>
          <button className="blast-play" onClick={restart}>🔁 Chơi lại</button>
          <button className="btn btn-ghost" onClick={() => setPhase('setup')}>⚙️ Đổi chế độ</button>
        </div>
      )}
    </div>
  );
}
