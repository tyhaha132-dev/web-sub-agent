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

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

export const SAMPLE_WORDS: Word[] = [
  { id: 1, en: 'apple', vi: 'quả táo', example: 'I eat an apple every day.', topic: 'general', ipa: '/ˈæpl/' },
  { id: 2, en: 'book', vi: 'quyển sách', example: 'She is reading a book.', topic: 'education', ipa: '/bʊk/' },
  { id: 3, en: 'learn', vi: 'học', example: 'I want to learn English.', topic: 'education', ipa: '/lɜːn/' },
  { id: 4, en: 'practice', vi: 'luyện tập', example: 'Practice makes perfect.', topic: 'education', ipa: '/ˈpræktɪs/' },
  { id: 5, en: 'success', vi: 'thành công', example: 'Hard work leads to success.', topic: 'general', ipa: '/səkˈses/' },
];

export async function fetchWords(topic = ''): Promise<Word[]> {
  try {
    const url = topic ? `${API_BASE}/api/words?topic=${encodeURIComponent(topic)}` : `${API_BASE}/api/words`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return SAMPLE_WORDS;
    const data = (await res.json()) as { words?: Word[] };
    return data.words && data.words.length > 0 ? data.words : SAMPLE_WORDS;
  } catch {
    return SAMPLE_WORDS;
  }
}

export async function searchWords(q: string, topic = ''): Promise<Word[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/words/search?q=${encodeURIComponent(q)}&topic=${encodeURIComponent(topic)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { words?: Word[] };
    return data.words ?? [];
  } catch {
    return [];
  }
}

export async function fetchTopics(): Promise<Topic[]> {
  try {
    const res = await fetch(`${API_BASE}/api/topics`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { topics?: Topic[] };
    return data.topics ?? [];
  } catch {
    return [];
  }
}

export async function fetchQuiz(count = 10): Promise<QuizQuestion[]> {
  const res = await fetch(`${API_BASE}/api/quiz/random?count=${count}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`quiz API responded ${res.status}`);
  const data = (await res.json()) as { questions?: QuizQuestion[] };
  return data.questions ?? [];
}

export async function saveProgress(score: number, total: number): Promise<void> {
  await fetch(`${API_BASE}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, total }),
  });
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
