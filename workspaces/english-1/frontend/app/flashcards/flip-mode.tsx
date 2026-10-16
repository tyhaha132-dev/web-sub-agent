'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { speak, type Word } from '../../lib/api';
import EnglishIllustration from '../english-illustration';

export interface FlipModeProps {
  words: Word[];
  onKnown?: (en: string) => void;
  deckName?: string;
  speed?: number;
}

function getWordType(word: Word): string {
  const en = word.en.toLowerCase().trim();
  if (en.endsWith('tion') || en.endsWith('sion') || en.endsWith('ment') || en.endsWith('ness') || en.endsWith('ity')) {
    return 'Danh từ (Noun)';
  }
  if (en.endsWith('able') || en.endsWith('ible') || en.endsWith('ive') || en.endsWith('ous') || en.endsWith('ful')) {
    return 'Tính từ (Adjective)';
  }
  if (en.endsWith('ly') && en.length > 4) {
    return 'Trạng từ (Adverb)';
  }
  if (word.topic === 'toeic') return 'Từ vựng TOEIC trọng điểm';
  if (word.topic === 'ielts') return 'Từ vựng học thuật IELTS';
  if (word.topic === 'business') return 'Thuật ngữ Kinh doanh & Công sở';
  if (word.topic === 'education') return 'Chủ đề Giáo dục & Học tập';
  return 'Từ vựng cốt lõi';
}

function getMemoryTip(word: Word, deckName?: string): string {
  const en = word.en.toLowerCase().trim();
  const topic = (word.topic || '').toLowerCase();

  if (topic === 'toeic' || deckName?.toLowerCase().includes('toeic')) {
    return `Từ vựng cốt lõi thường xuyên xuất hiện trong TOEIC Reading Part 5, 6 & 7. Chú ý cấu trúc ngữ pháp và giới từ đi kèm với "${word.en}".`;
  }
  if (en.endsWith('tion') || en.endsWith('sion') || en.endsWith('ment')) {
    return `Hậu tố chỉ danh từ phổ biến. Hãy chú ý dạng động từ tương ứng để ghi điểm tối đa trong các bài tập biến đổi từ loại (Word Formation).`;
  }
  if (en.endsWith('able') || en.endsWith('ible')) {
    return `Hậu tố mang nghĩa "có thể làm được". Giúp bạn nhanh chóng đoán nghĩa từ lạ khi gặp trong bài thi hoặc tài liệu tiếng Anh.`;
  }
  if (word.example && word.example.length > 10) {
    return `Ghi nhớ ngữ cảnh: Áp dụng từ "${word.en}" vào các mẫu câu giao tiếp hằng ngày và làm quen với ngữ điệu chuẩn bản xứ.`;
  }
  return `Ôn tập phát âm chuẩn theo phiên âm IPA ${word.ipa || ''}. Hãy phát âm to 3 lần và đặt một câu ngắn liên quan đến bản thân để ghi nhớ lâu hơn.`;
}

export function FlipMode({ words, onKnown, deckName = 'Flashcards', speed = 1 }: FlipModeProps) {
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learnedSet, setLearnedSet] = useState<Set<string>>(() => new Set());
  const [order, setOrder] = useState<number[]>(() => words.map((_, i) => i));

  // Đồng bộ order khi danh sách words thay đổi
  useEffect(() => {
    setOrder(words.map((_, i) => i));
    setPos(0);
    setFlipped(false);
  }, [words]);

  const cur: Word | undefined = words[order[pos] ?? 0];

  const doFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  const nextCard = useCallback(() => {
    if (words.length === 0) return;
    setFlipped(false);
    setPos((p) => (p + 1) % words.length);
  }, [words.length]);

  const prevCard = useCallback(() => {
    if (words.length === 0) return;
    setFlipped(false);
    setPos((p) => (p - 1 + words.length) % words.length);
  }, [words.length]);

  const toggleLearned = useCallback(() => {
    if (!cur) return;
    const en = cur.en;
    setLearnedSet((prev) => {
      const next = new Set(prev);
      if (next.has(en)) {
        next.delete(en);
      } else {
        next.add(en);
        onKnown?.(en);
      }
      return next;
    });
  }, [cur, onKnown]);

  // Phím tắt bàn phím: Space (lật), ArrowLeft/ArrowRight (chuyển), P (phát âm)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        doFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.key.toLowerCase() === 'p' && cur) {
        e.preventDefault();
        speak(cur.en, speed);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doFlip, nextCard, prevCard, cur, speed]);

  if (!cur || words.length === 0) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <span style={{ fontSize: 32 }}>📭</span>
        <p style={{ margin: '8px 0', color: 'var(--muted)' }}>Không có thẻ từ vựng nào trong danh sách này.</p>
      </div>
    );
  }

  const isLearned = learnedSet.has(cur.en);
  const ipaClean = (cur.ipa || '').replace(/^\/+|\/+$/g, '');
  const wordType = getWordType(cur);
  const memoryTip = getMemoryTip(cur, deckName);

  return (
    <div style={{ marginTop: 8 }}>
      {/* Thông tin tiến độ & phím tắt */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, color: 'var(--muted)', fontSize: 14 }}>
        <span>
          Thẻ <b>{pos + 1}/{words.length}</b> — ⭐ <b>{learnedSet.size}</b> từ đã thuộc
        </span>
        <span style={{ fontSize: 13 }}>
          Phím tắt: <b>Space</b> để lật, <b>P</b> phát âm, <b>← / →</b> chuyển thẻ
        </span>
      </div>

      {/* Thanh tiến độ chuyển màu */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${words.length ? ((pos + 1) / words.length) * 100 : 0}%` }}
        />
      </div>

      {/* Thẻ 3D Engine tương tác 2 mặt */}
      <div
        className={`flash3d ${flipped ? 'flipped' : ''}`}
        onClick={doFlip}
        role="button"
        tabIndex={0}
        aria-label={`Thẻ từ vựng ${cur.en}. Bấm để lật xem nghĩa.`}
      >
        <div className="flash3d-inner">
          {/* MẶT TRƯỚC (Front Face) */}
          <div className="flash3d-face flash3d-front">
            <div className="flash3d-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="category-pill">THẺ TỪ VỰNG 3D</span>
                <span className="topic-chip" style={{ fontSize: 12, padding: '3px 12px' }}>
                  {cur.topic ? cur.topic.toUpperCase() : deckName}
                </span>
              </div>
              <button
                type="button"
                className="speak-btn"
                title={isLearned ? 'Đã thuộc (Bấm để bỏ)' : 'Đánh dấu đã thuộc'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLearned();
                }}
                style={{
                  background: isLearned ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : undefined,
                  color: isLearned ? '#fff' : undefined,
                  width: 38,
                  height: 38,
                }}
              >
                {isLearned ? '⭐' : '☆'}
              </button>
            </div>

            {/* Từ tiếng Anh chính & Loa phát âm */}
            <h2 className="flash3d-term">
              <span>{cur.en}</span>
              <button
                type="button"
                className="flash3d-speak-btn"
                title="Nghe phát âm chuẩn (P)"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(cur.en, speed);
                }}
              >
                🔊
              </button>
            </h2>

            {/* Phiên âm IPA & Phân loại từ */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {ipaClean && <span className="ipa-chip">/{ipaClean}/</span>}
              <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                [{wordType}]
              </span>
            </div>

            {/* Minh họa vector sinh động */}
            <div className="flash3d-illus">
              <EnglishIllustration word={cur.en} topic={cur.topic} size={92} />
            </div>

            {/* Gợi ý tương tác */}
            <div className="flash3d-hint">
              <span>ⓘ Nhấp vào thẻ hoặc bấm phím <b>Space</b> để xem định nghĩa, ví dụ & mẹo nhớ</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>⟳ Lật thẻ</span>
            </div>
          </div>

          {/* MẶT SAU (Back Face) */}
          <div className="flash3d-face flash3d-back">
            <div className="flash3d-back-header">
              <h2 className="flash3d-back-title">{cur.vi}</h2>
              <button
                type="button"
                className="flash3d-speak-btn"
                title="Nghe lại phát âm (P)"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(cur.en, speed);
                }}
              >
                🔊
              </button>
            </div>

            <div className="flash3d-sections">
              {/* Mục 1: ĐỊNH NGHĨA */}
              <div className="sec-def">
                <h4>ĐỊNH NGHĨA TIẾNG VIỆT</h4>
                <p>{cur.vi}</p>
              </div>

              {/* Mục 2: NGỮ CẢNH & CÂU VÍ DỤ THỰC TẾ */}
              <div className="sec-ctx-box">
                <h4>✨ NGỮ CẢNH & CÂU VÍ DỤ</h4>
                {cur.example ? (
                  <>
                    <p className="ex-en">&ldquo;{cur.example}&rdquo;</p>
                    <p className="ex-vi">→ Ví dụ ứng dụng chuẩn trong câu văn và giao tiếp hằng ngày.</p>
                  </>
                ) : (
                  <>
                    <p className="ex-en">&ldquo;Consistent practice with {cur.en} will expand your active vocabulary.&rdquo;</p>
                    <p className="ex-vi">→ Luyện tập kiên trì với từ vựng sẽ giúp bạn nâng cao vốn từ nhanh chóng.</p>
                  </>
                )}
              </div>

              {/* Mục 3: MẸO GHI NHỚ / LƯU Ý ĐỀ THI */}
              <div className="sec-tip-box">
                <h4>⚡ Mẹo ghi nhớ / Lưu ý đề thi:</h4>
                <p>{memoryTip}</p>
              </div>
            </div>

            {/* Gợi ý tương tác lật lại */}
            <div className="flash3d-hint" style={{ marginTop: 'auto' }}>
              <span>ⓘ Nhấp vào thẻ hoặc phím <b>Space</b> để quay lại mặt trước</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>⟳ Mặt trước</span>
            </div>
          </div>
        </div>
      </div>

      {/* Các nút điều khiển dưới thẻ */}
      <div className="flash3d-bottom-actions">
        <button
          type="button"
          className="btn btn-ghost flash3d-action-btn"
          onClick={prevCard}
          title="Chuyển về thẻ trước (Mũi tên trái)"
        >
          ‹ Thẻ trước
        </button>

        <button
          type="button"
          className="btn btn-ghost flash3d-action-btn"
          onClick={toggleLearned}
          style={{
            borderColor: isLearned ? '#fbbf24' : undefined,
            color: isLearned ? '#d97706' : undefined,
          }}
          title="Đánh dấu thẻ này đã thuộc hay chưa"
        >
          {isLearned ? '⭐ Đã thuộc từ này' : '☆ Đánh dấu đã thuộc'}
        </button>

        <button
          type="button"
          className="btn btn-primary flash3d-action-btn"
          onClick={nextCard}
          title="Chuyển sang thẻ tiếp theo (Mũi tên phải)"
        >
          Thẻ tiếp theo ›
        </button>
      </div>
    </div>
  );
}
