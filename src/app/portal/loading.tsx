export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="pgrid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="pcard">
            <div className="ph">
              <span className="skeleton" style={{ width: 64, height: 64, borderRadius: 16 }} />
            </div>
            <div className="info" style={{ gap: 10 }}>
              <span className="skeleton skel-line" style={{ width: "85%" }} />
              <span className="skeleton skel-line" style={{ width: "55%" }} />
              <span className="skeleton skel-bar" style={{ width: "100%", marginTop: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
