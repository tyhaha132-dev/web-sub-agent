'use client';

import { useState } from 'react';
import { USERNAME_RE, forgotPassword, login, register, resetPassword } from '../lib/auth';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const fieldStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginTop: 6,
  borderRadius: 10,
  border: '1px solid var(--border, #ddd)',
  fontSize: 15,
} as const;

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ ...fieldStyle, paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 17,
        }}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

export default function LoginForm({ onAuth }: { onAuth: (username: string) => void }) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchTab(t: 'login' | 'register' | 'forgot') {
    setTab(t);
    setError('');
    setDoneMsg('');
    setCodeSent(false);
  }

  function validAccount(requireEmail: boolean): string | null {
    const u = username.trim();
    if (!u && !password) return 'Vui lòng nhập tài khoản và mật khẩu.';
    if (!u) return 'Vui lòng nhập tên tài khoản.';
    if (!password) return 'Vui lòng nhập mật khẩu.';
    if (!USERNAME_RE.test(u)) return 'Tên tài khoản 3–32 ký tự: chữ, số, _, -, .';
    if (requireEmail && !EMAIL_RE.test(email.trim())) return 'Email chưa đúng (vd: ban@gmail.com).';
    if (password.length < 4) return 'Mật khẩu ít nhất 4 ký tự.';
    return null;
  }

  async function submitAuth(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    const err = validAccount(tab === 'register');
    if (err) {
      setError(err);
      return;
    }
    if (tab === 'register' && password !== confirm) {
      setError('Nhập lại mật khẩu chưa khớp.');
      return;
    }
    setBusy(true);
    try {
      const name =
        tab === 'login'
          ? await login(username.trim(), password)
          : await register(username.trim(), password, email.trim().toLowerCase());
      onAuth(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi, thử lại nhé.');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    setDoneMsg('');
    if (!username.trim()) {
      setError('Nhập tên tài khoản cần lấy lại mật khẩu.');
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(username.trim());
      setCodeSent(true);
      setDoneMsg('📧 Nếu tài khoản tồn tại, mã 6 số đã gửi tới Gmail đăng ký (hiệu lực 15 phút).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi, thử lại nhé.');
    } finally {
      setBusy(false);
    }
  }

  async function doReset(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError('');
    setDoneMsg('');
    if (code.trim().length < 4) {
      setError('Nhập mã 6 số trong Gmail.');
      return;
    }
    if (password.length < 4) {
      setError('Mật khẩu mới ít nhất 4 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Nhập lại mật khẩu mới chưa khớp.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(username.trim(), code.trim(), password);
      setDoneMsg('✅ Đặt lại mật khẩu xong! Đăng nhập lại nhé.');
      setPassword('');
      setConfirm('');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi, thử lại nhé.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 460, margin: '0 auto' }}>
      <div
        style={{
          textAlign: 'center',
          borderRadius: 20,
          padding: '28px 20px',
          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 44 }}>📚</div>
        <h1 style={{ margin: '8px 0 4px', color: '#fff' }}>EnglishFun</h1>
        <p style={{ margin: 0, opacity: 0.92 }}>
          Học từ vựng, quiz và TOEIC — tiến độ lưu riêng cho bạn.
        </p>
      </div>

      <div className="topic-row" style={{ justifyContent: 'center' }}>
        <button className={`topic-chip ${tab === 'login' ? 'active' : ''}`} onClick={() => switchTab('login')}>
          🔑 Đăng nhập
        </button>
        <button className={`topic-chip ${tab === 'register' ? 'active' : ''}`} onClick={() => switchTab('register')}>
          📝 Đăng ký
        </button>
        <button className={`topic-chip ${tab === 'forgot' ? 'active' : ''}`} onClick={() => switchTab('forgot')}>
          ❓ Quên mật khẩu
        </button>
      </div>

      {tab !== 'forgot' ? (
        <form className="panel" onSubmit={submitAuth} style={{ marginTop: 12 }}>
          <label>
            Tên tài khoản
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="vd: hoangtai"
              autoComplete="username"
              style={fieldStyle}
            />
          </label>
          {tab === 'register' && (
            <label style={{ display: 'block', marginTop: 12 }}>
              Gmail (để lấy lại mật khẩu)
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: ban@gmail.com"
                autoComplete="email"
                style={fieldStyle}
              />
            </label>
          )}
          <label style={{ display: 'block', marginTop: 12 }}>
            Mật khẩu
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder={tab === 'register' ? 'Ít nhất 4 ký tự' : 'Mật khẩu của bạn'}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {tab === 'register' && (
            <label style={{ display: 'block', marginTop: 12 }}>
              Nhập lại mật khẩu
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
            </label>
          )}
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 12, width: '100%' }}>
            {busy ? '⏳ Đang xử lý...' : tab === 'login' ? 'Đăng nhập →' : 'Tạo tài khoản →'}
          </button>
        </form>
      ) : (
        <div className="panel" style={{ marginTop: 12 }}>
          {!codeSent ? (
            <form onSubmit={sendCode}>
              <p style={{ marginTop: 0 }}>Nhập tên tài khoản, mã 6 số sẽ gửi về Gmail đã đăng ký.</p>
              <label>
                Tên tài khoản
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="vd: hoangtai"
                  autoComplete="username"
                  style={fieldStyle}
                />
              </label>
              {error && <p style={{ color: 'crimson' }}>{error}</p>}
              {doneMsg && <p>{doneMsg}</p>}
              <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 12, width: '100%' }}>
                {busy ? '⏳ Đang gửi...' : '📧 Gửi mã qua Gmail'}
              </button>
            </form>
          ) : (
            <form onSubmit={doReset}>
              <p style={{ marginTop: 0 }}>{doneMsg}</p>
              <label>
                Mã 6 số trong Gmail
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'block', marginTop: 12 }}>
                Mật khẩu mới
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="Ít nhất 4 ký tự"
                  autoComplete="new-password"
                />
              </label>
              <label style={{ display: 'block', marginTop: 12 }}>
                Nhập lại mật khẩu mới
                <PasswordInput
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                />
              </label>
              {error && <p style={{ color: 'crimson' }}>{error}</p>}
              <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 12, width: '100%' }}>
                {busy ? '⏳ Đang đặt lại...' : '✅ Đặt lại mật khẩu'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => switchTab('login')}
                style={{ marginTop: 8, width: '100%' }}
              >
                ← Về đăng nhập
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
