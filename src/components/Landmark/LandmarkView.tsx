// Full-screen landmark visit: the 3D site + 3 tappable treasures, a welcome
// voice-over, discovery bubbles/cards, and a treasure tracker. Overlays the
// whole app (opened from the globe pin or the gallery).

import { useCallback, useEffect, useRef, useState } from "react";
import { LandmarkScene, type LandmarkPick } from "../../three/LandmarkScene";
import { LANDMARK_BY_ID, TREASURE_BY_ID } from "../../data/landmarks";
import type { DiscoveryState } from "../../hooks/useDiscovery";
import type { SfxName } from "../../hooks/useSfx";
import NameRevealBubble from "../WorldMap/NameRevealBubble";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import InfoSheet from "../Cards/InfoSheet";

interface LandmarkViewProps {
  landmarkId: string;
  onClose: () => void;
  treasuresDiscovery: DiscoveryState;
  onVisited: (landmarkId: string) => void;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

const roundBtn: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
  fontSize: 20,
  fontWeight: 800,
  color: "#1a365d",
  cursor: "pointer",
  fontFamily: "Heebo, sans-serif",
};

export default function LandmarkView({
  landmarkId,
  onClose,
  treasuresDiscovery,
  onVisited,
  speakHebrew,
  playSfx,
}: LandmarkViewProps) {
  const landmark = LANDMARK_BY_ID.get(landmarkId);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LandmarkScene | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [webglFailed, setWebglFailed] = useState(false);
  const [activeBubble, setActiveBubble] = useState<{ id: string; name: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [cardId, setCardId] = useState<string | null>(null);

  const stateRef = useRef({ treasuresDiscovery, playSfx, speakHebrew });
  useEffect(() => {
    stateRef.current = { treasuresDiscovery, playSfx, speakHebrew };
  }, [treasuresDiscovery, playSfx, speakHebrew]);

  // arriving marks the visit + welcome voice-over
  useEffect(() => {
    if (!landmark) return;
    onVisited(landmark.id);
    speakHebrew(landmark.welcomeHebrew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarkId]);

  const handlePick = useCallback((pick: LandmarkPick | null) => {
    if (!pick || !landmark) return;
    const s = stateRef.current;
    if (pick.kind === "treasure") {
      const t = TREASURE_BY_ID.get(pick.id);
      if (!t) return;
      s.playSfx("pop");
      const isNew = s.treasuresDiscovery.discover(t.id);
      s.speakHebrew(isNew ? `מצאתם ${t.nameHebrew}! ${t.factHebrew}` : t.nameHebrew);
      setActiveBubble({ id: t.id, name: `${t.emoji} ${t.nameHebrew}` });
      if (isNew) {
        s.playSfx("sparkle");
        setConfettiOrigin({ x: pick.screenX / window.innerWidth, y: pick.screenY / window.innerHeight });
        setConfettiTrigger((p) => p + 1);
      }
    } else {
      s.playSfx("pop");
      s.speakHebrew(landmark.factHebrew);
      setActiveBubble({ id: "site", name: `${landmark.emoji} ${landmark.nameHebrew}` });
    }
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarkId]);

  // engine lifecycle
  useEffect(() => {
    if (!containerRef.current || !landmark) return;
    let scene: LandmarkScene | null = null;
    try {
      scene = new LandmarkScene(containerRef.current, {
        landmark,
        discoveredTreasures: stateRef.current.treasuresDiscovery.discovered,
        reducedMotion:
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onPick: handlePick,
      });
      engineRef.current = scene;
    } catch {
      setTimeout(() => setWebglFailed(true), 0);
    }
    return () => {
      engineRef.current = null;
      scene?.dispose();
    };
  }, [landmarkId, handlePick, landmark]);

  useEffect(() => {
    engineRef.current?.setDiscovered(treasuresDiscovery.discovered);
  }, [treasuresDiscovery.discovered]);

  if (!landmark) return null;

  const foundHere = landmark.treasures.filter((t) => treasuresDiscovery.discovered.has(t.id));
  const card = cardId ? TREASURE_BY_ID.get(cardId) : undefined;

  return (
    <div
      className="fixed inset-0 z-40"
      style={{ background: "#0b1220", fontFamily: "Heebo, sans-serif" }}
      data-testid="landmark-view"
    >
      {webglFailed ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
          style={{ direction: "rtl", textAlign: "center", color: "white" }}
        >
          <div style={{ fontSize: 72 }}>{landmark.emoji}</div>
          <div style={{ fontWeight: 900, fontSize: 24 }}>{landmark.nameHebrew}</div>
          <div style={{ fontWeight: 700, fontSize: 16, maxWidth: 420, lineHeight: 1.5 }}>
            {landmark.factHebrew}
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="absolute inset-0" data-testid="landmark-container" />
      )}

      {/* Top bar: back + title + treasure tracker */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          direction: "rtl",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        <button
          onClick={() => {
            playSfx("pop");
            onClose();
          }}
          style={{ ...roundBtn, pointerEvents: "auto" }}
          aria-label="חזרה"
          data-testid="landmark-back"
        >
          ⬅️
        </button>
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            borderRadius: 999,
            padding: "7px 16px",
            fontWeight: 900,
            fontSize: 15.5,
            color: "#1a365d",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {landmark.emoji} {landmark.nameHebrew} {landmark.flagEmoji}
        </div>
        <div
          data-testid="treasure-counter"
          style={{
            background: "rgba(20,25,45,0.82)",
            borderRadius: 999,
            padding: "7px 12px",
            display: "flex",
            gap: 6,
            alignItems: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          }}
        >
          {landmark.treasures.map((t) => (
            <span key={t.id} style={{ fontSize: 18, filter: treasuresDiscovery.discovered.has(t.id) ? "none" : "grayscale(1) opacity(0.55)" }}>
              {treasuresDiscovery.discovered.has(t.id) ? t.emoji : "❓"}
            </span>
          ))}
          <span style={{ color: "#ffd66e", fontWeight: 900, fontSize: 13 }}>
            {foundHere.length}/3
          </span>
        </div>
      </div>

      {/* hint chip */}
      {foundHere.length < 3 && (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,25,45,0.8)",
            color: "#ffe9a8",
            borderRadius: 999,
            padding: "7px 18px",
            fontWeight: 800,
            fontSize: 14,
            direction: "rtl",
            zIndex: 20,
            whiteSpace: "nowrap",
          }}
        >
          💎 חפשו את האוצרות המרחפים ולחצו עליהם!
        </div>
      )}

      {/* zoom */}
      <div style={{ position: "absolute", bottom: 64, left: 14, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomIn()} aria-label="התקרבות">+</button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomOut()} aria-label="התרחקות">−</button>
      </div>

      <NameRevealBubble
        name={activeBubble?.name ?? null}
        color="#d97706"
        position={null}
        onDismiss={() => {
          setActiveBubble(null);
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        }}
        onMore={
          activeBubble && activeBubble.id !== "site"
            ? () => {
                if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                setCardId(activeBubble.id);
                setActiveBubble(null);
              }
            : undefined
        }
      />

      <ConfettiEffect trigger={confettiTrigger} originX={confettiOrigin.x} originY={confettiOrigin.y} />

      {/* treasure card */}
      <InfoSheet open={!!card} onClose={() => setCardId(null)} accentColor="#d97706">
        {card && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 50 }}>{card.emoji}</span>
              <div
                style={{ fontWeight: 900, fontSize: 27, color: "#0f172a", cursor: "pointer" }}
                onClick={() => speakHebrew(card.nameHebrew)}
              >
                {card.nameHebrew} 🔊
              </div>
            </div>
            <div
              onClick={() => {
                playSfx("pop");
                speakHebrew(card.factHebrew);
              }}
              style={{
                marginTop: 14,
                background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 700,
                fontSize: 17,
                color: "#78350f",
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
