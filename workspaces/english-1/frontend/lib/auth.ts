import { API_BASE } from './api';

const TOKEN_KEY = 'englishfun_session';

export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export function getToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* trình duyệt chặn storage */
  }
}

export function clearToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* bỏ qua */
  }
}

export class AuthExpiredError extends Error {
  constructor() {
    super('Phiên đăng nhập hết hạn, mời đăng nhập lại.');
  }
}

/** fetch kèm Bearer token; 401 -> xóa token + báo hết phiên (gate đá về login). */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  // Render free ngu dong: lan goi dau co the treo ~50s+. Timeout 60s de khong treo nut vo han.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store', signal: ctrl.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Máy chủ đang khởi động (gói miễn phí ~1 phút). Đợi chút rồi bấm lại nhé.');
    }
    throw new Error('Không nối được máy chủ (backend chưa chạy?).');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) {
    // Không gửi token (đăng nhập/đăng ký/quên pass): 401 là lỗi nghiệp vụ -> hiện đúng lỗi server.
    if (!token) {
      const data = (await res.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(typeof data?.detail === 'string' && data.detail ? data.detail : 'Tài khoản hoặc mật khẩu không đúng. Vui lòng thử lại.');
    }
    clearToken();
    try {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    } catch {
      /* SSR: bỏ qua */
    }
    throw new AuthExpiredError();
  }
  return res;
}

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(typeof data?.detail === 'string' && data.detail ? data.detail : `Lỗi ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function register(username: string, password: string, email: string): Promise<string> {
  const data = await authPost<{ token: string; username: string }>('/api/auth/register', {
    username,
    password,
    email,
  });
  setToken(data.token);
  return data.username;
}

export async function login(username: string, password: string): Promise<string> {
  const data = await authPost<{ token: string; username: string }>('/api/auth/login', { username, password });
  setToken(data.token);
  return data.username;
}

export async function fetchMe(): Promise<string> {
  const res = await authFetch('/api/auth/me');
  if (!res.ok) throw new AuthExpiredError();
  const data = (await res.json()) as { username?: string };
  if (!data.username) throw new AuthExpiredError();
  return data.username;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await authPost<{ ok: boolean }>('/api/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

/** Xin mã đặt lại mật khẩu (luôn ok để không lộ tài khoản nào tồn tại). */
export async function forgotPassword(username: string): Promise<void> {
  await authPost<{ ok: boolean }>('/api/auth/forgot', { username });
}

/** Đặt lại mật khẩu bằng mã 6 số gửi về Gmail. */
export async function resetPassword(username: string, code: string, newPassword: string): Promise<void> {
  await authPost<{ ok: boolean }>('/api/auth/reset', {
    username,
    code,
    new_password: newPassword,
  });
}

export async function logout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* token hỏng thì cứ xóa local */
  } finally {
    clearToken();
  }
}
