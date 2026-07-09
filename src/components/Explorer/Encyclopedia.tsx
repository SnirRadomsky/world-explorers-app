// "אנציקלופדיית המגלה": one place that gathers everything the child has
// discovered — countries, continents, space, constellations and sea life —
// as tappable, spoken cards. Locked items show a grey ❓ silhouette.

import { useMemo, useState } from "react";
import { CONTINENTS } from "../../data/continents";
import { CONTINENT_DETAILS } from "../../data/continentDetails";
import { COUNTRIES } from "../../data/countries";
import { getCountryDetails, flagEmoji } from "../../data/countryDetails";
import { PLANETS } from "../../data/planets";
import { SPACE_OBJECTS } from "../../data/spaceObjects";
import { CONSTELLATIONS } from "../../data/constellations";
import { MARINE_LIFE } from "../../data/marineLife";
import type { SfxName } from "../../hooks/useSfx";

interface Entry {
  id: string;
  emoji: string;
  name: string;
}

interface Section {
  key: string;
  title: string;
  emoji: string;
  color: string;
  entries: Entry[];
  discovered: Set<string>;
}

interface EncyclopediaProps {
  discovered: {
    continents: Set<string>;
    countries: Set<string>;
    planets: Set<string>;
    constellations: Set<string>;
    ocean: Set<string>;
  };
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function Encyclopedia({ discovered, speakHebrew, playSfx }: EncyclopediaProps) {
  const sections = useMemo<Section[]>(() => {
    return [
      {
        key: "continents",
        title: "יבשות",
        emoji: "🌍",
        color: "#2563eb",
        discovered: discovered.continents,
        entries: CONTINENTS.map((c) => ({
          id: c.id,
          emoji: CONTINENT_DETAILS[c.id]?.emoji ?? "🌍",
          name: c.nameHebrew,
        })),
      },
      {
        key: "countries",
        title: "מדינות",
        emoji: "🚩",
        color: "#10b981",
        discovered: discovered.countries,
        entries: COUNTRIES.map((c) => {
          const d = getCountryDetails(c.id);
          return { id: c.id, emoji: d ? flagEmoji(d.alpha2) : "🏳️", name: c.nameHebrew };
        }),
      },
      {
        key: "space",
        title: "החלל",
        emoji: "🪐",
        color: "#8b5cf6",
        discovered: discovered.planets,
        entries: [
          ...PLANETS.map((p) => ({ id: p.id, emoji: p.emoji, name: p.nameHebrew })),
          ...SPACE_OBJECTS.map((o) => ({ id: o.id, emoji: o.emoji, name: o.nameHebrew })),
        ],
      },
      {
        key: "constellations",
        title: "מזלות",
        emoji: "🔭",
        color: "#6366f1",
        discovered: discovered.constellations,
        entries: CONSTELLATIONS.map((c) => ({ id: c.id, emoji: c.emoji, name: c.nameHebrew })),
      },
      {
        key: "marine",
        title: "חיות ים",
        emoji: "🐠",
        color: "#0e7490",
        discovered: discovered.ocean,
        entries: MARINE_LIFE.map((c) => ({ id: c.id, emoji: c.emoji, name: c.nameHebrew })),
      },
    ];
  }, [discovered]);

  const [openKey, setOpenKey] = useState<string>("countries");
  const active = sections.find((s) => s.key === openKey) ?? sections[0];
  const totalFound = sections.reduce((n, s) => n + s.discovered.size, 0);
  const grandTotal = sections.reduce((n, s) => n + s.entries.length, 0);

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", paddingTop: 108 }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", padding: "0 16px 8px" }}>
        <h2 style={{ fontWeight: 900, fontSize: 24, color: "#1a365d", margin: 0 }}>
          📖 אנציקלופדיית המגלה
        </h2>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#64748b", marginTop: 2 }}>
          אספתם {totalFound} מתוך {grandTotal} דברים בעולם!
        </p>
      </div>

      {/* Section tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 12px",
          overflowX: "auto",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {sections.map((s) => (
          <button
            key={s.key}
            data-testid={`enc-tab-${s.key}`}
            onClick={() => {
              playSfx("pop");
              setOpenKey(s.key);
            }}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "7px 14px",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 13.5,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: openKey === s.key ? s.color : "rgba(255,255,255,0.85)",
              color: openKey === s.key ? "white" : "#475569",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            {s.emoji} {s.title} {s.discovered.size}/{s.entries.length}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
            gap: 10,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          {active.entries.map((e) => {
            const found = active.discovered.has(e.id);
            return (
              <button
                key={e.id}
                onClick={() => {
                  playSfx("pop");
                  if (found) speakHebrew(e.name);
                  else speakHebrew("את זה עוד לא גיליתם. צאו להרפתקה!");
                }}
                style={{
                  border: "none",
                  borderRadius: 16,
                  background: found ? "white" : "rgba(226,232,240,0.6)",
                  padding: "10px 6px",
                  cursor: "pointer",
                  fontFamily: "Heebo, sans-serif",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  boxShadow: found ? "0 3px 10px rgba(0,0,0,0.12)" : "none",
                  opacity: found ? 1 : 0.75,
                }}
              >
                <span style={{ fontSize: 34, lineHeight: 1, filter: found ? "none" : "grayscale(1)" }}>
                  {found ? e.emoji : "❓"}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 11.5,
                    color: found ? "#0f172a" : "#94a3b8",
                    textAlign: "center",
                    lineHeight: 1.15,
                  }}
                >
                  {found ? e.name : "?"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
