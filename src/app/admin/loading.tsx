export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>

      <div className="adminbar">
        <div style={{ flex: 1 }}>
          <span className="skeleton skel-bar" style={{ width: 220, height: 30 }} />
          <span className="skeleton skel-line" style={{ width: 280, marginTop: 10 }} />
        </div>
        <span className="skeleton skel-bar" style={{ width: 140 }} />
      </div>

      <div className="kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi">
            <span className="skeleton skel-line" style={{ width: 90 }} />
            <span className="skeleton" style={{ width: 110, height: 30, margin: "12px 0 8px" }} />
            <span className="skeleton skel-line" style={{ width: 130 }} />
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-h">
          <span className="skeleton skel-line" style={{ width: 150, height: 16 }} />
          <span className="skeleton skel-line" style={{ width: 60 }} />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="skeleton skel-line" style={{ width: `${92 - i * 7}%`, margin: "16px 0" }} />
        ))}
      </div>
    </div>
  );
}
