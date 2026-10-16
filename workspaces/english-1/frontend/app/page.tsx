'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { wakeBackend, speak, fetchTopics, type Topic } from '../lib/api';
import { authFetch, getToken } from '../lib/auth';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.querySelectorAll('.reveal').forEach((n) => n.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 200px 0px' }
    );
    el.querySelectorAll('.reveal').forEach((n) => io.observe(n));

    const t = setTimeout(() => {
      el.querySelectorAll('.reveal').forEach((n) => n.classList.add('revealed'));
    }, 1200);

    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return ref;
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1200);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{n}{suffix}</span>;
}

const MARQUEE_WORDS = [
  'Serendipity',
  'Resilience',
  'Accomplish',
  'Collaboration',
  'Perspective',
  'Innovation',
  'Negotiation',
  'Pragmatic',
  'Fluency',
  'Dedication',
  'Efficiency',
  'Adaptability',
];

const DEFAULT_TOPICS = [
  { topic: 'toeic', name: 'TOEIC Business & Workplace', count: 560, icon: '💼', cls: 'sk-teal', href: '/toeic' },
  { topic: 'technology', name: 'Công nghệ & Đổi mới (IELTS)', count: 48, icon: '💻', cls: 'sk-purple', href: '/dictionary?topic=technology' },
  { topic: 'environment', name: 'Môi trường & Sinh thái (IELTS)', count: 52, icon: '🌍', cls: 'sk-green', href: '/dictionary?topic=environment' },
  { topic: 'education', name: 'Giáo dục & Học thuật', count: 64, icon: '🎓', cls: 'sk-blue', href: '/dictionary?topic=education' },
  { topic: 'general', name: 'Giao tiếp đời sống hàng ngày', count: 78, icon: '☕', cls: 'sk-orange', href: '/dictionary?topic=general' },
  { topic: 'custom', name: 'Thư mục tự tạo & Import Excel', count: 500, icon: '📁', cls: 'sk-pink', href: '/folders' },
];

export default function LandingPage() {
  const [totalWords, setTotalWords] = useState(862);
  const [topics, setTopics] = useState<Topic[]>([]);
  const rootRef = useReveal();

  useEffect(() => {
    wakeBackend();
    if (!getToken()) return;
    authFetch('/api/words?limit=1')
      .then((r) => r.json())
      .then((d: { total?: number }) => {
        if (typeof d.total === 'number' && d.total > 0) setTotalWords(d.total);
      })
      .catch(() => {});

    fetchTopics()
      .then((ts) => ts && ts.length > 0 && setTopics(ts))
      .catch(() => {});
  }, []);

  return (
    <div ref={rootRef} className="landing">
      {/* 1. HERO SECTION */}
      <section className="hero-land">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="blob b4" />

        {/* Floating micro-particles */}
        <div className="hero-particle" style={{ width: 12, height: 12, top: '20%', left: '12%', animationDuration: '3.6s' }} />
        <div className="hero-particle" style={{ width: 8, height: 8, top: '65%', left: '7%', animationDuration: '4.8s' }} />
        <div className="hero-particle" style={{ width: 14, height: 14, top: '26%', right: '14%', animationDuration: '5.2s' }} />
        <div className="hero-particle" style={{ width: 10, height: 10, bottom: '22%', right: '9%', animationDuration: '4s' }} />

        <div className="hero-inner">
          <span className="hero-badge reveal">🏆 CHUẨN QUỐC TẾ • TỪ ĐIỂN • FLASHCARDS 3D • TOEIC READING</span>
          <h1 className="reveal">
            EnglishFun<br />
            <span>Chinh phục tiếng Anh mỗi ngày</span>
          </h1>
          <p className="reveal">
            Hệ thống học từ vựng và phản xạ tiếng Anh toàn diện: Flashcard 3D Spaced Repetition, 515 câu đề thi TOEIC Reading chuẩn thi thật, 7 chế độ luyện phản xạ và theo dõi tiến độ khoa học.
          </p>
          <div className="reveal" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/flashcards" className="btn btn-light" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              🃏 Khám phá Flashcard 3D
            </Link>
            <Link href="/toeic" className="btn-outline-light">
              💼 Luyện TOEIC Reading
            </Link>
            <Link href="/progress" className="btn-outline-light">
              📊 Xem tiến độ
            </Link>
          </div>
          <div className="hero-stats reveal">
            <div className="stat">
              <b><CountUp to={totalWords || 862} suffix="+" /></b>
              <span>Từ vựng chuẩn</span>
            </div>
            <div className="stat">
              <b><CountUp to={43} suffix=" bộ" /></b>
              <span>Bộ Flashcards</span>
            </div>
            <div className="stat">
              <b><CountUp to={515} suffix=" câu" /></b>
              <span>Ngân hàng TOEIC</span>
            </div>
            <div className="stat">
              <b><CountUp to={7} suffix=" chế độ" /></b>
              <span>Luyện phản xạ</span>
            </div>
          </div>
        </div>

        {/* 3D Interactive Demo Flashcard */}
        <div className="demo-wrap reveal">
          <div className="demo-card">
            <div className="demo-inner">
              {/* Mặt trước */}
              <div className="demo-face demo-front">
                <span className="demo-category-pill">TỪ VỰNG IELTS / HỌC THUẬT</span>
                <b style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  Serendipity
                  <button
                    type="button"
                    className="speak-btn"
                    title="Nghe phát âm chuẩn IPA"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak('Serendipity');
                    }}
                    style={{ width: 36, height: 36, fontSize: 18 }}
                  >
                    🔊
                  </button>
                </b>
                <span className="ipa-chip">/ˌser.ənˈdɪp.ə.ti/</span>
                <div style={{ margin: '10px 0', fontSize: 44, animation: 'float 3.5s ease-in-out infinite' }}>
                  ✨🍀
                </div>
                <small style={{ color: '#7c3aed', fontWeight: 800, letterSpacing: 1.2 }}>
                  Thẻ tương tác 3D • Tự động lật thẻ ⟳
                </small>
              </div>

              {/* Mặt sau */}
              <div className="demo-face demo-back" style={{ textAlign: 'left', padding: '24px 22px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 22, margin: 0, color: 'var(--heading)' }}>Sự may mắn bất ngờ</h3>
                  <button
                    type="button"
                    className="speak-btn"
                    title="Nghe phát âm chuẩn"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak('Serendipity');
                    }}
                    style={{ width: 34, height: 34, fontSize: 16 }}
                  >
                    🔊
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      Định nghĩa
                    </h4>
                    <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                      Khả năng tình cờ phát hiện ra những điều tốt đẹp, quý giá một cách hoàn toàn tự nhiên và bất ngờ.
                    </p>
                  </div>
                  <div style={{ background: 'var(--chip-bg)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--chip-border)' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: '#7c3aed' }}>
                      Ví dụ thực tế
                    </h4>
                    <p style={{ fontSize: 13, lineHeight: 1.45, margin: 0, fontStyle: 'italic' }}>
                      &ldquo;Finding EnglishFun was a lucky stroke of serendipity in my learning journey.&rdquo;
                    </p>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                    💡 <b>Mẹo nhớ:</b> Thường gặp trong IELTS Band 7.0+. Đi cùng cụm từ <i>&ldquo;a stroke of serendipity&rdquo;</i>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee vocabulary ribbon */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i} className="marquee-chip">
              <span style={{ marginRight: 6 }}>💎</span>{word}
            </span>
          ))}
        </div>
      </div>

      {/* 2. FEATURES SECTION ("Không gian học tập tương tác") */}
      <section>
        <div className="section-header-block reveal">
          <span className="section-badge">✨ TÍNH NĂNG TOÀN DIỆN</span>
          <h2 className="section-title">
            <span>🎯</span> Không gian học tập đa phương thức
          </h2>
          <p className="section-desc">
            Bộ công cụ số hóa hiện đại giúp bạn làm chủ từ vựng, phản xạ giao tiếp và chinh phục chứng chỉ TOEIC / IELTS với hiệu suất cao nhất.
          </p>
        </div>

        <div className="card-grid">
          <Link href="/dictionary" className="skill-card sk-blue reveal" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="icon">🔤</div>
            <h3>Từ điển đa nguồn thông minh</h3>
            <p>Tra cứu tức thì nghĩa, phiên âm IPA chuẩn Mỹ, audio phát âm và liên kết tra thêm Oxford & Cambridge.</p>
            <span className="count">Tra từ ngay →</span>
          </Link>

          <Link href="/flashcards" className="skill-card sk-pink reveal" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="icon">🃏</div>
            <h3>Flashcard 3D & Lặp lại ngắt quãng</h3>
            <p>Học theo 43 bộ từ chuẩn hóa, lật thẻ 3D, phân loại từ đã thuộc và tự động ôn lại theo chu kỳ ghi nhớ.</p>
            <span className="count">Luyện Flashcard →</span>
          </Link>

          <Link href="/toeic" className="skill-card sk-teal reveal" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="icon">💼</div>
            <h3>Luyện thi TOEIC Reading</h3>
            <p>515 câu hỏi Part 5, 6, 7 chuẩn format ETS, giải thích chi tiết song ngữ Anh-Việt và bảng tra cứu lỗi sai.</p>
            <span className="count">Vào phòng thi →</span>
          </Link>

          <Link href="/quiz" className="skill-card sk-orange reveal" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="icon">🏆</div>
            <h3>Đấu trường Quiz 10 câu</h3>
            <p>Trắc nghiệm tốc độ bấm giờ, chấm điểm tự động và lưu lịch sử rèn luyện phản xạ ngôn ngữ.</p>
            <span className="count">Thử sức Quiz →</span>
          </Link>

          <Link href="/flashcards" className="skill-card sk-purple reveal" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="icon">🎮</div>
            <h3>7 chế độ luyện phản xạ</h3>
            <p>Lật thẻ, điền từ khuyết, nghe–chép chính tả, ghép cặp tốc độ và game gõ chữ Card Blast vô tận.</p>
            <span className="count">Khám phá game →</span>
          </Link>

          <Link href="/progress" className="skill-card sk-green reveal" style={{ textDecoration: 'none', color: '#fff' }}>
            <div className="icon">📈</div>
            <h3>Bảng tiến độ & Thống kê</h3>
            <p>Theo dõi thời gian hoạt động thực tế 14 ngày, chuỗi streak bền bỉ và biểu đồ tỷ lệ chính xác.</p>
            <span className="count">Xem tiến độ →</span>
          </Link>
        </div>
      </section>

      {/* 3. TOPICS & DECKS SHOWCASE ("Chuyên đề & Bộ từ vựng") */}
      <section>
        <div className="section-header-block reveal">
          <span className="section-badge">📚 KHO HỌC LIỆU CHUẨN HOÁ</span>
          <h2 className="section-title">
            <span>🌟</span> Chuyên đề từ vựng trọng tâm
          </h2>
          <p className="section-desc">
            Tổng hợp hơn 860 thuật ngữ chọn lọc theo chuẩn giao tiếp quốc tế, bài thi TOEIC và kỳ thi chứng chỉ học thuật IELTS.
          </p>
        </div>

        <div className="card-grid">
          {DEFAULT_TOPICS.map((t) => (
            <Link
              key={t.topic}
              href={t.href}
              className={`skill-card reveal ${t.cls}`}
              style={{ textDecoration: 'none', color: '#fff' }}
            >
              <div className="icon">{t.icon}</div>
              <h3>{t.name}</h3>
              <p>{t.count}+ từ vựng & câu hỏi thực chiến</p>
              <span className="count">Bắt đầu học →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION ("Quy trình học tập 4 bước") */}
      <section>
        <div className="section-header-block reveal">
          <span className="section-badge">⚡ PHƯƠNG PHÁP KHOA HỌC</span>
          <h2 className="section-title">
            <span>🔄</span> Quy trình làm chủ tiếng Anh 4 bước
          </h2>
          <p className="section-desc">
            Ứng dụng nguyên lý Spaced Repetition (Lặp lại ngắt quãng) và Active Recall giúp kiến thức chuyển hóa sâu vào trí nhớ dài hạn.
          </p>
        </div>

        <div className="how-it-works-flow">
          <div className="step-card reveal">
            <div className="step-badge-num">01</div>
            <div className="step-icon-wrap">🔍</div>
            <h3>Tra cứu & Tiếp nạp</h3>
            <p>Tìm hiểu ngữ nghĩa, phiên âm chuẩn IPA, nghe phát âm bản ngữ và đặt từ trong ngữ cảnh câu văn thực tế.</p>
          </div>

          <div className="step-card reveal">
            <div className="step-badge-num">02</div>
            <div className="step-icon-wrap">🃏</div>
            <h3>Ghi nhớ Flashcard 3D</h3>
            <p>Luyện tập trực quan với hiệu ứng 3D, kích hoạt trí nhớ bằng câu hỏi gợi ý và chu kỳ ngắt quãng thông minh.</p>
          </div>

          <div className="step-card reveal">
            <div className="step-badge-num">03</div>
            <div className="step-icon-wrap">⚡</div>
            <h3>Thực chiến TOEIC & Game</h3>
            <p>Luyện đề TOEIC Reading Part 5/6/7, nghe-chép chính tả và thử thách tốc độ phản xạ với Card Blast.</p>
          </div>

          <div className="step-card reveal">
            <div className="step-badge-num">04</div>
            <div className="step-icon-wrap">📊</div>
            <h3>Đo lường & Bứt phá</h3>
            <p>Theo dõi số phút học thực tế mỗi ngày, duy trì ngọn lửa streak và vinh danh trên bảng xếp hạng.</p>
          </div>
        </div>
      </section>

      {/* 5. INSPIRATIONAL QUOTE BANNER */}
      <section className="quote-highlight-card reveal">
        <div>
          <span className="quote-tag">💡 BÍ QUYẾT THÀNH CÔNG</span>
          <p className="quote-text">
            &ldquo;Học một ngôn ngữ mới không chỉ là học những từ mới, mà là mở ra một góc nhìn mới về thế giới. Chìa khóa duy nhất là sự kiên trì luyện tập mỗi ngày.&rdquo;
          </p>
          <div className="quote-author">
            📚 EnglishFun &bull; Học là nhớ • Luyện là thành thạo
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 52, animation: 'float 3.5s ease-in-out infinite' }}>🎯</div>
          <div style={{ fontSize: 52, animation: 'float 4s ease-in-out infinite alternate' }}>🚀</div>
        </div>
      </section>

      {/* 6. BOTTOM CTA PANEL */}
      <section className="cta-panel reveal">
        <div style={{ fontSize: 48, marginBottom: 10, animation: 'float 3.5s ease-in-out infinite' }}>
          🚀
        </div>
        <h2 style={{ color: 'var(--heading)', margin: '0 0 10px', fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800 }}>
          Sẵn sàng bứt phá tiếng Anh cùng EnglishFun?
        </h2>
        <p style={{ color: 'var(--muted)', maxWidth: 620, margin: '0 auto 24px', fontSize: 16, lineHeight: 1.65 }}>
          Khám phá ngay kho từ vựng hơn 860 từ, bộ đề thi TOEIC Reading phong phú và các chế độ luyện tập trực quan hoàn toàn miễn phí.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/flashcards"
            className="btn btn-primary"
            style={{ padding: '14px 38px', fontSize: 17, boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)' }}
          >
            🃏 Bắt đầu học Flashcard ngay
          </Link>
          <Link href="/toeic" className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: 16 }}>
            💼 Thử sức đề thi TOEIC Reading
          </Link>
        </div>
      </section>
    </div>
  );
}
