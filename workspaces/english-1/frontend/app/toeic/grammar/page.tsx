import { GRAMMAR_MODULES } from '../../../lib/toeic';

export default function ToeicGrammar() {
  return (
    <main>
      <h1>📐 Ngữ pháp Part 5/6</h1>
      <div className="panel">
        <p>8 chuyên đề ra nhiều nhất — đọc quy tắc 30 giây rồi bấm <b>Luyện</b> để làm đề lọc đúng dạng đó.</p>
      </div>
      {GRAMMAR_MODULES.map((m) => (
        <div key={m.tag} className="panel" style={{ marginTop: 8 }}>
          <p><b>{m.title}</b> <i>(#{m.tag})</i></p>
          <p>💡 {m.rule}</p>
          <p>
            <a className="btn btn-light" href={`/toeic/reading?part=5&tag=${encodeURIComponent(m.tag)}`}>
              Luyện {m.title} →
            </a>
          </p>
        </div>
      ))}
    </main>
  );
}
