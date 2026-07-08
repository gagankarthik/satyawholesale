import { ImageResponse } from "next/og";

/* Branded 1200x630 share card, generated at build so every social/link
   preview (Slack, iMessage, X, LinkedIn, WhatsApp) renders a real card
   instead of a blank one. Uses the brand palette; no external assets/fonts. */

export const alt = "Satya Wholesale — cash & carry wholesale distributor for convenience stores";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #12172e 0%, #1b2138 60%, #241a12 100%)",
          color: "#ffffff",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "#f26a1b" }} />
          <div style={{ fontSize: 30, letterSpacing: 2, color: "#f8b48a", textTransform: "uppercase" }}>
            Wholesale · Cincinnati, OH
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
            Satya Wholesale
          </div>
          <div style={{ fontSize: 40, color: "#c9cede", lineHeight: 1.3, maxWidth: 900 }}>
            Cash &amp; carry distributor for convenience stores. One account for tobacco, vape,
            grocery, candy and HBA.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#9ba3bd" }}>
          <span>Licensed distributor</span>
          <span style={{ color: "#4a5170" }}>•</span>
          <span>21+ retailers only</span>
          <span style={{ color: "#4a5170" }}>•</span>
          <span>satyawholesalers.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
