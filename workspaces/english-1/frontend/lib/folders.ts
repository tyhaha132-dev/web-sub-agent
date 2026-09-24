import { lookupWord, type QuizQuestion, type Word } from './api';

export type FolderWordSource = 'pending' | 'db' | 'external' | 'unknown';
export type WordStatus = 'new' | 'learning' | 'known';

export interface FolderWord {
  id: number;
  en: string;
  vi: string;
  ipa: string;
  example: string;
  source: FolderWordSource;
}

export interface FolderStats {
  attempts: number;
  correct: number;
  total: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  words: FolderWord[];
  status: Record<string, WordStatus>;
  stats: FolderStats;
}

export const FOLDERS_KEY = 'englishfun_folders_v1';
export const MAX_IMPORT_WORDS = 500;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const IMPORT_RE = /^[A-Za-z][A-Za-z\s\-']{0,39}$/;

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function loadFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Folder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    /* đầy bộ nhớ: bỏ qua */
  }
}

export function toWord(w: FolderWord): Word {
  return { id: w.id, en: w.en, vi: w.vi, example: w.example, topic: 'my', ipa: w.ipa };
}

export function cleanToken(s: string): string | null {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!IMPORT_RE.test(t)) return null;
  return t;
}

/** Tách text nhập tay (mỗi dòng hoặc cách nhau dấu phẩy/chấm phẩy), loại trùng, tối đa 500. */
export function parseManual(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,;]+/)) {
    const t = cleanToken(part);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_IMPORT_WORDS) break;
  }
  return out;
}

/** Hàng Excel/CSV: cột 1 = từ tiếng Anh, cột 2 (nếu có) = nghĩa Việt. */
export function rowsToEntries(rows: unknown[][]): Array<{ en: string; vi: string }> {
  const seen = new Set<string>();
  const out: Array<{ en: string; vi: string }> = [];
  // bỏ hàng tiêu đề kiểu "en, vi" / "word, meaning"...
  const data = rows.filter((r) => Array.isArray(r) && r.length > 0);
  if (data.length > 0) {
    const h0 = String(data[0][0] ?? '').trim().toLowerCase();
    if (['en', 'english', 'word', 'words', 'vocabulary', 'tu', 'tu vung'].includes(h0)) {
      data.shift();
    }
  }
  for (const row of data) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const en = cleanToken(String(row[0] ?? ''));
    if (!en) continue;
    const key = en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const vi = row.length > 1 ? String(row[1] ?? '').trim().slice(0, 200) : '';
    out.push({ en, vi });
    if (out.length >= MAX_IMPORT_WORDS) break;
  }
  return out;
}

export function makeFolder(name: string, entries: Array<{ en: string; vi: string }>): Folder {
  const base = Date.now();
  return {
    id: uid(),
    name: name.trim().slice(0, 80) || 'Thư mục mới',
    createdAt: Date.now(),
    words: entries.map((e, i) => ({
      id: base + i,
      en: e.en,
      vi: e.vi,
      ipa: '',
      example: '',
      source: 'pending' as FolderWordSource,
    })),
    status: {},
    stats: { attempts: 0, correct: 0, total: 0 },
  };
}

/** Làm giàu các từ pending qua /lookup có sẵn (DB trước, Wiktionary sau). */
export async function enrichPending(
  words: FolderWord[],
  onUpdate: (en: string, patch: Partial<FolderWord>) => void,
  signal: { cancelled: boolean },
): Promise<void> {
  const queue = words.filter((w) => w.source === 'pending');
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length > 0) {
      if (signal.cancelled) return;
      const w = queue.shift();
      if (!w) return;
      try {
        const r = await lookupWord(w.en);
        if (signal.cancelled) return;
        if (!r) continue;
        if (r.source === 'db' && r.words.length > 0) {
          const d = r.words[0];
          onUpdate(w.en, {
            vi: w.vi || d.vi,
            ipa: d.ipa,
            example: d.example || w.example,
            source: 'db',
          });
        } else if (r.source === 'external' && r.external) {
          const e = r.external;
          const first = e.meanings[0];
          onUpdate(w.en, {
            ipa: e.phonetic || w.ipa,
            example: first
              ? `${first.pos ? `${first.pos}: ` : ''}${first.definition}${first.example ? ` — “${first.example}”` : ''}`
              : w.example,
            source: 'external',
          });
        } else {
          onUpdate(w.en, { source: 'unknown' });
        }
      } catch {
        if (!signal.cancelled) onUpdate(w.en, { source: 'unknown' });
      }
    }
  });
  await Promise.all(workers);
}

/** Sinh đề quiz local từ từ đã có nghĩa Việt (cần ≥4 từ). */
export function buildFolderQuiz(words: FolderWord[], count = 10): QuizQuestion[] {
  const pool = words.filter((w) => w.vi.trim() !== '');
  if (pool.length < 4) return [];
  const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
  return picked.map((w) => {
    const others = pool.filter((x) => x.en.toLowerCase() !== w.en.toLowerCase());
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.vi);
    const choices = [...distractors, w.vi].sort(() => Math.random() - 0.5);
    return { en: w.en, choices, answer: w.vi };
  });
}

export function knownCount(f: Folder): number {
  return f.words.filter((w) => f.status[w.en.toLowerCase()] === 'known').length;
}
