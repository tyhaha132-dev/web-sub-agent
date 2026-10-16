import type { ReactNode } from 'react';
import Script from 'next/script';
import './globals.css';
import AuthGate from './auth-gate';
import { THEME_KEY } from '../lib/theme';

export const metadata = {
  title: 'EnglishFun — Luyện tiếng Anh mỗi ngày',
  description: 'Từ điển, flashcards, quiz trắc nghiệm và theo dõi tiến độ',
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>" />
      </head>
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
