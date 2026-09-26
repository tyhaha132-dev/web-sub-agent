'use client';

import { useEffect, useState } from 'react';
import { fetchToeicAttempts, type ToeicAttempt, type ToeicError } from '../../../lib/toeic';

export default function ToeicErrors() {
  const [attempts, setAttempts] = useState<ToeicAttempt[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchToeicAttempts().then(setAttempts).catch(() => setError('😢 Không tải được (backend chưa chạy?).'));
  }, []);

  const wrongs: Array<ToeicError & { when: string }> = [];
  for (const a of attempts) {
    for (const e of a.errors ?? []) {
      wrongs.push({ ...e, when: a.created_at });
      if (wrongs.length >= 30) break;
    }
    if (wrongs.length >= 30) break;
  }

  const byTag = new Map<string, number>();
  for (const a of attempts) {
    for (const e of a.errors ?? []) {
      byTag.set(e.grammar_tag, (byTag.get(e.grammar_tag) ?? 0) + 1);
    }
  }
  const weakest = [...byTag.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);

  return (
    <main>
      <h1>🧾 Nhật ký lỗi</h1>
      {error && <p>{error}</p>}
      {weakest.length > 0 && (
        <div className="panel">
          <p><b>🎯 Điểm yếu nhất:</b></p>
          {weakest.map(([tag, n]) => (
            <p key={tag}>
              #{tag} — sai {n} lần.{' '}
              <a href={`/toeic/reading?part=5&tag=${encodeURIComponent(tag)}`}>Luyện ngay →</a>
            </p>
          ))}
        </div>
      )}
      {wrongs.length === 0 && <p>Chưa có lỗi nào — làm bài đi rồi quay lại nhé! 🚀</p>}
      {wrongs.map((w, i) => (
        <div key={`${w.id}-${i}`} className="panel" style={{ marginTop: 8 }}>
          <p><b>{w.prompt}</b></p>
          <p>❌ Bạn chưa đúng — đáp án đúng ở dưới.</p>
          <p>💡 {w.explanation} <i>(#{w.grammar_tag})</i></p>
        </div>
      ))}
    </main>
  );
}
