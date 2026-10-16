'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchTopics,
  fetchWords,
  getCachedTopics,
  getCachedWords,
  lookupWord,
  searchWords,
  speak,
  wakeBackend,
  SINGLE_WORD_RE,
  type ExternalEntry,
  type Topic,
  type Word,
} from '../../lib/api';
import EnglishIllustration from '../english-illustration';
import ExtLinks from '../ext-links';

type StatusFilter = 'all' | 'bookmarked';

function getWordType(w: Word): string {
  const en = w.en.toLowerCase().trim();
  if (en.endsWith('tion') || en.endsWith('sion') || en.endsWith('ment') || en.endsWith('ness') || en.endsWith('ity')) {
    return 'Danh từ (Noun)';
  }
  if (en.endsWith('able') || en.endsWith('ible') || en.endsWith('ive') || en.endsWith('ous') || en.endsWith('ful')) {
    return 'Tính từ (Adjective)';
  }
  if (en.endsWith('ly') && en.length > 4) {
    return 'Trạng từ (Adverb)';
  }
  if (w.topic === 'toeic') return 'Từ vựng TOEIC';
  if (w.topic === 'ielts') return 'Học thuật IELTS';
  if (w.topic === 'business') return 'Kinh doanh & Công sở';
  if (w.topic === 'education') return 'Giáo dục & Học thuật';
  return 'Từ vựng cốt lõi';
}

function getMemoryTip(w: Word): string {
  const en = w.en.toLowerCase().trim();
  const topic = (w.topic || '').toLowerCase();

  if (topic === 'toeic') {
    return `Từ vựng trọng tâm thường gặp trong đề thi TOEIC Reading Part 5 & 6. Chú ý cấu trúc collocations và ngữ cảnh công việc.`;
  }
  if (en.endsWith('tion') || en.endsWith('sion') || en.endsWith('ment')) {
    return `Hậu tố danh từ phổ biến. Lưu ý cấu tạo từ để làm tốt dạng bài biến đổi từ loại Word Form.`;
  }
  if (en.endsWith('able') || en.endsWith('ible')) {
    return `Hậu tố tính từ mang nghĩa "có thể làm được". Giúp bạn đoán nghĩa nhanh khi đọc tài liệu.`;
  }
  if (w.example && w.example.length > 10) {
    return `Ngữ cảnh: Luyện tập phát âm theo câu ví dụ thực tế để ghi nhớ tự nhiên và phản xạ nhanh.`;
  }
  return `Luyện phát âm chuẩn IPA ${w.ipa || ''}. Hãy phát âm to từ 3 lần và đặt câu ngắn để khắc sâu vào trí nhớ.`;
}

export default function DictionaryPage() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [results, setResults] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [external, setExternal] = useState<ExternalEntry | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [bookmarkedSet, setBookmarkedSet] = useState<Set<string>>(() => new Set());

  // Đọc danh sách đã bookmark từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('englishfun_bookmarked_words');
      if (raw) {
        setBookmarkedSet(new Set(JSON.parse(raw)));
      }
    } catch {
      // bỏ qua lỗi storage
    }
  }, []);

  function toggleBookmark(en: string) {
    setBookmarkedSet((prev) => {
      const next = new Set(prev);
      if (next.has(en)) next.delete(en);
      else next.add(en);
      try {
        localStorage.setItem('englishfun_bookmarked_words', JSON.stringify(Array.from(next)));
      } catch {
        // bỏ qua
      }
      return next;
    });
  }

  // Khởi tạo topics và tải dữ liệu từ vựng mặc định
  useEffect(() => {
    wakeBackend();
    const cachedTopics = getCachedTopics();
    if (cachedTopics.length > 0) setTopics(cachedTopics);
    fetchTopics().then((t) => { if (t && t.length > 0) setTopics(t); }).catch(() => {});

    // Kiểm tra topic trong URL params
    const params = new URLSearchParams(window.location.search);
    const initialTopic = params.get('topic') ?? '';
    const initialQ = params.get('q') ?? '';
    if (initialTopic) setTopic(initialTopic);
    if (initialQ) setQ(initialQ);

    // Tải dữ liệu ban đầu
    setLoading(true);
    const cachedWords = getCachedWords();
    if (cachedWords.length > 0) {
      setResults(cachedWords.slice(0, 60));
      setLoading(false);
    }
    fetchWords(initialTopic)
      .then((w) => {
        if (w && w.length > 0) {
          setResults(w.slice(0, 80));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Hàm thực hiện tìm kiếm từ vựng
  const handleSearch = useCallback(async (keyword = q, currentTopic = topic) => {
    const trimmed = keyword.trim();
    setExternal(null);
    setLoading(true);

    try {
      if (trimmed === '') {
        const words = await fetchWords(currentTopic);
        setResults(words ? words.slice(0, 80) : []);
        return;
      }

      const w = await searchWords(trimmed, currentTopic);
      setResults(w);

      // Nếu không thấy trong DB và là 1 từ đơn, thử tra cứu mở rộng Wiktionary / Oxford
      if (w.length === 0 && SINGLE_WORD_RE.test(trimmed)) {
        setLookupLoading(true);
        try {
          const found = await lookupWord(trimmed);
          if (found?.source === 'db' && found.words.length > 0) {
            setResults(found.words);
            setExternal(null);
          } else if (found?.source === 'external' && found.external) {
            setExternal(found.external);
          }
        } finally {
          setLookupLoading(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [q, topic]);

  function onTopicChange(newTopic: string) {
    setTopic(newTopic);
    void handleSearch(q, newTopic);
  }

  // Danh sách từ lọc theo trạng thái Đã đánh dấu (Bookmark)
  const shown = useMemo(() => {
    if (statusFilter === 'bookmarked') {
      return results.filter((w) => bookmarkedSet.has(w.en));
    }
    return results;
  }, [results, statusFilter, bookmarkedSet]);

  const totalTopicWords = useMemo(() => {
    if (!topic) return topics.reduce((sum, t) => sum + t.total, 862);
    const found = topics.find((t) => t.topic === topic);
    return found ? found.total : results.length;
  }, [topics, topic, results.length]);

  return (
    <main>
      {/* Header trang chuẩn bio-app */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/" className="bio-breadcrumb-link">← Trang chủ</Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">KHO TỪ VỰNG TRA CỨU</span>
        </div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 900 }}>
          <span>📖</span> Từ điển tra cứu Anh – Việt
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: 0 }}>
          Kho 862+ từ vựng tinh hoa và chuyên đề TOEIC/IELTS kèm phiên âm IPA chuẩn quốc tế, phát âm bản ngữ, câu ví dụ và mẹo ghi nhớ đề thi.
        </p>
      </div>

      {/* Toolbar Tìm kiếm & Bộ lọc chuẩn bio-app */}
      <div className="panel toolbar-panel" style={{ marginBottom: 20 }}>
        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSearch();
          }}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nhập từ tiếng Anh, nghĩa tiếng Việt, từ khóa..."
              style={{ width: '100%', paddingRight: q ? 32 : 14 }}
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  void handleSearch('', topic);
                }}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: 14,
                }}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '10px 22px', fontSize: 14 }}>
            {loading ? '⏳ Đang tra...' : '🔍 Tìm kiếm'}
          </button>
        </form>

        {/* Thanh chọn chuyên đề, bộ lọc đánh dấu và thống kê số lượng */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border-soft)' }}>
          <select
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            className="chip-select"
            aria-label="Chọn chuyên đề"
          >
            <option value="">Tất cả chuyên đề ({topics.reduce((s, t) => s + t.total, 862)})</option>
            {topics.map((t) => (
              <option key={t.topic} value={t.topic}>
                Chủ đề: {t.topic.toUpperCase()} ({t.total} từ)
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="chip-select"
            aria-label="Lọc đánh dấu"
          >
            <option value="all">Tất cả từ vựng</option>
            <option value="bookmarked">Đã đánh dấu (🔖 {bookmarkedSet.size})</option>
          </select>

          <span style={{ flex: 1 }} />

          <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
            Hiển thị: <b>{shown.length}</b> / {totalTopicWords} từ vựng
          </span>
        </div>

        {/* Quick Topic Chips */}
        <div className="topic-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className={`topic-chip ${topic === '' ? 'active' : ''}`}
            onClick={() => onTopicChange('')}
          >
            Tất cả
          </button>
          {topics.slice(0, 6).map((t) => (
            <button
              key={t.topic}
              type="button"
              className={`topic-chip ${topic === t.topic ? 'active' : ''}`}
              onClick={() => onTopicChange(t.topic)}
            >
              {t.topic.toUpperCase()} ({t.total})
            </button>
          ))}
        </div>
      </div>

      {/* Thông báo tải dữ liệu tra cứu mở rộng */}
      {lookupLoading && (
        <div className="panel" style={{ textAlign: 'center', padding: '24px 20px', marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>🌐</span>
          <p style={{ marginTop: 8, color: 'var(--muted)' }}>Đang tra cứu từ điển mở rộng (Oxford / Wiktionary)...</p>
        </div>
      )}

      {/* Kết quả tra cứu mở rộng (External Lookup Card) */}
      {external && (
        <div className="panel" style={{ marginBottom: 20, border: '2px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="category-pill" style={{ fontSize: 11 }}>
              NGUỒN MỞ RỘNG • {external.provider === 'oxford' ? 'OXFORD LEARNER’S' : 'WIKTIONARY'}
            </span>
            {external.audio ? (
              <audio controls src={external.audio} style={{ maxHeight: 32 }} />
            ) : (
              <button
                type="button"
                className="speak-btn"
                title="Nghe phát âm chuẩn"
                onClick={() => speak(external.word)}
              >
                🔊
              </button>
            )}
          </div>

          <h3 style={{ fontSize: 24, margin: '12px 0 6px', color: 'var(--heading)' }}>
            {external.word}
          </h3>

          {external.phonetic && (
            <div className="ipa" style={{ color: '#9333ea', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
              /{external.phonetic.replace(/^\/+|\/+$/g, '')}/ — Định nghĩa tiếng Anh
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {external.meanings.map((m, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                <b style={{ color: 'var(--heading)', textTransform: 'capitalize' }}>[{m.pos}]</b> {m.definition}
                {m.example && (
                  <div style={{ fontStyle: 'italic', color: 'var(--muted)', marginTop: 4 }}>
                    &ldquo;{m.example}&rdquo;
                  </div>
                )}
              </div>
            ))}
          </div>

          {external.sourceUrl && (
            <div style={{ marginTop: 14, fontSize: 13 }}>
              <a href={external.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Xem chi tiết tại {external.provider === 'oxford' ? 'Oxford Learner’s Dictionaries ↗' : 'Wiktionary ↗'}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Grid danh sách thẻ từ điển đa cột chuẩn bio-app (.dict-grid) */}
      <div className="dict-grid">
        {shown.map((w) => {
          const isMarked = bookmarkedSet.has(w.en);
          const ipaClean = (w.ipa || '').replace(/^\/+|\/+$/g, '');
          const wordType = getWordType(w);
          const memoryTip = getMemoryTip(w);

          return (
            <article key={w.id} className="dict-card">
              {/* Header card: Topic badge + Bookmark button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="topic-chip" style={{ cursor: 'default', fontSize: 11.5, padding: '3px 12px' }}>
                  {w.topic ? w.topic.toUpperCase() : 'GENERAL'}
                </span>
                <button
                  type="button"
                  className="speak-btn"
                  title={isMarked ? 'Bỏ đánh dấu' : 'Đánh dấu từ này (🔖)'}
                  onClick={() => toggleBookmark(w.en)}
                  style={{
                    background: isMarked ? '#fbbf24' : undefined,
                    width: 32,
                    height: 32,
                    fontSize: 15,
                  }}
                >
                  {isMarked ? '🔖' : '📑'}
                </button>
              </div>

              {/* Term & Vector Illustration box */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {w.en}
                    <button
                      type="button"
                      className="speak-btn"
                      title="Nghe phát âm chuẩn"
                      onClick={() => speak(w.en)}
                      style={{ width: 30, height: 30, fontSize: 14 }}
                    >
                      🔊
                    </button>
                  </h3>
                  {ipaClean && <div className="ipa">/{ipaClean}/</div>}
                </div>

                <div className="dict-illus-box">
                  <EnglishIllustration word={w.en} topic={w.topic} size={42} />
                </div>
              </div>

              {/* Nghĩa tiếng Việt lớn */}
              <div style={{ fontWeight: 800, marginTop: 6, fontSize: 17, color: 'var(--heading)' }}>
                {w.vi}
              </div>

              {/* Câu ví dụ ứng dụng */}
              {w.example && (
                <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '8px 0 0', lineHeight: 1.6, fontStyle: 'italic', flex: 1 }}>
                  &ldquo;{w.example}&rdquo;
                </p>
              )}

              {/* Mẹo ghi nhớ / Gợi ý ngữ pháp */}
              <div className="dict-memory-tip">
                💡 <b>Gợi ý & Mẹo nhớ:</b> {memoryTip}
              </div>

              {/* Footer card: Phân loại từ & Trạng thái đánh dấu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border-soft)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                  🏷️ {wordType}
                </span>
                {isMarked && (
                  <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    🔖 Đã đánh dấu
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Trạng thái không tìm thấy */}
      {!loading && shown.length === 0 && !external && (
        <div className="panel" style={{ textAlign: 'center', padding: '36px 20px', marginTop: 20 }}>
          <span style={{ fontSize: 32 }}>🔍</span>
          <p style={{ margin: '8px 0 12px', color: 'var(--muted)' }}>
            Không tìm thấy từ nào phù hợp với từ khóa &ldquo;{q}&rdquo;.
          </p>
          {q.trim() !== '' && <ExtLinks en={q.trim()} />}
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setQ('');
                setStatusFilter('all');
                void handleSearch('', '');
              }}
            >
              Xem tất cả từ vựng
            </button>
          </div>
        </div>
      )}

      {/* Quick CTA banner dẫn sang Flashcard 3D và Quiz */}
      <div
        className="panel"
        style={{
          marginTop: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          padding: '20px 24px',
        }}
      >
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>🃏 Luyện tập ngay với Flashcard 3D</h4>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5 }}>
            Chuyển các từ vừa tra cứu sang chế độ thẻ lật 3D hoặc thử thách phản xạ với Quiz 20 giây.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/flashcards" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
            🃏 Học Flashcard 3D
          </Link>
          <Link href="/quiz" className="btn btn-ghost" style={{ padding: '10px 18px', fontSize: 14 }}>
            ⚡ Thử thách Quiz
          </Link>
        </div>
      </div>
    </main>
  );
}
