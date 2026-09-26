import { API_BASE } from './api';

export interface ToeicBand {
  min: number;
  max: number;
  level: string;
  focus: string;
  weekly: string;
}

export interface ToeicQuestion {
  id: number;
  prompt: string;
  choices: string[];
  passage?: string | null;
  transcript?: string | null;
  audio_text?: string | null;
  image?: string | null;
}

export interface ToeicDetail {
  id: number;
  correct: boolean;
  answer: number;
  explanation: string;
  grammar_tag: string;
}

export interface ToeicResult {
  score: number;
  total: number;
  band: ToeicBand;
  estimate: number;
  details: ToeicDetail[];
}

export interface ToeicAttempt {
  id: number;
  score: number;
  total: number;
  kind: string;
  band: string;
  meta?: string;
  errors?: ToeicError[];
  created_at: string;
}

export interface ToeicError {
  id: number;
  prompt: string;
  choice: number;
  answer: number;
  explanation: string;
  grammar_tag: string;
}

export const TOEIC_TARGET_KEY = 'toeic-target';

export async function fetchToeicLevels(): Promise<ToeicBand[]> {
  const res = await fetch(`${API_BASE}/api/toeic/levels`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`levels API responded ${res.status}`);
  const data = (await res.json()) as { levels?: ToeicBand[] };
  return data.levels ?? [];
}

export async function fetchToeicReading(count = 10, part: 5 | 6 | 7 = 5, tag = ''): Promise<ToeicQuestion[]> {
  const res = await fetch(
    `${API_BASE}/api/toeic/reading?part=${part}&count=${count}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`reading API responded ${res.status}`);
  const data = (await res.json()) as { questions?: ToeicQuestion[] };
  return data.questions ?? [];
}

export async function submitToeic(
  answers: Array<{ id: number; choice: number }>,
  kind: 'practice',
  meta = '',
  extra: { client_id?: string; duration_s?: number } = {},
): Promise<ToeicResult> {
  const res = await fetch(`${API_BASE}/api/toeic/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, kind, meta, ...extra }),
  });
  if (!res.ok) throw new Error(`submit API responded ${res.status}`);
  return (await res.json()) as ToeicResult;
}

export async function fetchToeicAttempts(clientId = ''): Promise<ToeicAttempt[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/toeic/attempts${clientId ? `?client_id=${encodeURIComponent(clientId)}` : ''}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { history?: ToeicAttempt[] };
    return data.history ?? [];
  } catch {
    return [];
  }
}

// Anonymous device profile (no passwords): client UUID identifies the device.
const CLIENT_KEY = 'toeic-client-id';

export function getClientId(): string {
  try {
    let v = window.localStorage.getItem(CLIENT_KEY) ?? '';
    if (!/^[0-9a-f-]{8,64}$/i.test(v)) {
      v = (window.crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.floor(Math.random() * 1e9)}`).slice(0, 64);
      window.localStorage.setItem(CLIENT_KEY, v);
    }
    return v;
  } catch {
    return 'dev-anon';
  }
}

export interface ToeicProfile {
  client_id: string;
  display_name: string;
  target_score: number;
}

export async function fetchToeicProfile(clientId: string): Promise<ToeicProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/api/toeic/profile?client_id=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ToeicProfile;
  } catch {
    return null;
  }
}

export async function saveToeicProfile(p: ToeicProfile): Promise<void> {
  await fetch(`${API_BASE}/api/toeic/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
}

// Study streak: consecutive UTC days with >=1 attempt, ending today/yesterday.
export function computeStreak(attempts: ToeicAttempt[]): number {
  const days = new Set(
    attempts.map((a) => {
      const d = new Date(a.created_at);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }),
  );
  days.delete('');
  let streak = 0;
  const cur = new Date();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  if (!days.has(key(cur))) cur.setUTCDate(cur.getUTCDate() - 1);
  while (days.has(key(cur))) {
    streak += 1;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

export function avgSecondsPerQ(attempts: ToeicAttempt[]): number | null {
  let secs = 0;
  let qs = 0;
  for (const a of attempts) {
    const d = (a as { duration_s?: number }).duration_s ?? 0;
    if (d > 0 && a.total > 0) {
      secs += d;
      qs += a.total;
    }
  }
  return qs === 0 ? null : Math.round(secs / qs);
}

export function formatPassage(p: string): string {
  return p.replace(/\\n/g, '\n');
}

export function loadToeicTarget(): number {
  try {
    const v = Number(window.localStorage.getItem(TOEIC_TARGET_KEY));
    return [500, 600, 700, 800, 900].includes(v) ? v : 700;
  } catch {
    return 700;
  }
}

export function saveToeicTarget(v: number): void {
  try {
    window.localStorage.setItem(TOEIC_TARGET_KEY, String(v));
  } catch { /* trình duyệt chặn storage */ }
}

// Phase 1.3: weekly tasks per band level (manual checklist + auto hints).
export const WEEKLY_TASKS: Record<string, string[]> = {
  Starter: ['Làm 3 đề Part 5', 'Đạt ≥40% một đề', 'Ôn lại 10 câu sai', 'Học 20 từ vựng công sở'],
  Beginner: ['Làm 3 đề Part 5/6', 'Đạt ≥50% một đề', '1 đề Part 7 (đoạn ngắn)', 'Ôn nhật ký lỗi'],
  Intermediate: ['2 đề Part 5/6 bấm giờ', 'Đạt ≥60% một đề', '2 đoạn Part 7', 'Ôn lỗi theo tag ngữ pháp'],
  'Upper-Intermediate': ['1 đề full Part 5–7', 'Đạt ≥70%', 'Ghi nhật ký lỗi theo part', 'Luyện đoạn văn dài'],
  Advanced: ['2 đề full/tuần', 'Đạt ≥80%', 'Diệt điểm yếu theo part yếu nhất', 'Luyện tốc độ đọc'],
  Expert: ['1 đề full duy trì', 'Ôn collocation chuyên ngành', 'Đọc 2 văn bản kinh doanh thật', 'Giữ streak học'],
};

const WEEK_KEY = 'toeic-week';

export function loadWeekDone(level: string): number[] {
  try {
    const raw = window.localStorage.getItem(`${WEEK_KEY}-${level}`);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export function toggleWeekDone(level: string, idx: number): number[] {
  const done = loadWeekDone(level);
  const next = done.includes(idx) ? done.filter((x) => x !== idx) : [...done, idx];
  try {
    window.localStorage.setItem(`${WEEK_KEY}-${level}`, JSON.stringify(next));
  } catch { /* trình duyệt chặn storage */ }
  return next;
}

export function resetWeekDone(level: string): void {
  try {
    window.localStorage.removeItem(`${WEEK_KEY}-${level}`);
  } catch { /* trình duyệt chặn storage */ }
}

// Phase 2.3: grammar modules mapped to bank grammar_tag values.
export interface GrammarModule {
  tag: string;
  title: string;
  rule: string;
}

export const GRAMMAR_MODULES: GrammarModule[] = [
  { tag: 'tenses', title: 'Thì động từ', rule: 'Mốc quá khứ (yesterday, last week) → quá khứ đơn/bị động; hành động xong trước mốc quá khứ khác → quá khứ hoàn thành.' },
  { tag: 'prepositions', title: 'Giới từ', rule: 'by + deadline, since + mốc, for + khoảng thời gian, on + ngày, in + lĩnh vực, complain about, responsible for, invest in.' },
  { tag: 'word-forms', title: 'Dạng từ', rule: 'Tính từ + danh từ (competitive salary); trạng từ + tính từ (temporarily unavailable); sau will là V nguyên mẫu.' },
  { tag: 'conjunctions', title: 'Liên từ', rule: 'Despite/Due to + cụm danh từ; If + mệnh đề; so + adv + that; since = vì.' },
  { tag: 'passive', title: 'Bị động', rule: 'be + V3. Chủ ngữ nhận hành động + mốc quá khứ → was/were + V3.' },
  { tag: 'conditionals', title: 'Câu điều kiện', rule: 'Loại 1: If + hiện tại, will + V. Đảo ngữ: Should you need... = If you need...' },
  { tag: 'agreement', title: 'Hòa hợp chủ-vị', rule: 'Neither...nor chia theo chủ ngữ gần nhất; danh từ số nhiều cần động từ số nhiều.' },
  { tag: 'gerunds', title: 'Danh động từ', rule: 'Look forward to, apologize for, responsible for + V-ing.' },
];

// Phase 3.1: reading raw pct -> TOEIC Reading estimate 5-495 (ETS-ish, UOC TINH).
export function readingScale(pct: number): number {
  const t: Array<[number, number]> = [
    [0.95, 495], [0.9, 450], [0.85, 400], [0.8, 355], [0.75, 310], [0.7, 275],
    [0.65, 240], [0.6, 210], [0.55, 180], [0.5, 150], [0.45, 120], [0.4, 95],
    [0.35, 70], [0.3, 50], [0.25, 30],
  ];
  for (const [p, s] of t) if (pct >= p) return s;
  return 5;
}

// Phase 2.1: SM-2 lite SRS stored in localStorage.
export interface SrsState {
  ef: number;
  interval: number;
  due: number;
  lapses: number;
}

const SRS_KEY = 'toeic-srs';

export function loadSrs(): Record<string, SrsState> {
  try {
    const raw = window.localStorage.getItem(SRS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : {};
    return typeof v === 'object' && v !== null ? (v as Record<string, SrsState>) : {};
  } catch {
    return {};
  }
}

function saveSrs(s: Record<string, SrsState>): void {
  try {
    window.localStorage.setItem(SRS_KEY, JSON.stringify(s));
  } catch { /* trình duyệt chặn storage */ }
}

// grade: 0 forgot, 1 hazy, 2 remembered, 3 mastered.
export function gradeSrs(id: string | number, grade: number): SrsState {
  const all = loadSrs();
  const cur = all[String(id)] ?? { ef: 2.5, interval: 0, due: 0, lapses: 0 };
  const day = 86400000;
  let { ef, interval, lapses } = cur;
  if (grade <= 0) {
    lapses += 1;
    ef = Math.max(1.3, ef - 0.2);
    interval = 1;
  } else if (grade === 1) {
    ef = Math.max(1.3, ef - 0.1);
    interval = Math.max(1, Math.round(interval / 2));
  } else {
    ef = Math.min(3, ef + (grade === 3 ? 0.15 : 0));
    interval = interval === 0 ? 1 : interval === 1 ? 3 : Math.min(125, Math.round(interval * ef));
  }
  const next = { ef, interval, lapses, due: Date.now() + interval * day };
  all[String(id)] = next;
  saveSrs(all);
  return next;
}
