export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'success'): void {
  if (typeof window === 'undefined') return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(
    new CustomEvent('englishfun-toast', {
      detail: { id, message, type },
    })
  );
}

export const toast = {
  success: (msg: string) => showToast(msg, 'success'),
  error: (msg: string) => showToast(msg, 'error'),
  info: (msg: string) => showToast(msg, 'info'),
};
