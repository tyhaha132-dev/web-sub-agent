'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { wakeBackend, speak, fetchTopics, calculateStreak, type Topic } from '../lib/api';
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
  const [userStats, setUserStats] = useState<{
    streak: number;
    accuracy: number;
    avgMinutes: string;
    hasData: boolean;
  } | null>(null);
  const rootRef = useReveal();

  useEffect(() => {
    wakeBackend();

    authFetch('/api/words?limit=1')
      .then((r) => r.json())
      .then((d: { total?: number }) => {
        if (typeof d.total === 'number' && d.total > 0) setTotalWords(d.total);
      })
      .catch(() => {});

    fetchTopics()
      .then((ts) => ts && ts.length > 0 && setTopics(ts))
      .catch(() => {});

    if (getToken()) {
      authFetch('/api/progress')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { attempts?: number; avg_rate?: number; total_minutes?: number; daily?: { day: string; minutes: number }[] } | null) => {
          if (!d) return;
          const streak = calculateStreak(d.daily ?? []);
          const accuracy = Math.round((d.avg_rate ?? 0) * 100);
          const days = d.daily && d.daily.length > 0 ? 14 : 1;
          const avgMinutes = ((d.total_minutes ?? 0) / days).toFixed(1);
          setUserStats({
            streak,
            accuracy,
            avgMinutes: avgMinutes.endsWith('.0') ? avgMinutes.slice(0, -2) : avgMinutes,
            hasData: (d.attempts ?? 0) > 0 || (d.total_minutes ?? 0) > 0,
          });
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div ref={rootRef} className="landing">
      {/* 1. CIRRUS-INSPIRED CLOUDSCAPE HERO SECTION */}
      <section className="hero-cirrus">
        {/* Layered Painterly Cumulus Clouds Backdrop */}
        <div className="cirrus-clouds-layer" aria-hidden="true">
          {/* Cloud Left */}
          <svg className="cirrus-cloud-svg cirrus-cloud-left" viewBox="0 0 520 480" fill="none">
            <defs>
              <linearGradient id="cloudGradLeft" x1="20%" y1="0%" x2="40%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                <stop offset="60%" stopColor="#f0f7fe" stopOpacity="0.94" />
                <stop offset="100%" stopColor="#b8def7" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <circle cx="120" cy="240" r="140" fill="url(#cloudGradLeft)" />
            <circle cx="260" cy="180" r="120" fill="url(#cloudGradLeft)" />
            <circle cx="340" cy="280" r="130" fill="url(#cloudGradLeft)" />
            <circle cx="200" cy="320" r="110" fill="url(#cloudGradLeft)" />
            <circle cx="80" cy="140" r="90" fill="#ffffff" fillOpacity="0.85" />
            <circle cx="220" cy="110" r="85" fill="#ffffff" fillOpacity="0.9" />
          </svg>

          {/* Cloud Right (Towering cumulus like Cirrus) */}
          <svg className="cirrus-cloud-svg cirrus-cloud-right" viewBox="0 0 660 580" fill="none">
            <defs>
              <linearGradient id="cloudGradRight" x1="40%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="55%" stopColor="#eef6fe" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#b4daf5" stopOpacity="0.88" />
              </linearGradient>
            </defs>
            <circle cx="480" cy="260" r="170" fill="url(#cloudGradRight)" />
            <circle cx="320" cy="200" r="150" fill="url(#cloudGradRight)" />
            <circle cx="190" cy="300" r="130" fill="url(#cloudGradRight)" />
            <circle cx="380" cy="390" r="160" fill="url(#cloudGradRight)" />
            <circle cx="230" cy="160" r="105" fill="#ffffff" fillOpacity="0.92" />
            <circle cx="390" cy="110" r="115" fill="#ffffff" fillOpacity="0.95" />
            <circle cx="530" cy="150" r="95" fill="#ffffff" fillOpacity="0.88" />
          </svg>

          {/* Floating Drift Cloud 1 */}
          <svg className="cirrus-cloud-svg cirrus-cloud-wisp-1" viewBox="0 0 260 140" fill="none">
            <ellipse cx="130" cy="80" rx="100" ry="45" fill="#ffffff" fillOpacity="0.78" />
            <ellipse cx="90" cy="65" rx="60" ry="35" fill="#ffffff" fillOpacity="0.88" />
            <ellipse cx="170" cy="70" rx="55" ry="32" fill="#ffffff" fillOpacity="0.82" />
          </svg>

          {/* Floating Drift Cloud 2 */}
          <svg className="cirrus-cloud-svg cirrus-cloud-wisp-2" viewBox="0 0 240 120" fill="none">
            <ellipse cx="120" cy="70" rx="90" ry="38" fill="#ffffff" fillOpacity="0.75" />
            <ellipse cx="85" cy="55" rx="50" ry="30" fill="#ffffff" fillOpacity="0.85" />
            <ellipse cx="155" cy="60" rx="48" ry="28" fill="#ffffff" fillOpacity="0.8" />
          </svg>
        </div>

        {/* Hero Content */}
        <div className="cirrus-hero-inner">
          <h1 className="cirrus-hero-title reveal">
            Học tiếng Anh thông minh trên một nền tảng bình yên &amp; tinh gọn.
          </h1>

          <p className="cirrus-hero-subtitle reveal">
            EnglishFun là không gian học tập tĩnh lặng cho người bận rộn. Tra từ điển tức thì, lật Flashcard 3D sống động, luyện phản xạ Quiz và theo dõi tiến độ mỗi ngày — không xao nhãng, không áp lực.
          </p>

          <div className="cirrus-btn-row reveal">
            <Link href="/flashcards" className="cirrus-btn-primary">
              <span style={{ fontSize: 13, marginRight: 2 }}>▷</span> Bắt đầu học ngay
            </Link>
            <Link href="/dictionary" className="cirrus-btn-secondary">
              <span style={{ fontSize: 14, marginRight: 2 }}>⊙</span> Khám phá tính năng
            </Link>
          </div>
        </div>

        {/* Floating App Dashboard Window Mockup */}
        <div className="cirrus-mockup-frame reveal">
          {/* Mockup Top Navigation Bar */}
          <div className="cirrus-mockup-topbar">
            <div className="mockup-nav-group">
              <button type="button" className="mockup-pill-tab active">
                <span>⊞</span> Tổng quan
              </button>
              <Link href="/dictionary" className="mockup-pill-tab">
                <span>🔤</span> Từ điển
              </Link>
              <Link href="/flashcards" className="mockup-pill-tab">
                <span>🃏</span> Flashcard 3D
              </Link>
              <Link href="/quiz" className="mockup-pill-tab">
                <span>🏆</span> Quiz phản xạ
              </Link>
              <Link href="/toeic" className="mockup-pill-tab">
                <span>💼</span> TOEIC ETS
              </Link>
            </div>

            <div className="mockup-tools-group">
              <div className="mockup-search-pill">
                <span>🔍</span>
                <span>Tra nhanh 862+ từ vựng...</span>
              </div>
              <span style={{ fontSize: 16, cursor: 'pointer', padding: '0 4px' }} title="Thông báo">🔔</span>
              <span className="mockup-avatar-badge" title="Tài khoản học viên">EF</span>
            </div>
          </div>

          {/* Mockup Body Content */}
          <div className="cirrus-mockup-body">
            <div className="mockup-title-row">
              <div>
                <h3>EnglishFun Workspace</h3>
                <p>Tín hiệu học tập thực tế từ tất cả chuyên đề bạn đang theo đuổi.</p>
              </div>
              <div className="mockup-filter-chips">
                <span className="mockup-chip">📅 14 ngày gần nhất</span>
              </div>
            </div>

            <div className="mockup-grid-2col">
              {/* Left Column: Interactive Study Cards & Reflex Quiz */}
              <div className="mockup-card-deck">
                {/* Word 1: Serendipity */}
                <div className="mockup-word-box">
                  <div className="mockup-word-header">
                    <div>
                      <span className="mockup-word-name">
                        Serendipity
                        <button
                          type="button"
                          className="mockup-audio-btn"
                          title="Phát âm chuẩn IPA"
                          onClick={() => speak('Serendipity')}
                        >
                          🔊
                        </button>
                      </span>
                      <div className="mockup-ipa">/ˌser.ənˈdɪp.ə.ti/</div>
                    </div>
                    <span className="mockup-tag">IELTS 7.5+ • Academic</span>
                  </div>
                  <p className="mockup-def">
                    Khả năng tình cờ phát hiện ra những điều tốt đẹp, quý giá một cách hoàn toàn tự nhiên và bất ngờ.
                  </p>
                  <p className="mockup-ex">
                    &ldquo;Finding EnglishFun was a lucky stroke of serendipity in my learning journey.&rdquo;
                  </p>
                </div>

                {/* Word 2: Resilience */}
                <div className="mockup-word-box">
                  <div className="mockup-word-header">
                    <div>
                      <span className="mockup-word-name">
                        Resilience
                        <button
                          type="button"
                          className="mockup-audio-btn"
                          title="Phát âm chuẩn IPA"
                          onClick={() => speak('Resilience')}
                        >
                          🔊
                        </button>
                      </span>
                      <div className="mockup-ipa">/rɪˈzɪl.jəns/</div>
                    </div>
                    <span className="mockup-tag" style={{ background: '#ecfdf5', color: '#047857' }}>
                      TOEIC Core • Workplace
                    </span>
                  </div>
                  <p className="mockup-def">
                    Khả năng kiên cường phục hồi và bứt phá sau những thử thách khó khăn.
                  </p>
                  <p className="mockup-ex">
                    &ldquo;Consistent daily study builds mental resilience and lasting language fluency.&rdquo;
                  </p>
                </div>

                {/* Reflex Quiz mini widget */}
                <div className="mockup-word-box" style={{ background: 'var(--panel)', border: '1.5px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      ⚡ Mini Quiz phản xạ
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>20s bấm giờ</span>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--heading)', marginBottom: 10 }}>
                    Which word best describes bouncing back quickly from difficulty?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--ghost-bg)', fontSize: 12.5, fontWeight: 600 }}>
                      A. Fragility
                    </div>
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: 12.5, fontWeight: 700 }}>
                      B. Resilience ✓
                    </div>
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--ghost-bg)', fontSize: 12.5, fontWeight: 600 }}>
                      C. Hesitation
                    </div>
                    <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--ghost-bg)', fontSize: 12.5, fontWeight: 600 }}>
                      D. Complacency
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Cirrus-style Chat Speech Bubble & Stats */}
              <div className="mockup-chat-panel">
                <div>
                  <div className="cirrus-bubble">
                    <div className="cirrus-bubble-meta">🤖 Trợ lý EnglishFun • Vừa xong</div>
                    <div>Hôm nay bạn đã ôn tập 18 từ vựng, độ nhớ duy trì 92% 🎉</div>
                  </div>

                  <div className="cirrus-bubble">
                    <div className="cirrus-bubble-meta">💡 Spaced Repetition Tip</div>
                    <div>Lặp lại vào ngày 1, 3, 7 để chuyển từ vựng vào trí nhớ dài hạn không bao giờ quên.</div>
                  </div>
                </div>

                <div className="mockup-stats-chips-row">
                  <div className="mockup-stat-tile">
                    <b>🔥 {userStats ? `${userStats.streak} ngày` : '0 ngày'}</b>
                    <span>Chuỗi học bền bỉ</span>
                  </div>
                  <div className="mockup-stat-tile">
                    <b><CountUp to={totalWords || 862} suffix="+" /></b>
                    <span>Từ vựng chuẩn</span>
                  </div>
                  <div className="mockup-stat-tile">
                    <b>{userStats && userStats.hasData ? `${userStats.accuracy}%` : '0%'}</b>
                    <span>Độ chính xác Quiz</span>
                  </div>
                  <div className="mockup-stat-tile">
                    <b>{userStats && userStats.hasData ? `${userStats.avgMinutes} phút` : '0 phút'}</b>
                    <span>Trung bình mỗi ngày</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Page Content Body */}
      <div className="landing-body-container">
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
          <Link href="/dictionary" className="skill-card sk-blue reveal">
            <div className="icon">🔤</div>
            <h3>Từ điển đa nguồn thông minh</h3>
            <p>Tra cứu tức thì nghĩa, phiên âm IPA chuẩn Mỹ, audio phát âm và liên kết tra thêm Oxford & Cambridge.</p>
            <span className="count">Tra từ ngay →</span>
          </Link>

          <Link href="/flashcards" className="skill-card sk-pink reveal">
            <div className="icon">🃏</div>
            <h3>Flashcard 3D & Lặp lại ngắt quãng</h3>
            <p>Học theo 43 bộ từ chuẩn hóa, lật thẻ 3D, phân loại từ đã thuộc và tự động ôn lại theo chu kỳ ghi nhớ.</p>
            <span className="count">Luyện Flashcard →</span>
          </Link>

          <Link href="/toeic" className="skill-card sk-teal reveal">
            <div className="icon">💼</div>
            <h3>Luyện thi TOEIC Reading</h3>
            <p>515 câu hỏi Part 5, 6, 7 chuẩn format ETS, giải thích chi tiết song ngữ Anh-Việt và bảng tra cứu lỗi sai.</p>
            <span className="count">Vào phòng thi →</span>
          </Link>

          <Link href="/quiz" className="skill-card sk-orange reveal">
            <div className="icon">🏆</div>
            <h3>Đấu trường Quiz 10 câu</h3>
            <p>Trắc nghiệm tốc độ bấm giờ, chấm điểm tự động và lưu lịch sử rèn luyện phản xạ ngôn ngữ.</p>
            <span className="count">Thử sức Quiz →</span>
          </Link>

          <Link href="/flashcards" className="skill-card sk-purple reveal">
            <div className="icon">🎮</div>
            <h3>7 chế độ luyện phản xạ</h3>
            <p>Lật thẻ, điền từ khuyết, nghe–chép chính tả, ghép cặp tốc độ và game gõ chữ Card Blast vô tận.</p>
            <span className="count">Khám phá game →</span>
          </Link>

          <Link href="/progress" className="skill-card sk-green reveal">
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
    </div>
  );
}
