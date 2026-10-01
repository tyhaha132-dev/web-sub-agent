'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ThemeToggle from './theme-toggle';
import LoginForm from './login-form';
import { fetchMe, getToken, logout } from '../lib/auth';

const links = [
  ['Trang chủ', '/'],
  ['Từ điển', '/dictionary'],
  ['Luyện tập', '/flashcards'],
  ['Quiz', '/quiz'],
  ['TOEIC', '/toeic'],
  ['Tiến độ', '/progress'],
  ['Xếp hạng', '/leaderboard'],
  ['Thư mục', '/folders'],
] as const;

/** Cổng đăng nhập: chưa có phiên hợp lệ thì chỉ hiện form login/register. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    fetchMe()
      .then((name) => setUser(name))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
    const onExpired = () => setUser(null);
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  async function doLogout() {
    await logout();
    setUser(null);
  }

  if (checking) {
    return (
      <div className="page">
        <main>
          <div className="panel">⏳ Đang kiểm tra phiên đăng nhập...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <LoginForm onAuth={(name) => setUser(name)} />
      </div>
    );
  }

  return (
    <>
      <header className="site-header">
        <a className="site-logo" href="/">📚 English<span>Fun</span></a>
        <nav className="site-nav">
          {links.map(([label, href]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
        <span className="header-spacer" />
        <span style={{ color: '#fff', fontSize: 14 }}>👤 {user}</span>
        <a href="/account" style={{ color: '#fff', fontSize: 14 }}>⚙️ Tài khoản</a>
        <button
          onClick={() => void doLogout()}
          style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}
        >
          Đăng xuất
        </button>
        <ThemeToggle />
      </header>
      <div className="page">{children}</div>
      <footer className="site-footer">
        EnglishFun — học từ vựng, quiz và tiến độ mỗi ngày 🎯
      </footer>
    </>
  );
}
