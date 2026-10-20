export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 120, height: 24, borderRadius: 9999 }} />
        <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 9999 }} />
      </div>
      <div className="skeleton skeleton-text" style={{ width: '80%', height: 20 }} />
      <div className="skeleton skeleton-text" style={{ width: '95%' }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 9999 }} />
        <div className="skeleton" style={{ width: 110, height: 34, borderRadius: 9999 }} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
