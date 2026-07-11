// פלאי העולם gallery — a colorful grid of the 20 famous places. Each card
// shows visit status + how many of its 3 treasures were found; tapping a card
// flies straight into the 3D visit.

import { LANDMARKS, TOTAL_LANDMARKS } from "../../data/landmarks";
import type { SfxName } from "../../hooks/useSfx";

interface LandmarksGalleryProps {
  visited: Set<string>;
  treasuresDiscovered: Set<string>;
  onVisit: (landmarkId: string) => void;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

const CARD_GRADIENTS = [
  "linear-gradient(150deg,#fbbf24,#d97706)",
  "linear-gradient(150deg,#38bdf8,#0369a1)",
  "linear-gradient(150deg,#34d399,#059669)",
  "linear-gradient(150deg,#a78bfa,#6d28d9)",
  "linear-gradient(150deg,#fb7185,#be123c)",
  "linear-gradient(150deg,#f472b6,#9d174d)",
  "linear-gradient(150deg,#4ade80,#15803d)",
  "linear-gradient(150deg,#60a5fa,#1e40af)",
];

export default function LandmarksGallery({
  visited,
  treasuresDiscovered,
  onVisit,
  speakHebrew,
  playSfx,
}: LandmarksGalleryProps) {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", paddingTop: 64 }}
    >
      <div style={{ textAlign: "center", padding: "0 16px 6px" }}>
        <h2 style={{ fontWeight: 900, fontSize: 24, color: "#1a365d", margin: 0 }}>
          🏛️ פלאי העולם
        </h2>
        <p style={{ fontWeight: 700, fontSize: 13.5, color: "#475569", margin: "4px 0 0" }}>
          ביקרתם ב-{visited.size} מתוך {TOTAL_LANDMARKS} מקומות מפורסמים · לחצו ובואו נטוס!
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          {LANDMARKS.map((l, i) => {
            const wasVisited = visited.has(l.id);
            const found = l.treasures.filter((t) => treasuresDiscovered.has(t.id)).length;
            return (
              <button
                key={l.id}
                data-testid={`landmark-card-${l.id}`}
                onClick={() => {
                  playSfx("whoosh");
                  speakHebrew(`טסים אל ${l.nameHebrew}!`);
                  onVisit(l.id);
                }}
                style={{
                  border: "none",
                  borderRadius: 20,
                  background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                  padding: "14px 12px 12px",
                  cursor: "pointer",
                  fontFamily: "Heebo, sans-serif",
                  textAlign: "right",
                  position: "relative",
                  boxShadow: "0 8px 22px rgba(15,23,42,0.25)",
                  minHeight: 118,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {wasVisited && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      background: "rgba(255,255,255,0.92)",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontWeight: 900,
                      fontSize: 11,
                      color: "#047857",
                    }}
                  >
                    ✅ ביקרנו
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: "clamp(14px, 3.6vw, 17px)",
                      color: "white",
                      textShadow: "0 2px 6px rgba(0,0,0,0.35)",
                      lineHeight: 1.2,
                    }}
                  >
                    {l.nameHebrew}
                  </span>
                  <span style={{ fontSize: 34, lineHeight: 1, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))" }}>
                    {l.emoji}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.95)" }}>
                    {l.flagEmoji} {l.countryHebrew}
                  </span>
                  <span
                    style={{
                      background: "rgba(0,0,0,0.28)",
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontWeight: 900,
                      fontSize: 11.5,
                      color: found === 3 ? "#fde68a" : "white",
                    }}
                  >
                    💎 {found}/3
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
