'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  MAX_FILE_BYTES,
  MAX_FOLDER_WORDS,
  MAX_IMPORT_WORDS,
  parseManualPair,
  rowsToEntries,
  type ImportEntry,
} from '../../lib/folders';

interface Props {
  onClose: () => void;
  mode: 'new' | 'append';
  existingCount?: number;
  existingKeys?: Set<string>;
  onSaveEntries: (entries: ImportEntry[], name: string) => void;
}

export default function ImportModal({ onClose, mode, existingCount = 0, existingKeys, onSaveEntries }: Props) {
  const [tab, setTab] = useState<'manual' | 'excel'>('manual');
  const [enText, setEnText] = useState('');
  const [viText, setViText] = useState('');
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [checked, setChecked] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [dupExisting, setDupExisting] = useState(0);
  const [truncated, setTruncated] = useState(0);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [folderName, setFolderName] = useState('');

  const room = Math.max(MAX_FOLDER_WORDS - existingCount, 0);

  function applyAppendFilter(list: ImportEntry[], junk: number) {
    let kept = list;
    let dups = 0;
    if (existingKeys && existingKeys.size > 0) {
      kept = [];
      for (const e of list) {
        if (existingKeys.has(e.en.toLowerCase())) dups += 1;
        else kept.push(e);
      }
    }
    let cut = 0;
    if (kept.length > room) {
      cut = kept.length - room;
      kept = kept.slice(0, room);
    }
    setEntries(kept);
    setSkipped(junk);
    setDupExisting(dups);
    setTruncated(cut);
    setChecked(true);
    setError('');
  }

  function checkManual() {
    const { entries: list, skipped: junk } = parseManualPair(enText, viText);
    applyAppendFilter(list, junk);
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
      setFileName(file.name);
      applyAppendFilter(list, Math.max(rows.length - list.length, 0));
    } catch {
      setError('Không đọc được file (chỉ hỗ trợ .xlsx, .csv).');
    }
  }

  function save() {
    if (entries.length === 0) return;
    onSaveEntries(entries, folderName);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()} style={{ marginTop: 0, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{mode === 'append' ? '➕ Thêm từ vào thư mục' : '⬇️ Import từ vựng'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        {mode === 'append' && (
          <p>Thư mục đang có <b>{existingCount}</b> từ — còn thêm được tối đa <b>{room}</b> từ (giới hạn {MAX_FOLDER_WORDS} từ/thư mục).</p>
        )}
        <div className="topic-row">
          <button className={`topic-chip ${tab === 'manual' ? 'active' : ''}`} onClick={() => { setTab('manual'); setChecked(false); setError(''); }}>Nhập tay (Manual)</button>
          <button className={`topic-chip ${tab === 'excel' ? 'active' : ''}`} onClick={() => { setTab('excel'); setChecked(false); setError(''); }}>Tải file Excel</button>
        </div>
        {tab === 'manual' ? (
          <>
            <p>Nhập từ tiếng Anh bên trái, nghĩa Việt bên phải (từng dòng tương ứng).
              Ô Anh cũng chấp nhận kiểu “hello : xin chào”. Tối đa {MAX_IMPORT_WORDS} từ/lần.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Tiếng Anh</div>
                <textarea
                  value={enText}
                  onChange={(e) => { setEnText(e.target.value); setChecked(false); }}
                  placeholder={'hello\napple\nwell-known'}
                  rows={6}
                  style={{ width: '100%', borderRadius: 12, padding: 12, fontSize: 15, background: 'var(--input-bg)', color: 'var(--ink)', border: '2px solid var(--border-soft)' }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Nghĩa Việt</div>
                <textarea
                  value={viText}
                  onChange={(e) => { setViText(e.target.value); setChecked(false); }}
                  placeholder={'xin chào\nquả táo'}
                  rows={6}
                  style={{ width: '100%', borderRadius: 12, padding: 12, fontSize: 15, background: 'var(--input-bg)', color: 'var(--ink)', border: '2px solid var(--border-soft)' }}
                />
              </div>
            </div>
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
        {room <= 0 && mode === 'append' && (
          <p style={{ color: '#dc2626' }}>⚠️ Thư mục đã đủ {MAX_FOLDER_WORDS} từ, không thêm được nữa.</p>
        )}
        {checked && (
          <div className="word-card">
            <div><b>{entries.length}</b> từ sẽ thêm{skipped > 0 && <span> · bỏ qua {skipped} dòng rác/trùng</span>}</div>
            {dupExisting > 0 && <div>· {dupExisting} từ đã có sẵn trong thư mục</div>}
            {truncated > 0 && <div style={{ color: '#dc2626' }}>· ⚠️ Vượt giới hạn {MAX_FOLDER_WORDS} từ/thư mục — chỉ giữ lại {entries.length} từ đầu</div>}
            <div className="ipa">{entries.slice(0, 10).map((e) => (e.vi ? `${e.en} — ${e.vi}` : e.en)).join(' · ')}{entries.length > 10 ? '…' : ''}</div>
            <div style={{ marginTop: 12 }}>
              {mode === 'new' && (
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Tên thư mục (để trống = tự đặt)"
                  style={{ width: '100%', borderRadius: 10, padding: '8px 12px', marginBottom: 8, background: 'var(--input-bg)', color: 'var(--ink)', border: '2px solid var(--border-soft)' }}
                />
              )}
              <button className="btn btn-primary" onClick={save} disabled={entries.length === 0}>
                {mode === 'append' ? '➕ Thêm vào thư mục' : '💾 Lưu vào thư mục'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
