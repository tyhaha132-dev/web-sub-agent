import ToeicPractice from '../practice';

const PARTS = [
  { part: 5 as const, count: 30, label: 'Part 5', desc: 'Hoàn thành câu — đủ 30 câu như thi thật' },
  { part: 6 as const, count: 16, label: 'Part 6', desc: 'Điền đoạn văn: email, memo — đủ 16 câu như thi thật' },
  { part: 7 as const, count: 54, label: 'Part 7', desc: 'Đọc hiểu — đủ 54 câu như thi thật' },
];

export default function ToeicReading({ searchParams }: { searchParams?: { part?: string; tag?: string } }) {
  const part = searchParams?.part === '6' ? 6 : searchParams?.part === '7' ? 7 : 5;
  const tag = searchParams?.tag ?? '';
  const meta = PARTS.find((p) => p.part === part) ?? PARTS[0];
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        {PARTS.map((p) => (
          <a
            key={p.part}
            className="btn"
            href={`/toeic/reading?part=${p.part}`}
            style={{ marginRight: 8, opacity: p.part === part ? 1 : 0.65 }}
          >
            {p.label}
          </a>
        ))}
      </div>
      <ToeicPractice
        key={`${part}-${tag}`}
        kind="practice"
        count={tag ? 10 : meta.count}
        part={part}
        tag={tag}
        title={`📖 Luyện Reading ${meta.label} (${tag ? 'drill' : `${meta.count} câu chuẩn thi thật`})`}
        intro={`${meta.desc} — chọn đáp án, xem giải thích ngay từng câu, điểm tự lưu.`}
      />
    </>
  );
}
