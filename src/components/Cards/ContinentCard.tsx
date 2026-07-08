// Continent info card: animals, wow-fact, and countries-discovered progress.

import { CONTINENTS } from "../../data/continents";
import { COUNTRIES } from "../../data/countries";
import { CONTINENT_DETAILS } from "../../data/continentDetails";
import InfoSheet from "./InfoSheet";

interface ContinentCardProps {
  continentId: string | null;
  onClose: () => void;
  speakHebrew: (text: string) => void;
  playSfx: (name: "pop") => void;
  countriesDiscovered: Set<string>;
}

export default function ContinentCard({
  continentId,
  onClose,
  speakHebrew,
  playSfx,
  countriesDiscovered,
}: ContinentCardProps) {
  const continent = continentId ? CONTINENTS.find((c) => c.id === continentId) : undefined;
  const details = continentId ? CONTINENT_DETAILS[continentId] : undefined;

  const memberCountries = continentId
    ? COUNTRIES.filter((c) => c.continentId === continentId)
    : [];
  const discoveredHere = memberCountries.filter((c) => countriesDiscovered.has(c.id)).length;

  return (
    <InfoSheet open={!!continent && !!details} onClose={onClose} accentColor={continent?.color ?? "#3b82f6"}>
      {continent && details && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 54, lineHeight: 1 }}>{details.emoji}</span>
            <div
              style={{ fontWeight: 900, fontSize: 30, color: "#0f172a", cursor: "pointer" }}
              onClick={() => speakHebrew(continent.nameHebrew)}
            >
              {continent.nameHebrew} 🔊
            </div>
          </div>

          <div
            onClick={() => {
              playSfx("pop");
              speakHebrew(details.factHebrew);
            }}
            style={{
              marginTop: 16,
              background: "linear-gradient(135deg,#fef9c3,#fde68a)",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 17,
              color: "#713f12",
              cursor: "pointer",
              lineHeight: 1.45,
            }}
          >
            💡 {details.factHebrew} <span style={{ fontSize: 14 }}>🔊</span>
          </div>

          <div
            onClick={() => {
              playSfx("pop");
              speakHebrew(`החיות המפורסמות כאן הן ${details.animalsHebrew}`);
            }}
            style={{
              marginTop: 10,
              background: "#f0fdf4",
              borderRadius: 16,
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 15, color: "#166534" }}>חיות מפורסמות 🔊</div>
            <div style={{ fontSize: 34, margin: "4px 0 2px" }}>{details.animals}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#15803d" }}>{details.animalsHebrew}</div>
          </div>

          <div
            style={{
              marginTop: 10,
              background: "#f1f5f9",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 15,
              color: "#334155",
            }}
          >
            📏 {details.biggestHebrew}
          </div>

          {memberCountries.length > 0 && (
            <div
              style={{
                marginTop: 10,
                background: continent.color + "22",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 800,
                fontSize: 16,
                color: "#0f172a",
              }}
            >
              🗺️ גיליתם כאן {discoveredHere} מתוך {memberCountries.length} מדינות
              <div
                style={{
                  marginTop: 8,
                  height: 10,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.7)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((discoveredHere / memberCountries.length) * 100)}%`,
                    background: continent.color,
                    borderRadius: 999,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </InfoSheet>
  );
}
