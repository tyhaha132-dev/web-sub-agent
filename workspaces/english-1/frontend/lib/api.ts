import { authFetch } from './auth';

export interface Word {
  id: number;
  en: string;
  vi: string;
  example: string;
  topic: string;
  ipa: string;
}

export interface Topic {
  topic: string;
  total: number;
}

export interface QuizQuestion {
  en: string;
  choices: string[];
  answer: string;
}

export interface ExternalMeaning {
  pos: string;
  definition: string;
  example: string;
}

export interface ExternalEntry {
  word: string;
  phonetic: string;
  audio: string;
  meanings: ExternalMeaning[];
  sourceUrl: string;
  provider: string;
}

export interface LookupResult {
  source: 'db' | 'external' | 'none';
  words: Word[];
  external: ExternalEntry | null;
  query: string;
}

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export const SAMPLE_WORDS: Word[] = [
  { id: 1, en: 'apple', vi: 'quả táo', example: 'I eat an apple every day.', topic: 'general', ipa: '/ˈæpl/' },
  { id: 2, en: 'book', vi: 'quyển sách', example: 'She is reading a book.', topic: 'education', ipa: '/bʊk/' },
  { id: 3, en: 'learn', vi: 'học', example: 'I want to learn English.', topic: 'education', ipa: '/lɜːn/' },
  { id: 4, en: 'practice', vi: 'luyện tập', example: 'Practice makes perfect.', topic: 'education', ipa: '/ˈpræktɪs/' },
  { id: 5, en: 'success', vi: 'thành công', example: 'Hard work leads to success.', topic: 'general', ipa: '/səkˈses/' },
];

export async function fetchWords(topic = ''): Promise<Word[] | null> {
  try {
    // Backend gioi han 500/req: lap theo offset cho den khi du total (862+ tu).
    const base = topic
      ? `/api/words?topic=${encodeURIComponent(topic)}`
      : '/api/words';
    const all: Word[] = [];
    let total = Number.POSITIVE_INFINITY;
    let offset = 0;
    for (let page = 0; page < 10 && offset < total; page++) {
      const res = await authFetch(`${base}&limit=500&offset=${offset}`);
      if (!res.ok) return all.length > 0 ? all : null;
      const data = (await res.json()) as { words?: Word[]; total?: number };
      const words = data.words ?? [];
      if (words.length === 0) break;
      all.push(...words);
      total = typeof data.total === 'number' ? data.total : words.length;
      offset += words.length;
    }
    if (all.length === 0) return null;
    if (!topic) writeCache(CACHE_WORDS_KEY, all);
    return all;
  } catch {
    return null;
  }
}

export async function searchWords(q: string, topic = ''): Promise<Word[]> {
  try {
    const res = await authFetch(
      `/api/words/search?q=${encodeURIComponent(q)}&topic=${encodeURIComponent(topic)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { words?: Word[] };
    return data.words ?? [];
  } catch {
    return [];
  }
}

export const SINGLE_WORD_RE = /^[A-Za-z][A-Za-z\s\-']*$/;
export const MAX_LOOKUP_LEN = 60;

const CACHE_TOPICS_KEY = 'englishfun_cache_topics';
const CACHE_WORDS_KEY = 'englishfun_cache_words';
const CACHE_TTL_MS = 24 * 3600 * 1000;

interface CacheBox<T> {
  at: number;
  data: T;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const box = JSON.parse(raw) as CacheBox<T>;
    if (!box || typeof box.at !== 'number' || Date.now() - box.at > CACHE_TTL_MS) return null;
    return box.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* đầy bộ nhớ: bỏ qua */
  }
}

export function getCachedTopics(): Topic[] {
  const t = readCache<Topic[]>(CACHE_TOPICS_KEY);
  return Array.isArray(t) ? t : [];
}

export function getCachedWords(): Word[] {
  const w = readCache<Word[]>(CACHE_WORDS_KEY);
  return Array.isArray(w) ? w : [];
}

/** Bắn 1 phát đánh thức backend (Render/Neon) mà không chặn UI. */
export function wakeBackend(): void {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    fetch(`${API_BASE}/health`, { cache: 'no-store', signal: ctrl.signal })
      .catch(() => {})
      .finally(() => clearTimeout(t));
  } catch {
    /* SSR: bỏ qua */
  }
}

export function extSearchLinks(en: string): { oxford: string; cambridge: string; google: string } {
  const slug = en.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  return {
    oxford: `https://www.oxfordlearnersdictionaries.com/definition/english/${slug}`,
    cambridge: `https://dictionary.cambridge.org/dictionary/english/${slug}`,
    google: `https://www.google.com/search?q=${encodeURIComponent(en + ' nghĩa tiếng Việt')}`,
  };
}

export async function lookupWord(en: string): Promise<LookupResult | null> {
  try {
    const res = await authFetch(`/api/words/lookup?en=${encodeURIComponent(en)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as LookupResult;
    return data;
  } catch {
    return null;
  }
}

export async function fetchAudio(en: string): Promise<string | null> {
  try {
    const res = await authFetch(`/api/words/audio?en=${encodeURIComponent(en)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { audio?: string | null };
    return data.audio ?? null;
  } catch {
    return null;
  }
}

export function playAudio(url: string | null, fallbackText: string): void {
  if (!url) {
    speak(fallbackText);
    return;
  }
  try {
    const el = new Audio(url);
    el.addEventListener('error', () => speak(fallbackText));
    void el.play().catch(() => speak(fallbackText));
  } catch {
    speak(fallbackText);
  }
}

export async function fetchTopics(): Promise<Topic[] | null> {
  try {
    const res = await authFetch('/api/topics');
    if (!res.ok) return null;
    const data = (await res.json()) as { topics?: Topic[] };
    const topics = data.topics && data.topics.length > 0 ? data.topics : null;
    if (topics) writeCache(CACHE_TOPICS_KEY, topics);
    return topics;
  } catch {
    return null;
  }
}

export async function fetchQuiz(count = 10): Promise<QuizQuestion[]> {
  const res = await authFetch(`/api/quiz/random?count=${count}`);
  if (!res.ok) throw new Error(`quiz API responded ${res.status}`);
  const data = (await res.json()) as { questions?: QuizQuestion[] };
  return data.questions ?? [];
}

/** Luu 1 luot hoc: diem + loai (quiz/write/listen/blast) + so giay da hoc. */
export async function saveProgress(
  score: number,
  total: number,
  kind = 'quiz',
  durationSec = 0,
): Promise<void> {
  await authFetch('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ score, total, kind, duration_sec: Math.max(0, Math.min(10800, Math.round(durationSec))) }),
  });
}

/** Gio hoc tu luc bat dau (ms) -> so giay, chan toi da 3 tieng. */
export function studySeconds(sinceMs: number): number {
  return Math.max(0, Math.min(10800, Math.round((Date.now() - sinceMs) / 1000)));
}

/** Gui 1 heartbeat len server (khong nem loi de khong lam phien UI). */
export async function reportActivity(seconds: number): Promise<void> {
  try {
    await authFetch('/api/activity', { method: 'POST', body: JSON.stringify({ seconds }) });
  } catch {
    /* offline/hết phiên: nhịp sau gửi tiếp */
  }
}

let activityTimer: ReturnType<typeof setInterval> | null = null;

/** Dem phut hoat dong that: moi 60s, chi dem khi tab dang mo + co thao tac
 *  trong 5 phut gan nhat (mo treo tab khong thao tac thi khong dem).
 *  Dat 1 lan sau dang nhap (AuthGate); moi trang deu duoc dem. */
export function startActivityTracker(): void {
  if (activityTimer !== null) return;
  let lastActive = Date.now();
  try {
    const mark = () => { lastActive = Date.now(); };
    for (const ev of ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']) {
      window.addEventListener(ev, mark, { passive: true });
    }
  } catch {
    return;
  }
  activityTimer = setInterval(() => {
    try {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActive > 5 * 60 * 1000) return;
      void reportActivity(60);
    } catch {
      /* bo qua */
    }
  }, 60000);
}

export function speak(text: string): void {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    synth.speak(utter);
  } catch {
    /* trình duyệt không hỗ trợ */
  }
}
