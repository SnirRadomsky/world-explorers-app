// Planet / space-object info card.

import { PLANET_BY_ID } from "../../data/planets";
import InfoSheet from "./InfoSheet";

interface PlanetCardProps {
  planetId: string | null;
  onClose: () => void;
  speakHebrew: (text: string) => void;
  playSfx: (name: "pop") => void;
}

export default function PlanetCard({ planetId, onClose, speakHebrew, playSfx }: PlanetCardProps) {
  const planet = planetId ? PLANET_BY_ID.get(planetId) : undefined;

  return (
    <InfoSheet open={!!planet} onClose={onClose} accentColor={planet?.baseColor ?? "#3b82f6"}>
      {planet && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${planet.baseColor}, ${planet.accentColor})`,
                boxShadow: `0 0 22px ${planet.baseColor}88`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
              }}
            >
              {planet.emoji}
            </span>
            <div>
              <div
                style={{ fontWeight: 900, fontSize: 30, color: "#0f172a", cursor: "pointer" }}
                onClick={() => speakHebrew(planet.nameHebrew)}
              >
                {planet.nameHebrew} 🔊
              </div>
              {planet.isDwarf && (
                <span
                  style={{
                    display: "inline-block",
                    background: "#ede9fe",
                    color: "#6d28d9",
                    borderRadius: 999,
                    padding: "2px 12px",
                    fontWeight: 800,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  כוכב לכת ננסי 🤏
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => {
              playSfx("pop");
              speakHebrew(planet.factHebrew);
            }}
            style={{
              marginTop: 16,
              background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 17,
              color: "#312e81",
              cursor: "pointer",
              lineHeight: 1.45,
            }}
          >
            💡 {planet.factHebrew} <span style={{ fontSize: 14 }}>🔊</span>
          </div>

          <div
            onClick={() => {
              playSfx("pop");
              speakHebrew(planet.extraHebrew);
            }}
            style={{
              marginTop: 10,
              background: "#f1f5f9",
              borderRadius: 16,
              padding: "12px 16px",
              fontWeight: 700,
              fontSize: 16,
              color: "#334155",
              cursor: "pointer",
              lineHeight: 1.45,
            }}
          >
            ✨ {planet.extraHebrew} <span style={{ fontSize: 13 }}>🔊</span>
          </div>
        </div>
      )}
    </InfoSheet>
  );
}
