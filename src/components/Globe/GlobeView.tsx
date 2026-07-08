// The 3D globe screen: GlobeScene engine + discovery flow + mode chips +
// zoom/night/2D/rocket controls + country & continent cards.

import { useCallback, useEffect, useRef, useState } from "react";
import { GlobeScene, type GlobeMode, type GlobePick } from "../../three/GlobeScene";
import { loadWorldTopo } from "../../three/loadWorldTopo";
import { CONTINENTS } from "../../data/continents";
import { COUNTRIES, COUNTRY_BY_ID, getCountryColor } from "../../data/countries";
import type { DiscoveryState } from "../../hooks/useDiscovery";
import type { SfxName } from "../../hooks/useSfx";
import NameRevealBubble from "../WorldMap/NameRevealBubble";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import MilestoneModal from "../Overlays/MilestoneModal";
import CountryCard from "../Cards/CountryCard";
import ContinentCard from "../Cards/ContinentCard";

const roundBtn: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
  fontSize: 22,
  fontWeight: 800,
  color: "#1a365d",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Heebo, sans-serif",
};

interface GlobeViewProps {
  mode: GlobeMode;
  onModeChange: (m: GlobeMode) => void;
  continentsDiscovery: DiscoveryState;
  countriesDiscovery: DiscoveryState;
  speakHebrew: (text: string) => void;
  speakLang: (text: string, lang: string, fallbackHebrew?: string) => void;
  playSfx: (name: SfxName) => void;
  wordsHeard: (languageId: string) => Set<number>;
  markWordHeard: (languageId: string, wordIndex: number, wordsInPack: number) => void;
  onGoTo2D: () => void;
  onGoSpace: () => void;
}

export default function GlobeView(props: GlobeViewProps) {
  const {
    mode,
    onModeChange,
    continentsDiscovery,
    countriesDiscovery,
    speakHebrew,
    playSfx,
    onGoTo2D,
    onGoSpace,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeScene | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [night, setNight] = useState(false);
  const [rocketHint, setRocketHint] = useState(false);
  const [activeBubble, setActiveBubble] = useState<{
    id: string;
    kind: GlobeMode;
    name: string;
    color: string;
  } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestone, setMilestone] = useState<string | null>(null);
  const [countryCardId, setCountryCardId] = useState<string | null>(null);
  const [continentCardId, setContinentCardId] = useState<string | null>(null);

  const activeDiscovery = mode === "continents" ? continentsDiscovery : countriesDiscovery;

  // Latest props for engine callbacks without re-creating the engine.
  const stateRef = useRef({ mode, continentsDiscovery, countriesDiscovery, playSfx, speakHebrew });
  useEffect(() => {
    stateRef.current = { mode, continentsDiscovery, countriesDiscovery, playSfx, speakHebrew };
  }, [mode, continentsDiscovery, countriesDiscovery, playSfx, speakHebrew]);

  const handlePick = useCallback((pick: GlobePick | null) => {
    const s = stateRef.current;
    if (!pick) return;
    s.playSfx("pop");

    let name = "";
    let color = "#3b82f6";
    let isNew = false;

    if (pick.kind === "continents") {
      const continent = CONTINENTS.find((c) => c.id === pick.id);
      if (!continent) return;
      name = continent.nameHebrew;
      color = continent.color;
      isNew = s.continentsDiscovery.discover(pick.id);
      if (isNew && s.continentsDiscovery.discovered.size + 1 === CONTINENTS.length) {
        setTimeout(() => setMilestone("גילית את כל היבשות! 🌍"), 1600);
      }
    } else {
      const country = COUNTRY_BY_ID.get(pick.id);
      if (!country) return;
      name = country.nameHebrew;
      color = getCountryColor(country.continentId);
      isNew = s.countriesDiscovery.discover(pick.id);
      if (isNew && s.countriesDiscovery.discovered.size + 1 === COUNTRIES.length) {
        setTimeout(() => setMilestone("גילית את כל המדינות! 🗺️"), 1600);
      }
    }

    s.speakHebrew(name);
    setActiveBubble({ id: pick.id, kind: pick.kind, name, color });
    engineRef.current?.setSelected(pick.id);

    if (isNew) {
      s.playSfx("chime");
      setConfettiOrigin({
        x: pick.screenX / window.innerWidth,
        y: pick.screenY / window.innerHeight,
      });
      setConfettiTrigger((p) => p + 1);
      engineRef.current?.flyToRegion(pick.id);
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setActiveBubble(null);
      engineRef.current?.setSelected(null);
    }, 3400);
  }, []);

  const handleMaxZoomOut = useCallback(() => {
    setRocketHint(true);
    setTimeout(() => setRocketHint(false), 3500);
  }, []);

  // ── Engine lifecycle (created once) ──
  useEffect(() => {
    let cancelled = false;
    let scene: GlobeScene | null = null;

    loadWorldTopo()
      .then((topo) => {
        if (cancelled || !containerRef.current) return;
        const s = stateRef.current;
        try {
          scene = new GlobeScene(containerRef.current, topo, {
            mode: s.mode,
            discovered:
              s.mode === "continents" ? s.continentsDiscovery.discovered : s.countriesDiscovery.discovered,
            night: false,
            reducedMotion:
              typeof window.matchMedia === "function" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            onPick: handlePick,
            onMaxZoomOut: handleMaxZoomOut,
          });
          engineRef.current = scene;
          // E2E hook: expose the engine so tests can fly to a known country.
          if (new URLSearchParams(window.location.search).has("e2e")) {
            (window as unknown as Record<string, unknown>).__globeScene = scene;
          }
        } catch {
          setWebglFailed(true);
        }
      })
      .catch(() => setWebglFailed(true));

    return () => {
      cancelled = true;
      engineRef.current = null;
      scene?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mode + discoveries + night into the engine.
  useEffect(() => {
    engineRef.current?.setMode(mode, activeDiscovery.discovered);
  }, [mode, activeDiscovery.discovered]);

  useEffect(() => {
    engineRef.current?.setDiscovered(activeDiscovery.discovered);
  }, [activeDiscovery.discovered]);

  useEffect(() => {
    engineRef.current?.setNight(night);
  }, [night]);

  const dismissBubble = useCallback(() => {
    setActiveBubble(null);
    engineRef.current?.setSelected(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  const openCard = useCallback(() => {
    if (!activeBubble) return;
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (activeBubble.kind === "continents") setContinentCardId(activeBubble.id);
    else setCountryCardId(activeBubble.id);
    setActiveBubble(null);
  }, [activeBubble]);

  if (webglFailed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
        style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", textAlign: "center" }}
      >
        <div style={{ fontSize: 60 }}>🌍</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1a365d" }}>
          הגלובוס התלת־ממדי לא נטען במכשיר הזה
        </div>
        <button
          onClick={onGoTo2D}
          style={{
            border: "none",
            borderRadius: 16,
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "white",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 800,
            fontSize: 18,
            padding: "12px 28px",
            cursor: "pointer",
          }}
        >
          🗺️ לפתוח את המפה השטוחה
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400 }}>
      {/* three.js canvas mounts here */}
      <div ref={containerRef} className="absolute inset-0" data-testid="globe-container" />

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
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
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
            onClick={() => {
              props.playSfx("pop");
              onModeChange(chip.id);
              dismissBubble();
            }}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 18px",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              background: mode === chip.id ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "transparent",
              color: mode === chip.id ? "white" : "#475569",
              transition: "background 0.2s ease",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Zoom controls (bottom-left) */}
      <div style={{ position: "absolute", bottom: 20, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomIn()} aria-label="התקרבות">+</button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomOut()} aria-label="התרחקות">−</button>
        <button style={{ ...roundBtn, fontSize: 17 }} onClick={() => engineRef.current?.resetView()} aria-label="איפוס תצוגה">🔄</button>
      </div>

      {/* Right-side controls */}
      <div style={{ position: "absolute", bottom: 20, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20, alignItems: "center" }}>
        <button
          style={{ ...roundBtn, fontSize: 19 }}
          onClick={() => {
            props.playSfx("pop");
            setNight((n) => !n);
          }}
          aria-label="יום ולילה"
          title="יום / לילה"
        >
          {night ? "🌞" : "🌙"}
        </button>
        <button
          style={{ ...roundBtn, fontSize: 19 }}
          onClick={() => {
            props.playSfx("pop");
            onGoTo2D();
          }}
          aria-label="מפה שטוחה"
          title="מפה שטוחה"
        >
          🗺️
        </button>
        <button
          onClick={() => {
            props.playSfx("whoosh");
            onGoSpace();
          }}
          aria-label="לטוס לחלל"
          data-testid="rocket-button"
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            boxShadow: "0 6px 20px rgba(99,102,241,0.6)",
            fontSize: 28,
            cursor: "pointer",
            animation: rocketHint ? "rocketBounce 0.7s ease infinite" : undefined,
          }}
        >
          🚀
        </button>
        {rocketHint && (
          <div
            style={{
              position: "absolute",
              bottom: 70,
              right: 66,
              background: "rgba(255,255,255,0.96)",
              borderRadius: 14,
              padding: "8px 14px",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              color: "#4f46e5",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              direction: "rtl",
            }}
          >
            רוצים לטוס לחלל? לחצו עליי! 🚀
          </div>
        )}
      </div>

      {/* Discovery bubble */}
      <NameRevealBubble
        name={activeBubble?.name ?? null}
        color={activeBubble?.color ?? "#3b82f6"}
        position={null}
        onDismiss={dismissBubble}
        onMore={activeBubble ? openCard : undefined}
      />

      <ConfettiEffect trigger={confettiTrigger} originX={confettiOrigin.x} originY={confettiOrigin.y} />
      <MilestoneModal isOpen={!!milestone} onClose={() => setMilestone(null)} message={milestone ?? ""} />

      {/* Cards */}
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
