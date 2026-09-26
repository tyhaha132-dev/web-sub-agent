'use client';

import { useEffect, useState } from 'react';
import { API_BASE, wakeBackend } from '../lib/api';

const cards = [
  { href: '/dictionary', icon: '🔤', cls: 'sk-blue', title: 'Từ điển', desc: 'Tra nghĩa, phiên âm, ví dụ theo chủ đề', count: '50+ TỪ' },
  { href: '/flashcards', icon: '🃏', cls: 'sk-pink', title: 'Luyện tập', desc: '5 chế độ theo bộ từ: lật thẻ, điền từ, nghe–chép, ghép cặp, Card Blast', count: 'HỌC NHANH' },
  { href: '/quiz', icon: '🏆', cls: 'sk-orange', title: 'Quiz', desc: '10 câu trắc nghiệm, lưu điểm tự động', count: 'THỬ SỨC' },
  { href: '/toeic', icon: '💼', cls: 'sk-purple', title: 'TOEIC', desc: 'Luyện Reading Part 5/6/7 đủ số câu như thi thật', count: 'MỚI' },
  { href: '/progress', icon: '📈', cls: 'sk-green', title: 'Tiến độ', desc: 'Lịch sử điểm và tỉ lệ đúng của bạn', count: 'THEO DÕI' },
  { href: '/dictionary?topic=environment', icon: '🌍', cls: 'sk-teal', title: 'Môi trường', desc: 'Từ vựng IELTS chủ đề environment', count: 'IELTS' },
  { href: '/dictionary?topic=technology', icon: '💻', cls: 'sk-purple', title: 'Công nghệ', desc: 'Từ vựng IELTS chủ đề technology', count: 'IELTS' },
];

export default function Home() {
  const [total, setTotal] = useState('50+');
  useEffect(() => {
    wakeBackend();
    fetch(`${API_BASE}/api/words`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { words?: unknown[] }) => { if (d.words) setTotal(String(d.words.length)); })
      .catch(() => {});
  }, []);
  return (
    <main>
      <section className="hero">
        <h1>🎯 Luyện tiếng Anh mỗi ngày</h1>
        <p>Từ điển • Flashcards • Quiz • Theo dõi tiến độ — tất cả trong một nơi!</p>
        <a className="btn btn-light" href="/quiz">Bắt đầu Quiz ngay 🚀</a>
        <div className="stats-row">
          <div className="stat">📚 {total} từ vựng</div>
          <div className="stat">🔥 Học là nhớ!</div>
        </div>
      </section>
      <section className="card-grid">
        {cards.map((c) => (
          <a key={c.href + c.title} href={c.href} className={`skill-card ${c.cls}`}>
            <div className="icon">{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="count">{c.count}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
