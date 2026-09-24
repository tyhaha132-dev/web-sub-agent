'use client';

import { useEffect, useState } from 'react';
import {
  knownCount,
  loadFolders,
  makeFolder,
  saveFolders,
  type Folder,
  type ImportEntry,
} from '../../lib/folders';
import ImportModal from './import-modal';

export default function Folders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  useEffect(() => {
    setFolders(loadFolders());
  }, []);

  function persist(next: Folder[]) {
    setFolders(next);
    saveFolders(next);
  }

  function createEmpty() {
    const f = makeFolder(`Thư mục ${folders.length + 1}`, []);
    persist([f, ...folders]);
  }

  function removeFolder(id: string) {
    const f = folders.find((x) => x.id === id);
    if (!f) return;
    if (!window.confirm(`Xóa thư mục “${f.name}” (${f.words.length} từ)?`)) return;
    persist(folders.filter((x) => x.id !== id));
  }

  function startRename(f: Folder) {
    setRenaming(f.id);
    setRenameVal(f.name);
  }

  function commitRename(id: string) {
    const name = renameVal.trim().slice(0, 80);
    if (name) persist(folders.map((x) => (x.id === id ? { ...x, name } : x)));
    setRenaming(null);
  }

  return (
    <main>
      <h1>📁 Thư mục của bạn</h1>
      <div className="panel">
        <p style={{ marginTop: 0 }}>
          {folders.length} thư mục · {folders.reduce((n, f) => n + f.words.length, 0)} từ đã lưu
          <span style={{ color: 'var(--muted)' }}> (lưu trên máy này, xóa cache là mất)</span>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowImport(true)}>⬇️ Import từ vựng</button>
          <button className="btn btn-ghost" onClick={createEmpty}>＋ Tạo thư mục mới</button>
        </div>
      </div>
      {folders.length === 0 && (
        <div className="panel">Chưa có thư mục nào. Bấm <b>Import từ vựng</b> để thêm từ tay hoặc từ file Excel nhé!</div>
      )}
      {folders.map((f) => {
        const known = knownCount(f);
        const rate = f.words.length === 0 ? 0 : Math.round((known / f.words.length) * 100);
        return (
          <div key={f.id} className="word-card">
            <h3>
              {renaming === f.id ? (
                <input
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(f.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(f.id); }}
                  autoFocus
                  style={{ fontSize: 16, padding: '4px 10px', borderRadius: 8 }}
                />
              ) : (
                <a href={`/folders/${f.id}`}>{f.name}</a>
              )}
              <span className="badge">{f.words.length} từ</span>
              <span className="badge">Đã nhớ {rate}%</span>
            </h3>
            <div className="ipa">
              {f.stats.attempts > 0
                ? `${f.stats.attempts} lượt quiz · đúng ${f.stats.correct}/${f.stats.total}`
                : 'Chưa luyện lần nào'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-ghost" href={`/folders/${f.id}`}>Mở</a>
              <button className="btn btn-ghost" onClick={() => startRename(f)}>✏️ Đổi tên</button>
              <button className="btn btn-ghost" onClick={() => removeFolder(f.id)}>🗑️ Xóa</button>
            </div>
          </div>
        );
      })}
      {showImport && (
        <ImportModal
          mode="new"
          onClose={() => setShowImport(false)}
          onSaveEntries={(entries, name) => { persist([makeFolder(name || 'Thư mục mới', entries), ...folders]); setShowImport(false); }}
        />
      )}
    </main>
  );
}
