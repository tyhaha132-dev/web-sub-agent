import type { ReactNode } from 'react';
import './globals.css';

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
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="site-header">
          <a className="site-logo" href="/">📚 English<span>Fun</span></a>
          <nav className="site-nav">
            {links.map(([label, href]) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </nav>
        </header>
        <div className="page">{children}</div>
        <footer className="site-footer">
          EnglishFun — học từ vựng, quiz và tiến độ mỗi ngày 🎯
        </footer>
      </body>
    </html>
  );
}
