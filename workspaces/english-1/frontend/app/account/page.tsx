'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { changePassword, fetchMe, getToken } from '../../lib/auth';

export default function Account() {
  const [username, setUsername] = useState<string>('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) {
      fetchMe().then(setUsername).catch(() => {});
    }
  }, []);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (newPw.length < 4) {
      setErr('Mật khẩu mới cần tối thiểu 4 ký tự.');
      return;
    }
    if (newPw !== confirm) {
      setErr('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(oldPw, newPw);
      setMsg('Đổi mật khẩu thành công! Tất cả các phiên làm việc khác đã được đăng xuất.');
      setOldPw('');
      setNewPw('');
      setConfirm('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-wrapper">
      {/* Breadcrumb Trail */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Link href="/" className="bio-breadcrumb-link">← Trang chủ</Link>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
        <span className="category-pill">BẢO MẬT TÀI KHOẢN</span>
      </div>

      {/* Account Info Header Card */}
      <div className="account-header-card">
        <div className="account-avatar-circle">
          {username ? username.charAt(0).toUpperCase() : '👤'}
        </div>
        <div className="account-user-meta">
          <h2>{username ? username : 'Tài khoản học viên'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="account-user-badge">● Phiên đang kích hoạt</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>EnglishFun Member</span>
          </div>
        </div>
      </div>

      {/* Password Change Form Card */}
      <form className="account-form-card" onSubmit={submit}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 800, color: 'var(--heading)' }}>
            🔑 Đổi mật khẩu
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Để bảo vệ an toàn cho dữ liệu học tập, hãy cập nhật mật khẩu định kỳ và không chia sẻ mật khẩu cho người khác.
          </p>
        </div>

        {err && (
          <div className="account-alert-banner error">
            <span>⚠️</span>
            <span>{err}</span>
          </div>
        )}

        {msg && (
          <div className="account-alert-banner success">
            <span>✅</span>
            <span>{msg}</span>
          </div>
        )}

        <label className="account-field-label">
          <span>Mật khẩu hiện tại</span>
          <div className="account-input-wrap">
            <span className="account-input-icon">🔒</span>
            <input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              placeholder="Nhập mật khẩu đang sử dụng"
              autoComplete="current-password"
              required
            />
          </div>
        </label>

        <label className="account-field-label">
          <span>Mật khẩu mới</span>
          <div className="account-input-wrap">
            <span className="account-input-icon">🔑</span>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Mật khẩu mới (ít nhất 4 ký tự)"
              autoComplete="new-password"
              required
            />
          </div>
          <span className="account-hint">Mẹo: Nên kết hợp cả chữ cái và số để tăng tính bảo mật.</span>
        </label>

        <label className="account-field-label">
          <span>Nhập lại mật khẩu mới</span>
          <div className="account-input-wrap">
            <span className="account-input-icon">🔐</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Xác nhận mật khẩu mới chính xác"
              autoComplete="new-password"
              required
            />
          </div>
        </label>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <button
            className="cirrus-btn-primary"
            type="submit"
            disabled={busy}
            style={{ padding: '11px 26px', fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy ? '⏳ Đang lưu...' : '💾 Cập nhật mật khẩu'}
          </button>

          <Link
            href="/"
            className="header-logout"
            style={{ textDecoration: 'none' }}
          >
            Hủy bỏ
          </Link>
        </div>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <div>
            <b>Bảo mật phiên đăng nhập:</b> EnglishFun lưu trữ phiên trên trình duyệt hiện tại. Đóng toàn bộ tab trình duyệt sẽ tự động kết thúc phiên làm việc.
          </div>
        </div>
      </form>
    </main>
  );
}
