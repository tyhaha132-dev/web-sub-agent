'use client';

import { toast } from '../../lib/toast';
import { triggerConfetti } from '../../lib/confetti';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { changePassword, fetchMe, getToken, authFetch } from '../../lib/auth';
import { calculateStreak } from '../../lib/api';

interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

export default function Account() {
  const [username, setUsername] = useState<string>('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{ totalMinutes: number; accuracy: number; streak: number; attempts: number }>({
    totalMinutes: 0,
    accuracy: 0,
    streak: 0,
    attempts: 0,
  });

  useEffect(() => {
    if (getToken()) {
      fetchMe().then(setUsername).catch(() => {});
      authFetch('/api/progress')
        .then((r) => r.json())
        .then((d) => {
          const streak = calculateStreak(d.daily ?? []);
          setStats({
            totalMinutes: d.total_minutes ?? 0,
            accuracy: d.accuracy ?? 0,
            streak,
            attempts: d.attempts ?? 0,
          });
        })
        .catch(() => {});
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

  const BADGES: Badge[] = [
    {
      id: 'member',
      icon: '🌟',
      title: 'Khởi đầu vững chắc',
      desc: 'Gia nhập cộng đồng học tập EnglishFun',
      unlocked: true,
    },
    {
      id: 'streak',
      icon: '🔥',
      title: 'Chiến binh Bền bỉ',
      desc: 'Duy trì chuỗi học tập liên tục từ 3 ngày trở lên',
      unlocked: stats.streak >= 3,
    },
    {
      id: 'quiz',
      icon: '🎯',
      title: 'Xạ thủ Phản xạ',
      desc: 'Đạt độ chính xác trung bình từ 80% trở lên',
      unlocked: stats.accuracy >= 80 && stats.attempts >= 1,
    },
    {
      id: 'time',
      icon: '⏱️',
      title: 'Học viên Chăm chỉ',
      desc: 'Tích lũy từ 30 phút học tập thực tế trên ứng dụng',
      unlocked: stats.totalMinutes >= 30,
    },
    {
      id: 'practice',
      icon: '📚',
      title: 'Bậc thầy Luyện tập',
      desc: 'Hoàn thành từ 10 lượt luyện tập các chế độ',
      unlocked: stats.attempts >= 10,
    },
    {
      id: 'streak7',
      icon: '🏆',
      title: 'Huyền thoại 7 ngày',
      desc: 'Chinh phục chuỗi ngày học bền bỉ cả tuần',
      unlocked: stats.streak >= 7,
    },
  ];

  return (
    <main className="account-wrapper" style={{ paddingBottom: 64 }}>
      {/* Breadcrumb Trail */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Link href="/" className="app-breadcrumb-link">← Trang chủ</Link>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
        <span className="category-pill">TÀI KHOẢN & BẢO MẬT</span>
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
            <span>•</span>
            <span style={{ fontSize: 12.5, color: '#f59e0b', fontWeight: 600 }}>🔥 Chuỗi {stats.streak} ngày</span>
          </div>
        </div>
      </div>

      {/* Badges / Achievements Section Cirrus */}
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: 'var(--card-shadow)',
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <span className="category-pill" style={{ marginBottom: 8, display: 'inline-block' }}>
            🎖️ HUY HIỆU THÀNH TÍCH
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 6px', color: 'var(--heading)' }}>
            Huy hiệu danh dự của bạn
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Ghi nhận những dấu mốc nỗ lực và sự kiên trì trong hành trình chinh phục tiếng Anh của bạn.
          </p>
        </div>

        <div className="badges-grid">
          {BADGES.map((b) => (
            <div key={b.id} className={`badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}
              onClick={() => { if (b.unlocked) { triggerConfetti(); toast.success(`Huy hiệu: ${b.title}!`); } }}>
              <div className="badge-card-icon">{b.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)' }}>
                  {b.title}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  {b.desc}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, color: b.unlocked ? '#10b981' : 'var(--muted)' }}>
                  {b.unlocked ? '✓ Đã mở khóa' : '🔒 Chưa đạt'}
                </div>
              </div>
            </div>
          ))}
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
              required
              autoComplete="current-password"
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
              placeholder="Tối thiểu 4 ký tự"
              required
              autoComplete="new-password"
            />
          </div>
        </label>

        <label className="account-field-label">
          <span>Nhập lại mật khẩu mới</span>
          <div className="account-input-wrap">
            <span className="account-input-icon">🔐</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Khớp với mật khẩu mới ở trên"
              required
              autoComplete="new-password"
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