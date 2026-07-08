// 2D map screen: the classic flat map with mode chips, discovery cards and a
// button to jump back to the 3D globe. Shares progress with the globe.

import { useState } from "react";
import WorldMap from "./WorldMap";
import CountryCard from "../Cards/CountryCard";
import ContinentCard from "../Cards/ContinentCard";
import type { DiscoveryState } from "../../hooks/useDiscovery";
import type { SfxName } from "../../hooks/useSfx";

type WorldMode = "continents" | "countries";

interface Map2DViewProps {
  mode: WorldMode;
  onModeChange: (m: WorldMode) => void;
  continentsDiscovery: DiscoveryState;
  countriesDiscovery: DiscoveryState;
  speakHebrew: (text: string) => void;
  speakLang: (text: string, lang: string, fallbackHebrew?: string) => void;
  playSfx: (name: SfxName) => void;
  wordsHeard: (languageId: string) => Set<number>;
  markWordHeard: (languageId: string, wordIndex: number, wordsInPack: number) => void;
  onGoTo3D: () => void;
}

export default function Map2DView(props: Map2DViewProps) {
  const { mode, onModeChange, continentsDiscovery, countriesDiscovery } = props;
  const [countryCardId, setCountryCardId] = useState<string | null>(null);
  const [continentCardId, setContinentCardId] = useState<string | null>(null);

  const activeDiscovery = mode === "continents" ? continentsDiscovery : countriesDiscovery;

  return (
    <div className="relative w-full h-full">
      <WorldMap
        mode={mode}
        discoveredSet={activeDiscovery.discovered}
        onDiscover={activeDiscovery.discover}
        speakHebrew={props.speakHebrew}
        playSfx={props.playSfx}
        onMoreInfo={(kind, id) => {
          if (kind === "continents") setContinentCardId(id);
          else setCountryCardId(id);
        }}
      />

      {/* Mode chips */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
          zIndex: 20,
          background: "rgba(255,255,255,0.85)",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
          direction: "rtl",
        }}
      >
        {(
          [
            { id: "continents", label: "יבשות 🌍" },
            { id: "countries", label: "מדינות 🗺️" },
          ] as const
        ).map((chip) => (
          <button
            key={chip.id}
            data-testid={`map2d-chip-${chip.id}`}
            onClick={() => {
              props.playSfx("pop");
              onModeChange(chip.id);
            }}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 18px",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              background: mode === chip.id ? "linear-gradient(135deg,#10b981,#059669)" : "transparent",
              color: mode === chip.id ? "white" : "#475569",
              transition: "background 0.2s ease",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 3D globe switch */}
      <button
        onClick={() => {
          props.playSfx("pop");
          props.onGoTo3D();
        }}
        aria-label="גלובוס תלת ממדי"
        data-testid="map2d-to-globe"
        style={{
          position: "absolute",
          bottom: 20,
          right: 16,
          zIndex: 20,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg,#2563eb,#7c3aed)",
          boxShadow: "0 6px 20px rgba(79,70,229,0.55)",
          fontSize: 28,
          cursor: "pointer",
        }}
      >
        🌍
      </button>

      <CountryCard
        countryId={countryCardId}
        onClose={() => setCountryCardId(null)}
        speakHebrew={props.speakHebrew}
        speakLang={props.speakLang}
        playSfx={props.playSfx}
        wordsHeard={props.wordsHeard}
        markWordHeard={props.markWordHeard}
      />
      <ContinentCard
        continentId={continentCardId}
        onClose={() => setContinentCardId(null)}
        speakHebrew={props.speakHebrew}
        playSfx={props.playSfx}
        countriesDiscovered={countriesDiscovery.discovered}
      />
    </div>
  );
}
