import Link from 'next/link';
import { GRAMMAR_MODULES } from '../../../lib/toeic';

const MODULE_ICONS: Record<string, string> = {
  tenses: '⏳',
  prepositions: '📍',
  'word-forms': '🔤',
  conjunctions: '🔗',
  passive: '🛡️',
  conditionals: '✨',
  agreement: '🤝',
  gerunds: '🎯',
};

export default function ToeicGrammarPage() {
  return (
    <main>
      {/* Header Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Link href="/toeic" className="app-breadcrumb-link">
            ← TOEIC
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>/</span>
          <span className="category-pill">CHUYÊN ĐỀ NGỮ PHÁP</span>
        </div>

        <h1
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '6px 0 10px',
            fontSize: 'clamp(24px, 3.5vw, 32px)',
            fontWeight: 900,
            color: 'var(--heading)',
          }}
        >
          <span>📐</span> 8 Chuyên đề Ngữ pháp Trọng điểm
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, lineHeight: 1.6, maxWidth: 840 }}>
          Tổng hợp 8 dạng câu hỏi ngữ pháp cốt lõi xuất hiện nhiều nhất trong đề thi TOEIC Part 5 &amp; 6. Nắm vững
          quy tắc vàng 30 giây rồi bấm luyện đề theo từng dạng để tối ưu điểm số!
        </p>
      </div>

      {/* Banner lưu ý */}
      <div
        className="panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '16px 20px',
          marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(56, 189, 248, 0.04))',
          border: '1px solid rgba(2, 132, 199, 0.2)',
          borderRadius: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--heading)' }}>
              Chiến lược làm bài Part 5 &amp; 6:
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>
              Mỗi câu ngữ pháp chỉ nên dành tối đa <b>15–20 giây</b>. Nhìn 4 đáp án trước để xác định dạng câu hỏi
              (thì, từ loại, giới từ hay liên từ) rồi áp dụng quy tắc.
            </div>
          </div>
        </div>

        <Link
          href="/toeic/reading?part=5"
          style={{
            padding: '8px 18px',
            borderRadius: 9999,
            background: 'var(--panel)',
            border: '1px solid var(--border-soft)',
            color: 'var(--heading)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Luyện Part 5 tổng hợp (30 câu) ›
        </Link>
      </div>

      {/* Danh sách 8 chuyên đề Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 40,
        }}
      >
        {GRAMMAR_MODULES.map((m) => {
          const icon = MODULE_ICONS[m.tag] ?? '📝';
          return (
            <div
              key={m.tag}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border-soft)',
                borderRadius: 20,
                padding: '24px',
                boxShadow: 'var(--card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{icon}</span>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--heading)' }}>
                      {m.title}
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 9999,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--muted)',
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    #{m.tag}
                  </span>
                </div>

                {/* Hộp quy tắc */}
                <div
                  style={{
                    background: 'var(--surface-2)',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: '1px solid var(--border-soft)',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: 'var(--ink)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#0284c7',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                    }}
                  >
                    <span>💡</span> Quy tắc vàng:
                  </div>
                  <div>{m.rule}</div>
                </div>
              </div>

              {/* Action Link */}
              <div style={{ paddingTop: 8 }}>
                <Link
                  href={`/toeic/reading?part=5&tag=${encodeURIComponent(m.tag)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '10px 18px',
                    borderRadius: 9999,
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13.5,
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Luyện đề dạng này (Part 5) 🚀
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
