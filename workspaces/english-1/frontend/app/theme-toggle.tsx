'use client';

import { useEffect, useState } from 'react';
import { THEME_KEY, type Theme } from '../lib/theme';

function currentTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') {
    return 'dark';
  }
  return 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        document.documentElement.dataset.theme = saved;
      } else {
        setTheme(currentTheme());
      }
    } catch {
      setTheme(currentTheme());
    }
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode */
    }
    document.documentElement.dataset.theme = next;
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title="Đổi giao diện sáng/tối"
    >
      {theme === 'dark' ? '☀️ Sáng' : '🌙 Tối'}
    </button>
  );
}
