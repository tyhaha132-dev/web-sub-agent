'use client';

import { useEffect, useState } from 'react';
import type { ToastMessage } from '../lib/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function handleToast(e: Event) {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev.slice(-3), newToast]);

      // Auto dismiss after 3500ms
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    }

    window.addEventListener('englishfun-toast', handleToast);
    return () => window.removeEventListener('englishfun-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" role="region">
      {toasts.map((t) => {
        const icon = t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️';
        return (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
                lineHeight: 1,
              }}
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
