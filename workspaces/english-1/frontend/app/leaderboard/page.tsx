'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch, fetchMe } from '../../lib/auth';

interface Row {
  username: string;
  attempts: number;
  minutes: number;
  accuracy: number;
  score: number;
}

export default function Leaderboard() {
  const [board, setBoard] = useState<Row[]>([]);
  const [me, setMe] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(setMe).catch(() => {});
    authFetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d: { board?: Row[] }) => setBoard(d.board ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top1 = board[0];
  const top2 = board[1];
  const top3 = board[2];
  const restBoard = board.slice(3);

  const myIndex = board.findIndex((r) => r.username === me);
  const myRow = myIndex >= 0 ? board[myIndex] : null;

  return (
    <main className="page" style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 64 }}>
      {/* Breadcrumb Cirrus */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          ← Trang chủ
        </Link>
        <span style={{ color: 'var(--muted)', margin: '0 8px', fontSize: 13 }}>/</span>
        <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>BẢNG VINH DANH HỌC TẬP</span>
      </div>

      {/* Header Cirrus */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <span className="category-pill" style={{ marginBottom: 10, display: 'inline-block' }}>
          🏆 BẢNG VÀNG THÀNH TÍCH
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '6px 0 10px', letterSpacing: '-0.02em' }}>
          Bảng xếp hạng học viên
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 auto', maxWidth: 640 }}>
          Điểm xếp hạng = <b>Số phút học thực tế × Tỷ lệ chính xác (%)</b>. Vừa học bền bỉ mỗi ngày vừa giữ độ chính xác cao để chinh phục ngôi vị quán quân!
        </p>
      </div>

      {/* Banner Vị trí của bạn */}
      {myRow && (
        <div className="my-rank-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎯</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                Bạn đang đứng ở <b>Hạng #{myIndex + 1}</b> trên bảng vàng!
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                Đã học {myRow.minutes} phút · Độ chính xác {myRow.accuracy}% · {myRow.attempts} lượt luyện tập
              </div>
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            {myRow.score} <span style={{ fontSize: 13, fontWeight: 500 }}>điểm</span>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Đang cập nhật bảng xếp hạng học tập...</div>
        </div>
      )}

      {!loading && board.length === 0 && (
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-soft)',
            borderRadius: 20,
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>🌱</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Chưa có dữ liệu xếp hạng</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
            Hãy là người đầu tiên làm Quiz hoặc ôn thẻ Flashcard để ghi danh trên bảng vàng!
          </p>
          <Link
            href="/quiz"
            style={{
              padding: '10px 22px',
              borderRadius: 9999,
              background: '#0f172a',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Làm bài thi ngay →
          </Link>
        </div>
      )}

      {/* Podium Top 3 Cirrus */}
      {board.length > 0 && (
        <div className="podium-container">
          {/* Top 2 (Bạc) */}
          {top2 && (
            <div className="podium-col rank-2">
              <div className="podium-avatar-wrap">
                <div className="podium-avatar">
                  {top2.username.charAt(0).toUpperCase()}
                </div>
                <span className="podium-medal">🥈</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', marginBottom: 2 }}>
                {top2.username}{top2.username === me ? ' (bạn)' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                {top2.minutes}p · {top2.accuracy}%
              </div>
              <div className="podium-block">
                <span style={{ fontSize: 24, fontWeight: 800 }}>#2</span>
                <span style={{ fontSize: 14, opacity: 0.9 }}>{top2.score} đ</span>
              </div>
            </div>
          )}

          {/* Top 1 (Vàng) */}
          {top1 && (
            <div className="podium-col rank-1">
              <div className="podium-avatar-wrap">
                <div className="podium-avatar">
                  {top1.username.charAt(0).toUpperCase()}
                </div>
                <span className="podium-medal">🥇</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--heading)', marginBottom: 2 }}>
                {top1.username}{top1.username === me ? ' (bạn)' : ''}
              </div>
              <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>
                {top1.minutes}p · {top1.accuracy}% đúng
              </div>
              <div className="podium-block">
                <span style={{ fontSize: 28, fontWeight: 800 }}>#1</span>
                <span style={{ fontSize: 16, opacity: 0.95 }}>{top1.score} đ</span>
              </div>
            </div>
          )}

          {/* Top 3 (Đồng) */}
          {top3 && (
            <div className="podium-col rank-3">
              <div className="podium-avatar-wrap">
                <div className="podium-avatar">
                  {top3.username.charAt(0).toUpperCase()}
                </div>
                <span className="podium-medal">🥉</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', marginBottom: 2 }}>
                {top3.username}{top3.username === me ? ' (bạn)' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                {top3.minutes}p · {top3.accuracy}%
              </div>
              <div className="podium-block">
                <span style={{ fontSize: 22, fontWeight: 800 }}>#3</span>
                <span style={{ fontSize: 13, opacity: 0.9 }}>{top3.score} đ</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bảng chi tiết các vị trí tiếp theo */}
      {restBoard.length > 0 && (
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border-soft)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: 'var(--card-shadow)',
            marginTop: 24,
          }}
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)' }}>
              Danh sách thứ hạng tiếp theo
            </span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Top {board.length} học viên
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-soft)', color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Hạng</th>
                  <th style={{ padding: '12px 18px' }}>Người học</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Thời gian</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Độ chính xác</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Lượt luyện</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Điểm số</th>
                </tr>
              </thead>
              <tbody>
                {restBoard.map((r, idx) => {
                  const rank = idx + 4;
                  const isMe = r.username === me;
                  return (
                    <tr
                      key={r.username}
                      style={{
                        borderBottom: '1px solid var(--border-soft)',
                        background: isMe ? 'rgba(56, 189, 248, 0.08)' : undefined,
                        fontWeight: isMe ? 700 : 400,
                      }}
                    >
                      <td style={{ padding: '14px 18px', color: 'var(--muted)', fontWeight: 700 }}>
                        #{rank}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: isMe ? '#0284c7' : 'var(--surface-3)',
                              color: isMe ? '#fff' : 'var(--ink)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {r.username.charAt(0).toUpperCase()}
                          </div>
                          <span>
                            {r.username}
                            {isMe && <span style={{ color: '#0284c7', marginLeft: 6 }}>(bạn)</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--muted)' }}>
                        {r.minutes} phút
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <span style={{ color: r.accuracy >= 80 ? '#10b981' : '#0284c7', fontWeight: 600 }}>
                          {r.accuracy}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--muted)' }}>
                        {r.attempts}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 800, color: 'var(--heading)' }}>
                        {r.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
