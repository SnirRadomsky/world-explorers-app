// Sticker album screen — collected rewards grid.

import { STICKERS } from "../../lib/stickers";
import type { SfxName } from "../../hooks/useSfx";

interface StickerAlbumProps {
  unlocked: Set<string>;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function StickerAlbum({ unlocked, speakHebrew, playSfx }: StickerAlbumProps) {
  return (
    <div
      className="w-full h-full"
      style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", overflowY: "auto", padding: "72px 16px 32px" }}
    >
      <div
        className="text-center rounded-3xl px-6 py-4 mx-auto"
        style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", maxWidth: 420 }}
      >
        <div style={{ fontSize: 40 }}>📒</div>
        <h2 style={{ fontWeight: 900, fontSize: 26, color: "#1a365d", margin: 0 }}>אלבום המדבקות</h2>
        <p style={{ fontWeight: 800, fontSize: 16, color: "#3b82f6", marginTop: 4 }} data-testid="album-count">
          אספתם {unlocked.size} מתוך {STICKERS.length} מדבקות
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
          gap: 12,
          maxWidth: 560,
          margin: "18px auto 0",
        }}
      >
        {STICKERS.map((st) => {
          const isUnlocked = unlocked.has(st.id);
          return (
            <button
              key={st.id}
              data-testid={`sticker-${st.id}`}
              onClick={() => {
                if (isUnlocked) {
                  playSfx("sparkle");
                  speakHebrew(st.nameHebrew);
                } else {
                  playSfx("pop");
                  speakHebrew(st.howHebrew);
                }
              }}
              style={{
                border: "none",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "Heebo, sans-serif",
                padding: "14px 8px 12px",
                background: isUnlocked
                  ? "linear-gradient(160deg,#ffffff,#fef9c3)"
                  : "rgba(255,255,255,0.55)",
                boxShadow: isUnlocked ? "0 6px 18px rgba(245,158,11,0.35)" : "0 3px 10px rgba(0,0,0,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                minHeight: 118,
              }}
            >
              <span
                style={{
                  fontSize: 40,
                  filter: isUnlocked ? "none" : "grayscale(1) opacity(0.45)",
                }}
              >
                {isUnlocked ? st.emoji : "❓"}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: isUnlocked ? "#92400e" : "#64748b",
                  lineHeight: 1.25,
                }}
              >
                {isUnlocked ? st.nameHebrew : st.howHebrew}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
