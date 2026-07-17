// מסע תחבורה — choose a vehicle (car / train / plane) and ride a scenic
// loop past tappable sights. The vehicle drives itself; the child looks
// around, spots the ❓ markers and taps to discover. Shares the discovery
// flow (bubble → confetti → fact card → milestones).

import { useCallback, useEffect, useRef, useState } from "react";
import { LandJourneyScene, type LandPick } from "../../three/LandJourneyScene";
import {
  VEHICLES,
  VEHICLE_BY_ID,
  LAND_SIGHT_BY_ID,
  TOTAL_LAND_SIGHTS,
  sightsFor,
  type VehicleId,
} from "../../data/landJourney";
import type { DiscoveryState } from "../../hooks/useDiscovery";
import type { SfxName } from "../../hooks/useSfx";
import NameRevealBubble from "../WorldMap/NameRevealBubble";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import MilestoneModal from "../Overlays/MilestoneModal";
import InfoSheet from "../Cards/InfoSheet";

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
  fontFamily: "Heebo, sans-serif",
};

const VEHICLE_MILESTONES: Record<VehicleId, string> = {
  car: "גיליתם את כל התחנות במסלול המכונית! 🚗🏆",
  train: "גיליתם את כל התחנות במסלול הרכבת! 🚂🏆",
  plane: "טייסים אלופים! גיליתם הכול מהאוויר! ✈️🏆",
};

interface LandJourneyViewProps {
  landDiscovery: DiscoveryState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function LandJourneyView({
  landDiscovery,
  speakHebrew,
  playSfx,
}: LandJourneyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LandJourneyScene | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [vehicleId, setVehicleId] = useState<VehicleId>("car");
  const [fast, setFast] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [activeBubble, setActiveBubble] = useState<{ id: string; name: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestone, setMilestone] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [nearToast, setNearToast] = useState<string | null>(null);
  const welcomedRef = useRef<Set<VehicleId>>(new Set());

  const vehicle = VEHICLE_BY_ID.get(vehicleId)!;

  const stateRef = useRef({ landDiscovery, playSfx, speakHebrew, vehicleId });
  useEffect(() => {
    stateRef.current = { landDiscovery, playSfx, speakHebrew, vehicleId };
  }, [landDiscovery, playSfx, speakHebrew, vehicleId]);

  const handlePick = useCallback((pick: LandPick | null) => {
    const s = stateRef.current;
    if (!pick) return;
    const sight = LAND_SIGHT_BY_ID.get(pick.id);
    if (!sight) return;

    s.playSfx("pop");
    engineRef.current?.playReaction(pick.id);
    const isNew = s.landDiscovery.discover(pick.id);
    s.speakHebrew(sight.nameHebrew);
    setActiveBubble({ id: pick.id, name: `${sight.emoji} ${sight.nameHebrew}` });

    if (isNew) {
      s.playSfx("chime");
      setConfettiOrigin({ x: pick.screenX / window.innerWidth, y: pick.screenY / window.innerHeight });
      setConfettiTrigger((p) => p + 1);
      const vSights = sightsFor(s.vehicleId);
      const vDone = vSights.filter((x) => x.id === pick.id || s.landDiscovery.discovered.has(x.id)).length;
      if (s.landDiscovery.discovered.size + 1 === TOTAL_LAND_SIGHTS) {
        setTimeout(() => setMilestone("גיליתם את כל העולם — ביבשה ובאוויר! 🌍👑"), 1600);
      } else if (vDone === vSights.length) {
        setTimeout(() => setMilestone(VEHICLE_MILESTONES[s.vehicleId]), 1600);
      }
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3400);
  }, []);

  const handleNearSight = useCallback((id: string) => {
    const sight = LAND_SIGHT_BY_ID.get(id);
    if (!sight) return;
    setNearToast(`👀 תראו! ${sight.emoji} משהו מעניין ליד הדרך — געו בו!`);
    if (nearTimerRef.current) clearTimeout(nearTimerRef.current);
    nearTimerRef.current = setTimeout(() => setNearToast(null), 3800);
  }, []);

  // engine lifecycle — rebuilt per vehicle
  useEffect(() => {
    if (!containerRef.current) return;
    let scene: LandJourneyScene | null = null;
    try {
      scene = new LandJourneyScene(containerRef.current, {
        vehicle: VEHICLE_BY_ID.get(vehicleId)!,
        discovered: stateRef.current.landDiscovery.discovered,
        reducedMotion:
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onPick: handlePick,
        onNearSight: handleNearSight,
      });
      engineRef.current = scene;
    } catch {
      setTimeout(() => setWebglFailed(true), 0);
    }
    if (!welcomedRef.current.has(vehicleId)) {
      welcomedRef.current.add(vehicleId);
      stateRef.current.speakHebrew(VEHICLE_BY_ID.get(vehicleId)!.welcomeHebrew);
    }
    return () => {
      engineRef.current = null;
      scene?.dispose();
    };
  }, [vehicleId, handlePick, handleNearSight]);

  useEffect(() => {
    engineRef.current?.setDiscovered(landDiscovery.discovered);
  }, [landDiscovery.discovered]);

  useEffect(() => {
    engineRef.current?.setSpeed(fast ? 2.2 : 1);
  }, [fast, vehicleId]);

  const hereList = sightsFor(vehicleId);
  const hereCount = hereList.filter((s) => landDiscovery.discovered.has(s.id)).length;

  if (webglFailed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
        style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", textAlign: "center", background: "#8ecbee" }}
      >
        <div style={{ fontSize: 60 }}>🚗</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1a365d" }}>
          המסע לא נפתח במכשיר הזה 😢
        </div>
      </div>
    );
  }

  const card = cardId ? LAND_SIGHT_BY_ID.get(cardId) : undefined;
  const cardVehicle = card ? VEHICLE_BY_ID.get(card.vehicle) : undefined;

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400, background: "#8ecbee" }}>
      <div ref={containerRef} className="absolute inset-0" data-testid="land-container" />

      {/* Vehicle tabs */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          gap: 4,
          background: "rgba(255,255,255,0.9)",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          direction: "rtl",
          maxWidth: "94vw",
        }}
      >
        {VEHICLES.map((v) => (
          <button
            key={v.id}
            data-testid={`land-vehicle-${v.id}`}
            onClick={() => {
              playSfx(v.id === vehicleId ? "pop" : "whoosh");
              setVehicleId(v.id);
            }}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "8px 16px",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: vehicleId === v.id ? `linear-gradient(135deg, ${v.color}, #334155)` : "transparent",
              color: vehicleId === v.id ? "white" : "#475569",
            }}
          >
            {v.emoji} {v.nameHebrew}
          </button>
        ))}
      </div>

      {/* Route + progress chip */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(15,23,42,0.72)",
          borderRadius: 12,
          padding: "5px 16px",
          fontFamily: "Heebo, sans-serif",
          fontWeight: 800,
          fontSize: 13,
          color: "#e2e8f0",
          direction: "rtl",
          whiteSpace: "nowrap",
        }}
      >
        {vehicle.emoji} {vehicle.routeHebrew} · גיליתם {hereCount}/{hereList.length} תחנות במסלול
      </div>

      {/* Near-sight toast */}
      {nearToast && !activeBubble && (
        <div
          style={{
            position: "absolute",
            top: 118,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            borderRadius: 999,
            padding: "8px 20px",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 800,
            fontSize: 15,
            color: "white",
            direction: "rtl",
            whiteSpace: "nowrap",
            boxShadow: "0 6px 22px rgba(217,119,6,0.5)",
          }}
          data-testid="land-near-toast"
        >
          {nearToast}
        </div>
      )}

      {/* Speed + zoom */}
      <div style={{ position: "absolute", bottom: 96, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button
          style={{
            ...roundBtn,
            background: fast ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.9)",
            color: fast ? "white" : "#1a365d",
            fontSize: 18,
          }}
          onClick={() => {
            playSfx("whoosh");
            setFast((f) => !f);
          }}
          aria-label="מהירות"
          data-testid="land-speed"
        >
          {fast ? "💨" : "🐢"}
        </button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomIn()} aria-label="התקרבות">+</button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomOut()} aria-label="התרחקות">−</button>
      </div>

      <NameRevealBubble
        name={activeBubble?.name ?? null}
        color={vehicle.color}
        position={null}
        onDismiss={() => {
          setActiveBubble(null);
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        }}
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

      {/* Sight card */}
      <InfoSheet open={!!card} onClose={() => setCardId(null)} accentColor={cardVehicle?.color ?? vehicle.color}>
        {card && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 50 }}>{card.emoji}</span>
              <div>
                <div
                  style={{ fontWeight: 900, fontSize: 28, color: "#0f172a", cursor: "pointer" }}
                  onClick={() => speakHebrew(card.nameHebrew)}
                >
                  {card.nameHebrew} 🔊
                </div>
                <span
                  style={{
                    display: "inline-block",
                    background: "#fef3c7",
                    color: "#92400e",
                    borderRadius: 999,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {cardVehicle?.emoji} התגלה במסלול ה{cardVehicle?.nameHebrew}
                </span>
              </div>
            </div>

            <div
              onClick={() => {
                playSfx("pop");
                speakHebrew(card.factHebrew);
              }}
              style={{
                marginTop: 14,
                background: "linear-gradient(135deg,#fef9c3,#fde68a)",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 700,
                fontSize: 17,
                color: "#854d0e",
                cursor: "pointer",
                lineHeight: 1.45,
              }}
            >
              💡 {card.factHebrew} <span style={{ fontSize: 14 }}>🔊</span>
            </div>
          </div>
        )}
      </InfoSheet>
    </div>
  );
}
