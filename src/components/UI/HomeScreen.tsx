import { CONTINENTS } from "../../data/continents";
import { COUNTRIES } from "../../data/countries";
import { TOTAL_ISRAEL_CITIES } from "../../data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "../../data/planets";
import { TOTAL_MARINE_CREATURES } from "../../data/marineLife";
import { levelFor } from "../../lib/stickers";

export type HomeTarget = "globe" | "map2d" | "israel" | "space" | "ocean" | "quiz" | "album" | "encyclopedia";

interface HomeScreenProps {
  onSelect: (target: HomeTarget) => void;
  totalDiscovered: number;
  discoveredPerMode: {
    continents: number;
    countries: number;
    israel: number;
    planets: number;
    ocean: number;
  };
  stickersUnlocked: number;
  stickersTotal: number;
}

const tile: React.CSSProperties = {
  fontFamily: "Heebo, sans-serif",
  border: "none",
  borderRadius: 22,
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  textAlign: "right",
  padding: "14px 16px",
  minHeight: 86,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "transform 0.15s ease",
};

function Tile({
  emoji,
  label,
  sub,
  gradient,
  shadow,
  onClick,
  testId,
  big,
}: {
  emoji: string;
  label: string;
  sub?: string;
  gradient: string;
  shadow: string;
  onClick: () => void;
  testId: string;
  big?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{ ...tile, background: gradient, boxShadow: shadow, gridColumn: big ? "span 2" : undefined, minHeight: big ? 108 : 86 }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontWeight: 900,
            fontSize: big ? "clamp(22px, 5vw, 30px)" : "clamp(17px, 4vw, 22px)",
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.3)",
            lineHeight: 1.15,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: big ? 42 : 32, lineHeight: 1 }}>{emoji}</span>
      </div>
      {sub && (
        <span style={{ fontWeight: 700, fontSize: 12.5, color: "rgba(255,255,255,0.9)" }}>{sub}</span>
      )}
    </button>
  );
}

export default function HomeScreen({
  onSelect,
  totalDiscovered,
  discoveredPerMode,
  stickersUnlocked,
  stickersTotal,
}: HomeScreenProps) {
  const level = levelFor(totalDiscovered);
  const worldTotal = CONTINENTS.length + COUNTRIES.length;
  const worldDone = discoveredPerMode.continents + discoveredPerMode.countries;

  return (
    <div
      className="flex flex-col items-center h-full gap-4 p-5"
      style={{ direction: "rtl", overflowY: "auto", justifyContent: "safe center" }}
    >
      {/* Title card */}
      <div
        className="text-center rounded-3xl px-8 py-4"
        style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
      >
        <h1
          style={{
            fontFamily: "Heebo, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(30px, 7vw, 52px)",
            color: "#1a365d",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          🌍 מגלי העולם
        </h1>
        <p
          style={{
            fontFamily: "Heebo, sans-serif",
            fontWeight: 700,
            fontSize: "clamp(13px, 2vw, 18px)",
            color: "#2d4a7a",
            marginTop: 4,
          }}
        >
          בואו לגלות את העולם — ואת החלל!
        </p>
      </div>

      {/* Level + total badge */}
      <div
        className="rounded-full px-5 py-1.5 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
        data-testid="level-badge"
      >
        <span style={{ fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 15, color: "#1a365d" }}>
          {level.emoji} {level.nameHebrew}
        </span>
        <span style={{ width: 1, height: 18, background: "#cbd5e1" }} />
        <span style={{ fontFamily: "Heebo, sans-serif", fontWeight: 700, fontSize: 14, color: "#475569" }}>
          ⭐ {totalDiscovered} גילויים
        </span>
      </div>

      {/* Tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          width: "100%",
          maxWidth: 460,
        }}
      >
        <Tile
          big
          emoji="🌍"
          label="הגלובוס שלי"
          sub={`יבשות ומדינות בתלת־ממד! ${worldDone} מתוך ${worldTotal} גולו`}
          gradient="linear-gradient(135deg,#2563eb,#7c3aed)"
          shadow="0 10px 28px rgba(79,70,229,0.45)"
          onClick={() => onSelect("globe")}
          testId="home-globe"
        />
        <Tile
          emoji="🗺️"
          label="מפה שטוחה"
          sub="המפה הקלאסית"
          gradient="linear-gradient(135deg,#10b981,#059669)"
          shadow="0 8px 24px rgba(16,185,129,0.45)"
          onClick={() => onSelect("map2d")}
          testId="home-map2d"
        />
        <Tile
          emoji="🇮🇱"
          label="ערי ישראל"
          sub={`${discoveredPerMode.israel} מתוך ${TOTAL_ISRAEL_CITIES} גולו`}
          gradient="linear-gradient(135deg,#f97316,#ea580c)"
          shadow="0 8px 24px rgba(249,115,22,0.45)"
          onClick={() => onSelect("israel")}
          testId="home-israel"
        />
        <Tile
          emoji="🚀"
          label="מערכת השמש"
          sub={`${discoveredPerMode.planets} מתוך ${TOTAL_SPACE_OBJECTS} גולו`}
          gradient="linear-gradient(135deg,#6d28d9,#4c1d95)"
          shadow="0 8px 24px rgba(109,40,217,0.45)"
          onClick={() => onSelect("space")}
          testId="home-space"
        />
        <Tile
          emoji="🐠"
          label="עולם האוקיינוס"
          sub={`${discoveredPerMode.ocean} מתוך ${TOTAL_MARINE_CREATURES} חיות ים`}
          gradient="linear-gradient(135deg,#06b6d4,#0e7490)"
          shadow="0 8px 24px rgba(6,182,212,0.45)"
          onClick={() => onSelect("ocean")}
          testId="home-ocean"
        />
        <Tile
          emoji="❓"
          label="חידון"
          sub="איפה זה על המפה?"
          gradient="linear-gradient(135deg,#e11d48,#be123c)"
          shadow="0 8px 24px rgba(225,29,72,0.4)"
          onClick={() => onSelect("quiz")}
          testId="home-quiz"
        />
        <Tile
          emoji="📖"
          label="האנציקלופדיה"
          sub="כל מה שגיליתם"
          gradient="linear-gradient(135deg,#0d9488,#0f766e)"
          shadow="0 8px 24px rgba(13,148,136,0.45)"
          onClick={() => onSelect("encyclopedia")}
          testId="home-encyclopedia"
        />
        <Tile
          big
          emoji="📒"
          label="אלבום מדבקות"
          sub={`אספתם ${stickersUnlocked} מתוך ${stickersTotal} מדבקות`}
          gradient="linear-gradient(135deg,#f59e0b,#d97706)"
          shadow="0 8px 24px rgba(245,158,11,0.45)"
          onClick={() => onSelect("album")}
          testId="home-album"
        />
      </div>
    </div>
  );
}
