'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './theme-toggle';
import LoginForm from './login-form';
import { fetchMe, getToken, logout, authFetch } from '../lib/auth';
import { startActivityTracker, calculateStreak } from '../lib/api';

const links = [
  ['Trang chủ', '/', '🏠'],
  ['Từ điển', '/dictionary', '🔤'],
  ['Luyện tập', '/flashcards', '🃏'],
  ['Quiz', '/quiz', '🏆'],
  ['TOEIC', '/toeic', '💼'],
  ['Tiến độ', '/progress', '📈'],
  ['Xếp hạng', '/leaderboard', '🥇'],
  ['Thư mục', '/folders', '📁'],
] as const;

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [streak, setStreak] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    fetchMe()
      .then((name) => {
        setUser(name);
        startActivityTracker();
        authFetch('/api/progress')
          .then((r) => r.json())
          .then((d: { daily?: { day: string; minutes: number }[] }) => {
            if (d && d.daily) setStreak(calculateStreak(d.daily));
          })
          .catch(() => {});
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));

    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  async function doLogout() {
    await logout();
    setUser(null);
    setStreak(null);
  }

  // 1. Loading state
  if (checking) {
    return (
      <div className="page loading-wrap">
        <main>
          <div className="loading-panel">
            <span className="loading-icon" role="img" aria-label="Book">📚</span>
            <h2 className="loading-title">Đang khởi tạo EnglishFun...</h2>
            <p className="loading-sub">Chuẩn bị từ điển, flashcard 3D và ngân hàng đề thi TOEIC</p>
            <div className="loading-track" aria-hidden="true">
              <div className="loading-fill" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 2. Chưa đăng nhập & muốn vào thẳng form đăng nhập hoặc đang ở các route yêu cầu đăng nhập
  const isHomePage = pathname === '/' || pathname === '' || pathname === null;
  const isDictionaryPage = pathname === '/dictionary' || pathname?.startsWith('/dictionary');
  const isPublicPage = isHomePage || isDictionaryPage;
  if (!user && (!isPublicPage || showLogin)) {
    return (
      <>
        <header className="site-header">
          <div className="header-brand-wrap">
            <Link className="site-logo" href="/" title="EnglishFun - Chinh phục tiếng Anh mỗi ngày">
              <span className="cirrus-logo-badge">✦</span>
              <span>English<span className="brand-num">Fun</span></span>
            </Link>
          </div>
          <span className="header-spacer" />
          <div className="header-actions">
            <Link href="/" className="cirrus-signin-link" onClick={() => setShowLogin(false)}>
              ← Trang chủ
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="page">
          {showLogin && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowLogin(false)}
              >
                ← Quay lại
              </button>
            </div>
          )}
          <LoginForm
            onAuth={(name) => {
              setUser(name);
              setShowLogin(false);
              startActivityTracker();
            }}
          />
        </div>
      </>
    );
  }

  // 3. Đã đăng nhập hoặc đang xem trang chủ ở chế độ khách
  return (
    <>
      <header className={`site-header ${isHomePage ? 'site-header-home' : ''}`}>
        <div className="header-brand-wrap">
          <Link className="site-logo" href="/" title="EnglishFun - Chinh phục tiếng Anh mỗi ngày">
            <span className="cirrus-logo-badge">✦</span>
            <span>English<span className="brand-num">Fun</span></span>
          </Link>
        </div>

        <nav className="site-nav" aria-label="Điều hướng chính">
          {links.map(([label, href]) => {
            const isActive = pathname === href || (href !== '/' && !!pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <span className="header-spacer" />

        <div className="header-actions">
          {user ? (
            <>
              {streak !== null && streak > 0 && (
                <span className="header-streak" title="Chuỗi ngày học liên tục">
                  <span role="img" aria-label="streak">🔥</span> {streak} ngày
                </span>
              )}
              <span className="header-user" title={`Tài khoản: ${user}`}>
                👤 <span className="user-name">{user}</span>
              </span>
              <Link
                href="/account"
                title="Cài đặt tài khoản"
                className="header-settings-btn"
              >
                ⚙️
              </Link>
              <button
                type="button"
                className="header-logout"
                onClick={() => void doLogout()}
                title="Đăng xuất khỏi tài khoản"
              >
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cirrus-signin-link"
                onClick={() => setShowLogin(true)}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className="cirrus-btn-cta"
                onClick={() => setShowLogin(true)}
              >
                <span>↗ Bắt đầu miễn phí</span>
              </button>
            </>
          )}

          <ThemeToggle />

          <button
            type="button"
            className={`hamburger-btn ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            title="Mở menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="site-logo">
                <span>📚 English<span className="brand-num">Fun</span></span>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setMenuOpen(false)}
                style={{ padding: '4px 10px', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {user && (
              <div className="mobile-user-card">
                <span style={{ fontSize: 24 }}>👤</span>
                <div>
                  <b style={{ display: 'block', color: 'var(--heading)' }}>{user}</b>
                  {streak !== null && streak > 0 && (
                    <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>
                      🔥 Chuỗi {streak} ngày học liên tục
                    </span>
                  )}
                </div>
              </div>
            )}

            <nav className="mobile-nav-list">
              {links.map(([label, href, icon]) => {
                const isActive = pathname === href || (href !== '/' && !!pathname?.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mobile-menu-footer">
              {user ? (
                <>
                  <Link
                    href="/account"
                    className="btn btn-ghost"
                    style={{ width: '100%', marginBottom: 10, textAlign: 'center', display: 'block' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    ⚙️ Quản lý tài khoản
                  </Link>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setMenuOpen(false);
                      void doLogout();
                    }}
                    style={{ width: '100%' }}
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowLogin(true);
                  }}
                  style={{ width: '100%' }}
                >
                  🔑 Đăng nhập / Đăng ký
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`page ${isHomePage ? 'page-home-cirrus' : ''}`}>{children}</div>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="cirrus-logo-badge" style={{ marginRight: 6 }}>✦</span>
              <span>English<span className="brand-num" style={{ color: '#38bdf8', marginLeft: 2 }}>Fun</span></span>
            </div>
            <p className="footer-desc">
              Nền tảng học tiếng Anh trực quan và toàn diện. Kết hợp Flashcard 3D thông minh, phương pháp Spaced Repetition, luyện đề TOEIC Reading chuẩn thi thật và đấu trường Quiz kịch tính.
            </p>
          </div>
          <div className="footer-links-group">
            <span className="footer-heading">Chức năng chính</span>
            <div className="footer-links">
              <Link href="/dictionary">🔤 Từ điển Anh–Việt</Link>
              <Link href="/flashcards">🃏 Flashcard 3D</Link>
              <Link href="/quiz">🏆 Đấu trường Quiz</Link>
              <Link href="/toeic">💼 Luyện thi TOEIC</Link>
              <Link href="/progress">📈 Theo dõi tiến độ</Link>
              <Link href="/leaderboard">🥇 Bảng xếp hạng</Link>
              <Link href="/folders">📁 Thư mục của tôi</Link>
              <Link href="/account">⚙️ Tài khoản cá nhân</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>EnglishFun • Nền tảng học từ vựng và luyện phản xạ tiếng Anh mỗi ngày 🎯</span>
          <span className="footer-tag">Phiên bản 2.0</span>
        </div>
      </footer>
    </>
  );
}
