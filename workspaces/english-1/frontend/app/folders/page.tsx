'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  deleteFolder,
  exportFolderToExcel,
  fetchFolders,
  knownCount,
  makeFolder,
  putFolder,
  type Folder,
  type ImportEntry,
} from '../../lib/folders';
import ImportModal from './import-modal';

export default function Folders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  useEffect(() => {
    fetchFolders()
      .then(setFolders)
      .catch(() => setError('😢 Không tải được thư mục (backend chưa chạy?).'))
      .finally(() => setLoading(false));
  }, []);

  async function persist(next: Folder) {
    const prev = folders;
    setFolders((fs) => fs.map((x) => (x.id === next.id ? next : x)));
    try {
      await putFolder(next);
    } catch {
      setFolders(prev);
      setError('😢 Không lưu được (mất mạng?). Thử lại nhé!');
    }
  }

  async function createEmpty() {
    const f = makeFolder(`Thư mục ${folders.length + 1}`, []);
    setError('');
    try {
      await putFolder(f);
      setFolders([f, ...folders]);
    } catch {
      setError('😢 Không tạo được thư mục. Thử lại nhé!');
    }
  }

  async function removeFolder(id: string) {
    const f = folders.find((x) => x.id === id);
    if (!f) return;
    if (!window.confirm(`Xóa thư mục “${f.name}” (${f.words.length} từ)?`)) return;
    const prev = folders;
    setFolders(folders.filter((x) => x.id !== id));
    try {
      await deleteFolder(id);
    } catch {
      setFolders(prev);
      setError('😢 Không xóa được. Thử lại nhé!');
    }
  }

  function startRename(f: Folder) {
    setRenaming(f.id);
    setRenameVal(f.name);
  }

  function commitRename(id: string) {
    const name = renameVal.trim().slice(0, 80);
    setRenaming(null);
    if (!name) return;
    const f = folders.find((x) => x.id === id);
    if (f && f.name !== name) void persist({ ...f, name });
  }

  const totalWords = folders.reduce((n, f) => n + f.words.length, 0);
  const totalKnown = folders.reduce((n, f) => n + knownCount(f), 0);
  const overallRate = totalWords === 0 ? 0 : Math.round((totalKnown / totalWords) * 100);

  return (
    <main className="page" style={{ maxWidth: 1160, margin: '0 auto', paddingBottom: 64 }}>
      {/* Breadcrumb Cirrus */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          ← Trang chủ
        </Link>
        <span style={{ color: 'var(--muted)', margin: '0 8px', fontSize: 13 }}>/</span>
        <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>BỘ SƯU TẬP TỪ VỰNG</span>
      </div>

      {/* Header Cirrus */}
      <div style={{ marginBottom: 28 }}>
        <span className="category-pill" style={{ marginBottom: 10, display: 'inline-block' }}>
          📁 BỘ SƯU TẬP TỪ VỰNG CÁ NHÂN
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '6px 0 10px', letterSpacing: '-0.02em' }}>
          Thư mục của bạn
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, maxWidth: 680 }}>
          Tự do tạo các bộ từ vựng chuyên ngành, nhập từ vựng từ file Excel (.xlsx/.csv) hoặc lưu trữ riêng biệt. Dữ liệu được đồng bộ an toàn theo tài khoản của bạn.
        </p>
      </div>

      {/* Stats Summary Cirrus */}
      <div className="stats-row" style={{ marginBottom: 28 }}>
        <div className="stat">
          <div className="stat-value">{folders.length}</div>
          <div className="stat-label">📁 Thư mục</div>
        </div>
        <div className="stat">
          <div className="stat-value">{totalWords}</div>
          <div className="stat-label">📚 Tổng số từ</div>
        </div>
        <div className="stat">
          <div className="stat-value">{totalKnown}</div>
          <div className="stat-label">⭐ Đã thuộc</div>
        </div>
        <div className="stat">
          <div className="stat-value">{overallRate}%</div>
          <div className="stat-label">🎯 Tỷ lệ ghi nhớ</div>
        </div>
      </div>

      {/* Toolbar Cirrus */}
      <div className="toolbar-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          Đang hiển thị <b>{folders.length}</b> thư mục học tập
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => void createEmpty()}
            style={{
              padding: '9px 18px',
              borderRadius: 9999,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
            }}
          >
            <span>＋</span> Tạo thư mục mới
          </button>
          <button
            onClick={() => setShowImport(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 9999,
              background: 'var(--panel)',
              color: 'var(--ink)',
              border: '1px solid var(--border-soft)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⬇️</span> Nhập Excel / CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="account-alert-banner error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Đang tải thư mục học tập...</div>
        </div>
      )}

      {!loading && folders.length === 0 && (
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗂️</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Chưa có thư mục nào</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 440, margin: '0 auto 20px' }}>
            Hãy bấm <b>Tạo thư mục mới</b> hoặc <b>Nhập Excel / CSV</b> để bắt đầu xây dựng kho từ vựng cá nhân của riêng bạn!
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => void createEmpty()}
              style={{
                padding: '10px 20px',
                borderRadius: 9999,
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ＋ Tạo thư mục ngay
            </button>
            <button
              onClick={() => setShowImport(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 9999,
                background: 'var(--surface-2)',
                color: 'var(--ink)',
                border: '1px solid var(--border-soft)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⬇️ Nhập từ Excel
            </button>
          </div>
        </div>
      )}

      {/* Folder Cards Grid Cirrus */}
      <div className="folder-grid">
        {folders.map((f) => {
          const known = knownCount(f);
          const rate = f.words.length === 0 ? 0 : Math.round((known / f.words.length) * 100);
          return (
            <div key={f.id} className="folder-card">
              <div className="folder-header-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renaming === f.id ? (
                    <input
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onBlur={() => commitRename(f.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(f.id); }}
                      autoFocus
                      style={{
                        width: '100%',
                        fontSize: 17,
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #38bdf8',
                        background: 'var(--input-bg)',
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <Link href={`/folders/${f.id}`} className="folder-title-link">
                      📁 {f.name}
                    </Link>
                  )}
                  <div className="folder-stats-pill">
                    <span>{f.words.length} từ vựng</span>
                    <span>•</span>
                    <span>Đã nhớ {known} từ</span>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: rate >= 80 ? '#ecfdf5' : rate >= 50 ? '#eff6ff' : '#fef2f2',
                    color: rate >= 80 ? '#059669' : rate >= 50 ? '#0284c7' : '#dc2626',
                    border: `1px solid ${rate >= 80 ? '#a7f3d0' : rate >= 50 ? '#bae6fd' : '#fecaca'}`,
                  }}
                >
                  {rate}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="progress-track" style={{ height: 6, margin: '8px 0 12px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${rate}%`,
                    background: rate >= 80 ? '#10b981' : 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                  }}
                />
              </div>

              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 'auto' }}>
                {f.stats.attempts > 0
                  ? `📊 Đã luyện ${f.stats.attempts} lượt quiz · đúng ${f.stats.correct}/${f.stats.total} câu`
                  : '🌱 Chưa làm bài quiz nào'}
              </div>

              {/* Actions Cirrus */}
              <div className="folder-card-actions">
                <Link
                  href={`/folders/${f.id}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9999,
                    background: '#0284c7',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  📖 Mở học
                </Link>
                <button
                  onClick={() => exportFolderToExcel(f)}
                  title="Xuất từ vựng ra file Excel (.xlsx)"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                    border: '1px solid var(--border-soft)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  📥 Xuất Excel
                </button>
                <button
                  onClick={() => startRename(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid var(--border-soft)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Đổi tên
                </button>
                <button
                  onClick={() => void removeFolder(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: 'transparent',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showImport && (
        <ImportModal
          mode="new"
          onClose={() => setShowImport(false)}
          onSaveEntries={(entries, name) => {
            const f = makeFolder(name || 'Thư mục mới', entries);
            setShowImport(false);
            putFolder(f)
              .then(() => setFolders((fs) => [f, ...fs]))
              .catch(() => setError('😢 Không lưu được thư mục mới. Thử lại nhé!'));
          }}
        />
      )}
    </main>
  );
}
