// Solar-system screen: SolarSystemScene engine + discovery flow + planet cards.

import { useCallback, useEffect, useRef, useState } from "react";
import { SolarSystemScene, type SpacePick } from "../../three/SolarSystemScene";
import { loadWorldTopo } from "../../three/loadWorldTopo";
import { makeEarthTexture } from "../../three/earthPainter";
import { PLANET_BY_ID, TOTAL_SPACE_OBJECTS } from "../../data/planets";
import type { DiscoveryState } from "../../hooks/useDiscovery";
import type { SfxName } from "../../hooks/useSfx";
import NameRevealBubble from "../WorldMap/NameRevealBubble";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import MilestoneModal from "../Overlays/MilestoneModal";
import PlanetCard from "../Cards/PlanetCard";

const roundBtn: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  fontSize: 22,
  fontWeight: 800,
  color: "#1a365d",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Heebo, sans-serif",
};

interface SolarSystemViewProps {
  planetsDiscovery: DiscoveryState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
  onBackToEarth: () => void;
}

export default function SolarSystemView({
  planetsDiscovery,
  speakHebrew,
  playSfx,
  onBackToEarth,
}: SolarSystemViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SolarSystemScene | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [activeBubble, setActiveBubble] = useState<{ id: string; name: string; color: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestone, setMilestone] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);

  const stateRef = useRef({ planetsDiscovery, playSfx, speakHebrew });
  useEffect(() => {
    stateRef.current = { planetsDiscovery, playSfx, speakHebrew };
  }, [planetsDiscovery, playSfx, speakHebrew]);

  const handlePick = useCallback((pick: SpacePick | null) => {
    const s = stateRef.current;
    if (!pick) {
      engineRef.current?.focusBody(null);
      return;
    }
    const planet = PLANET_BY_ID.get(pick.id);
    if (!planet) return;

    s.playSfx("pop");
    const isNew = s.planetsDiscovery.discover(pick.id);
    s.speakHebrew(planet.nameHebrew);
    engineRef.current?.focusBody(pick.id);
    setActiveBubble({ id: pick.id, name: planet.nameHebrew, color: planet.baseColor });

    if (isNew) {
      s.playSfx("chime");
      setConfettiOrigin({ x: pick.screenX / window.innerWidth, y: pick.screenY / window.innerHeight });
      setConfettiTrigger((p) => p + 1);
      if (s.planetsDiscovery.discovered.size + 1 === TOTAL_SPACE_OBJECTS) {
        setTimeout(() => setMilestone("גילית את כל מערכת השמש! 👨‍🚀✨"), 1600);
      }
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3400);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let scene: SolarSystemScene | null = null;

    // Real Earth continents from the bundled TopoJSON; if geo data fails,
    // the procedural FBM fallback inside makePlanetTexture kicks in.
    loadWorldTopo()
      .then((topo) => makeEarthTexture(topo))
      .catch(() => undefined)
      .then((earthTexture) => {
        if (cancelled || !containerRef.current) return;
        try {
          scene = new SolarSystemScene(containerRef.current, {
            discovered: stateRef.current.planetsDiscovery.discovered,
            reducedMotion:
              typeof window.matchMedia === "function" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            onPick: handlePick,
            earthTexture,
          });
          engineRef.current = scene;
        } catch {
          setWebglFailed(true);
        }
      });

    return () => {
      cancelled = true;
      engineRef.current = null;
      scene?.dispose();
    };
  }, [handlePick]);

  useEffect(() => {
    engineRef.current?.setDiscovered(planetsDiscovery.discovered);
  }, [planetsDiscovery.discovered]);

  const dismissBubble = useCallback(() => {
    setActiveBubble(null);
    engineRef.current?.focusBody(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  if (webglFailed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
        style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", textAlign: "center", background: "#0a1029" }}
      >
        <div style={{ fontSize: 60 }}>🚀</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "white" }}>
          החללית לא הצליחה להמריא במכשיר הזה 😢
        </div>
        <button
          onClick={onBackToEarth}
          style={{
            border: "none",
            borderRadius: 16,
            background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            color: "white",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 800,
            fontSize: 18,
            padding: "12px 28px",
            cursor: "pointer",
          }}
        >
          🌍 חזרה לכדור הארץ
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400, background: "#020309" }}>
      <div ref={containerRef} className="absolute inset-0" data-testid="space-container" />

      {/* Progress badge */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(255,255,255,0.14)",
          border: "1.5px solid rgba(255,255,255,0.35)",
          backdropFilter: "blur(6px)",
          borderRadius: 999,
          padding: "6px 18px",
          fontFamily: "Heebo, sans-serif",
          fontWeight: 800,
          fontSize: 15,
          color: "white",
          direction: "rtl",
          whiteSpace: "nowrap",
        }}
      >
        🪐 גיליתם {planetsDiscovery.discovered.size} מתוך {TOTAL_SPACE_OBJECTS} בחלל
      </div>

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: 20, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomIn()} aria-label="התקרבות">+</button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomOut()} aria-label="התרחקות">−</button>
        <button style={{ ...roundBtn, fontSize: 17 }} onClick={() => engineRef.current?.resetView()} aria-label="איפוס תצוגה">🔄</button>
      </div>

      {/* Back to Earth */}
      <button
        onClick={() => {
          playSfx("whoosh");
          onBackToEarth();
        }}
        data-testid="back-to-earth"
        style={{
          position: "absolute",
          bottom: 24,
          right: 16,
          zIndex: 20,
          border: "none",
          borderRadius: 999,
          background: "linear-gradient(135deg,#3b82f6,#2563eb)",
          boxShadow: "0 6px 20px rgba(59,130,246,0.55)",
          color: "white",
          fontFamily: "Heebo, sans-serif",
          fontWeight: 900,
          fontSize: 17,
          padding: "13px 22px",
          cursor: "pointer",
          direction: "rtl",
        }}
      >
        🌍 חזרה לכדור הארץ
      </button>

      <NameRevealBubble
        name={activeBubble?.name ?? null}
        color={activeBubble?.color ?? "#6366f1"}
        position={null}
        onDismiss={dismissBubble}
        onMore={
          activeBubble
            ? () => {
                if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                setCardId(activeBubble.id);
                setActiveBubble(null);
              }
            : undefined
        }
      />

      <ConfettiEffect trigger={confettiTrigger} originX={confettiOrigin.x} originY={confettiOrigin.y} />
      <MilestoneModal isOpen={!!milestone} onClose={() => setMilestone(null)} message={milestone ?? ""} />

      <PlanetCard
        planetId={cardId}
        onClose={() => setCardId(null)}
        speakHebrew={speakHebrew}
        playSfx={playSfx}
      />
    </div>
  );
}
