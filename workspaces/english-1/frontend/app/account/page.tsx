'use client';

import { useState } from 'react';
import { changePassword } from '../../lib/auth';

export default function Account() {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (newPw.length < 4) {
      setErr('Mật khẩu mới ít nhất 4 ký tự.');
      return;
    }
    if (newPw !== confirm) {
      setErr('Nhập lại mật khẩu mới chưa khớp.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(oldPw, newPw);
      setMsg('✅ Đổi mật khẩu xong. Các máy khác đã bị đăng xuất.');
      setOldPw('');
      setNewPw('');
      setConfirm('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Có lỗi, thử lại nhé.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 480 }}>
      <h1>⚙️ Tài khoản</h1>
      <div className="panel">
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          Đóng trình duyệt là tự đăng xuất. Đổi mật khẩu tại đây.
        </p>
      </div>
      <form className="panel" onSubmit={submit} style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>🔑 Đổi mật khẩu</h2>
        <label>
          Mật khẩu hiện tại
          <input
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Mật khẩu mới (≥4 ký tự)
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          Nhập lại mật khẩu mới
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, borderRadius: 8 }}
          />
        </label>
        {err && <p style={{ color: 'crimson' }}>{err}</p>}
        {msg && <p>{msg}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? '⏳ Đang đổi...' : 'Đổi mật khẩu'}
        </button>
      </form>
    </main>
  );
}
