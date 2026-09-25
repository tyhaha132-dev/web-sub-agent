'use client';

import { useEffect, useState } from 'react';
import { fetchTopics, getCachedTopics, lookupWord, searchWords, speak, wakeBackend, SINGLE_WORD_RE, extSearchLinks, type ExternalEntry, type Topic, type Word } from '../../lib/api';
import ExtLinks from '../ext-links';

export default function Dictionary() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [results, setResults] = useState<Word[]>([]);
  const [searched, setSearched] = useState(false);
  const [external, setExternal] = useState<ExternalEntry | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    wakeBackend();
    const cached = getCachedTopics();
    if (cached.length > 0) setTopics(cached);
    fetchTopics().then((t) => { if (t && t.length > 0) setTopics(t); }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const t = params.get('topic') ?? '';
    if (t) {
      setTopic(t);
      searchWords('', t).then((w) => { setResults(w); setSearched(true); });
    }
  }, []);

  async function run(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    const keyword = q.trim();
    setExternal(null);
    const w = await searchWords(q, topic);
    setResults(w);
    setSearched(true);
    if (w.length === 0 && SINGLE_WORD_RE.test(keyword)) {
      setLookupLoading(true);
      try {
        const found = await lookupWord(keyword);
        if (found?.source === 'db' && found.words.length > 0) {
          setResults(found.words);
          setExternal(null);
        } else if (found?.source === 'external' && found.external) {
          setExternal(found.external);
        }
      } finally {
        setLookupLoading(false);
      }
    }
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
      {lookupLoading && <div className="panel">🌐 Đang tra nguồn mở rộng…</div>}
      {searched && !lookupLoading && results.length === 0 && !external && (
        <div className="panel">
          <div>😢 Không tìm thấy từ nào. Thử từ khác nhé!</div>
          {q.trim() !== '' && <ExtLinks en={q.trim()} />}
        </div>
      )}
      {external && (
        <div className="word-card">
          <h3>
            {external.word}
            {external.audio ? (
              <audio controls src={external.audio} style={{ verticalAlign: 'middle', marginLeft: 8, maxHeight: 32 }} />
            ) : (
              <button className="speak-btn" title="Nghe phát âm" onClick={() => speak(external.word)}>🔊</button>
            )}
            <span className="badge">Nguồn mở rộng · {external.provider === 'oxford' ? 'Oxford' : 'Wiktionary'}</span>
          </h3>
          {external.phonetic && <div className="ipa">{external.phonetic} — nghĩa Anh (chưa có nghĩa Việt)</div>}
          {external.meanings.map((m, i) => (
            <div key={i} className="ex" style={{ marginTop: 8 }}>
              <b>{m.pos}</b>: {m.definition}
              {m.example && <div>“{m.example}”</div>}
            </div>
          ))}
          {external.sourceUrl && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <a href={external.sourceUrl} target="_blank" rel="noreferrer">
                Nguồn: {external.provider === 'oxford' ? 'Oxford Learner’s' : 'Wiktionary'}
              </a>
            </div>
          )}
        </div>
      )}
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
