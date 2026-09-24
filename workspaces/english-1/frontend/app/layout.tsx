import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import ThemeToggle from './theme-toggle';
import { THEME_KEY } from '../lib/theme';

export const metadata = {
  title: 'EnglishFun — Luyện tiếng Anh mỗi ngày',
  description: 'Từ điển, flashcards, quiz trắc nghiệm và theo dõi tiến độ',
};

const links = [
  ['Trang chủ', '/'],
  ['Từ điển', '/dictionary'],
  ['Luyện tập', '/flashcards'],
  ['Quiz', '/quiz'],
  ['Tiến độ', '/progress'],
  ['Thư mục', '/folders'],
] as const;

const THEME_INIT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
      </head>
      <body>
        <header className="site-header">
          <a className="site-logo" href="/">📚 English<span>Fun</span></a>
          <nav className="site-nav">
            {links.map(([label, href]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </nav>
          <span className="header-spacer" />
          <ThemeToggle />
        </header>
        <div className="page">{children}</div>
        <footer className="site-footer">
          EnglishFun — học từ vựng, quiz và tiến độ mỗi ngày 🎯
        </footer>
      </body>
    </html>
  );
}
