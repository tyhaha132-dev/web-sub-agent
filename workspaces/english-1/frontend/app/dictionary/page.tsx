'use client';

import { useEffect, useState } from 'react';
import { fetchTopics, searchWords, speak, type Topic, type Word } from '../../lib/api';

export default function Dictionary() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [results, setResults] = useState<Word[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchTopics().then(setTopics).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const t = params.get('topic') ?? '';
    if (t) {
      setTopic(t);
      searchWords('', t).then((w) => { setResults(w); setSearched(true); });
    }
  }, []);

  async function run(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    const w = await searchWords(q, topic);
    setResults(w);
    setSearched(true);
  }

  return (
    <main>
      <h1>🔤 Từ điển tiếng Anh</h1>
      <div className="panel">
        <form className="search-row" onSubmit={run}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nhập từ tiếng Anh hoặc nghĩa tiếng Việt..."
          />
          <button className="btn btn-primary" type="submit">Tra 🔍</button>
        </form>
        <div className="topic-row">
          <button className={`topic-chip ${topic === '' ? 'active' : ''}`} onClick={() => setTopic('')}>Tất cả</button>
          {topics.map((t) => (
            <button
              key={t.topic}
              className={`topic-chip ${topic === t.topic ? 'active' : ''}`}
              onClick={() => setTopic(t.topic)}
            >
              {t.topic} ({t.total})
            </button>
          ))}
        </div>
      </div>
      {searched && results.length === 0 && <div className="panel">😢 Không tìm thấy từ nào. Thử từ khác nhé!</div>}
      {results.map((w) => (
        <div key={w.id} className="word-card">
          <h3>
            {w.en}
            <button className="speak-btn" title="Nghe phát âm" onClick={() => speak(w.en)}>🔊</button>
            <span className="badge">{w.topic}</span>
          </h3>
          <div className="ipa">{w.ipa} — {w.vi}</div>
          {w.example && <div className="ex">“{w.example}”</div>}
        </div>
      ))}
    </main>
  );
}
