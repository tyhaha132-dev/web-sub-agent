'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  MAX_FILE_BYTES,
  MAX_IMPORT_WORDS,
  knownCount,
  loadFolders,
  makeFolder,
  parseManual,
  rowsToEntries,
  saveFolders,
  type Folder,
} from '../../lib/folders';

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
          onClose={() => setShowImport(false)}
          onSaved={(f) => { persist([f, ...folders]); setShowImport(false); }}
        />
      )}
    </main>
  );
}

function ImportModal({ onClose, onSaved }: { onClose: () => void; onSaved: (f: Folder) => void }) {
  const [tab, setTab] = useState<'manual' | 'excel'>('manual');
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Array<{ en: string; vi: string }>>([]);
  const [checked, setChecked] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [folderName, setFolderName] = useState('');

  function checkManual() {
    const parts = text.split(/[\n,;]+/).filter((p) => p.trim() !== '');
    const list = parseManual(text);
    setEntries(list.map((en) => ({ en, vi: '' })));
    setSkipped(parts.length - list.length);
    setChecked(true);
    setError('');
  }

  async function onFile(file: File) {
    setError('');
    setChecked(false);
    if (file.size > MAX_FILE_BYTES) {
      setError('File quá lớn (tối đa 2MB).');
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        setError('File không có sheet nào.');
        return;
      }
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      const list = rowsToEntries(rows);
      if (list.length === 0) {
        setError('Không đọc được từ nào (cột đầu phải là từ tiếng Anh).');
        return;
      }
      setEntries(list);
      setSkipped(Math.max(rows.length - list.length, 0));
      setFileName(file.name);
      setChecked(true);
    } catch {
      setError('Không đọc được file (chỉ hỗ trợ .xlsx, .csv).');
    }
  }

  function save() {
    if (entries.length === 0) return;
    onSaved(makeFolder(folderName || fileName.replace(/\.[^.]+$/, '') || 'Thư mục mới', entries));
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ marginTop: 0, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>⬇️ Import từ vựng</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="topic-row">
          <button className={`topic-chip ${tab === 'manual' ? 'active' : ''}`} onClick={() => { setTab('manual'); setChecked(false); setError(''); }}>Nhập tay (Manual)</button>
          <button className={`topic-chip ${tab === 'excel' ? 'active' : ''}`} onClick={() => { setTab('excel'); setChecked(false); setError(''); }}>Tải file Excel</button>
        </div>
        {tab === 'manual' ? (
          <>
            <p>Nhập các từ tiếng Anh bạn muốn lưu. Tối đa {MAX_IMPORT_WORDS} từ.</p>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setChecked(false); }}
              placeholder="Nhập từ tiếng Anh, mỗi từ một dòng hoặc cách nhau bởi dấu phẩy..."
              rows={6}
              style={{ width: '100%', borderRadius: 12, padding: 12, fontSize: 15, background: 'var(--input-bg)', color: 'var(--ink)', border: '2px solid var(--border-soft)' }}
            />
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={checkManual}>🔍 Kiểm tra danh sách</button>
            </div>
          </>
        ) : (
          <>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
              style={{ display: 'block', border: '2px dashed var(--border-soft)', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 32 }}>⬆️</div>
              <div><b>Kéo thả hoặc click để chọn file</b></div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Hỗ trợ: .xlsx, .csv (Tối đa {MAX_IMPORT_WORDS} từ, 2MB)</div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
              />
            </label>
            {fileName && <p>📄 {fileName}</p>}
          </>
        )}
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {checked && (
          <div className="word-card">
            <div><b>{entries.length}</b> từ hợp lệ{skipped > 0 && <span> · bỏ qua {skipped} dòng rác/trùng</span>}</div>
            <div className="ipa">{entries.slice(0, 10).map((e) => e.en).join(', ')}{entries.length > 10 ? '…' : ''}</div>
            <div style={{ marginTop: 12 }}>
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Tên thư mục (để trống = tự đặt)"
                style={{ width: '100%', borderRadius: 10, padding: '8px 12px', marginBottom: 8, background: 'var(--input-bg)', color: 'var(--ink)', border: '2px solid var(--border-soft)' }}
              />
              <button className="btn btn-primary" onClick={save}>💾 Lưu vào thư mục</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
