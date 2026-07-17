// תחנת החלל — pick a room (7 tabs) and explore it in 3D. Every piece of
// equipment is tappable: it reacts, tells its name and reveals a fact card.
// Shares the discovery flow (bubble → confetti → sticker milestones).

import { useCallback, useEffect, useRef, useState } from "react";
import { SpaceStationScene, type StationPick } from "../../three/SpaceStationScene";
import {
  STATION_ROOMS,
  STATION_ROOM_BY_ID,
  STATION_OBJECT_BY_ID,
  TOTAL_STATION_OBJECTS,
  stationObjectsFor,
  type StationRoomId,
} from "../../data/spaceStation";
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

const EVENT_TOASTS: Record<"comet" | "meteors" | "ship", string> = {
  comet: "☄️ שביט חולף ליד התחנה!",
  meteors: "🌠 מטר מטאורים! תראו את הניצוצות!",
  ship: "🚀 חללית אספקה חולפת על פנינו!",
};

interface SpaceStationViewProps {
  stationDiscovery: DiscoveryState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function SpaceStationView({
  stationDiscovery,
  speakHebrew,
  playSfx,
}: SpaceStationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SpaceStationScene | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [roomId, setRoomId] = useState<StationRoomId>("cockpit");
  const [webglFailed, setWebglFailed] = useState(false);
  const [activeBubble, setActiveBubble] = useState<{ id: string; name: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestone, setMilestone] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [eventToast, setEventToast] = useState<string | null>(null);
  const welcomedRef = useRef<Set<StationRoomId>>(new Set());

  const room = STATION_ROOM_BY_ID.get(roomId)!;

  const stateRef = useRef({ stationDiscovery, playSfx, speakHebrew });
  useEffect(() => {
    stateRef.current = { stationDiscovery, playSfx, speakHebrew };
  }, [stationDiscovery, playSfx, speakHebrew]);

  const handlePick = useCallback((pick: StationPick | null) => {
    const s = stateRef.current;
    if (!pick) return;
    const obj = STATION_OBJECT_BY_ID.get(pick.id);
    if (!obj) return;

    s.playSfx("pop");
    engineRef.current?.playReaction(pick.id);
    const isNew = s.stationDiscovery.discover(pick.id);
    s.speakHebrew(obj.nameHebrew);
    setActiveBubble({ id: pick.id, name: `${obj.emoji} ${obj.nameHebrew}` });

    if (isNew) {
      s.playSfx("chime");
      setConfettiOrigin({ x: pick.screenX / window.innerWidth, y: pick.screenY / window.innerHeight });
      setConfettiTrigger((p) => p + 1);
      if (s.stationDiscovery.discovered.size + 1 === TOTAL_STATION_OBJECTS) {
        setTimeout(() => setMilestone("חקרתם את כל תחנת החלל! 🛰️👑"), 1600);
      }
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3400);
  }, []);

  const handleEvent = useCallback((kind: "comet" | "meteors" | "ship") => {
    setEventToast(EVENT_TOASTS[kind]);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setEventToast(null), 4200);
  }, []);

  // engine lifecycle — rebuilt per room (small scenes, fast to build)
  useEffect(() => {
    if (!containerRef.current) return;
    let scene: SpaceStationScene | null = null;
    try {
      scene = new SpaceStationScene(containerRef.current, {
        room: STATION_ROOM_BY_ID.get(roomId)!,
        discovered: stateRef.current.stationDiscovery.discovered,
        reducedMotion:
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onPick: handlePick,
        onEvent: handleEvent,
      });
      engineRef.current = scene;
    } catch {
      setTimeout(() => setWebglFailed(true), 0);
    }
    // welcome line, once per room per visit
    if (!welcomedRef.current.has(roomId)) {
      welcomedRef.current.add(roomId);
      stateRef.current.speakHebrew(STATION_ROOM_BY_ID.get(roomId)!.welcomeHebrew);
    }
    return () => {
      engineRef.current = null;
      scene?.dispose();
    };
  }, [roomId, handlePick, handleEvent]);

  useEffect(() => {
    engineRef.current?.setDiscovered(stationDiscovery.discovered);
  }, [stationDiscovery.discovered]);

  const hereList = stationObjectsFor(roomId);
  const hereCount = hereList.filter((o) => stationDiscovery.discovered.has(o.id)).length;

  if (webglFailed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
        style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", textAlign: "center", background: "#03040c" }}
      >
        <div style={{ fontSize: 60 }}>🛰️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "white" }}>
          תחנת החלל לא נפתחת במכשיר הזה 😢
        </div>
      </div>
    );
  }

  const card = cardId ? STATION_OBJECT_BY_ID.get(cardId) : undefined;
  const cardRoom = card ? STATION_ROOM_BY_ID.get(card.room) : undefined;

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400, background: "#03040c" }}>
      <div ref={containerRef} className="absolute inset-0" data-testid="station-container" />

      {/* Room tabs */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          gap: 4,
          background: "rgba(10,16,34,0.82)",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
          direction: "rtl",
          maxWidth: "94vw",
          overflowX: "auto",
        }}
      >
        {STATION_ROOMS.map((r) => (
          <button
            key={r.id}
            data-testid={`station-room-${r.id}`}
            onClick={() => {
              playSfx(r.id === roomId ? "pop" : "whoosh");
              setRoomId(r.id);
            }}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "7px 11px",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 13.5,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: roomId === r.id ? `linear-gradient(135deg, ${r.color}, #1e2b57)` : "transparent",
              color: roomId === r.id ? "white" : "#94a3b8",
            }}
          >
            {r.emoji} {r.nameHebrew}
          </button>
        ))}
      </div>

      {/* Progress chip */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(10,16,34,0.78)",
          borderRadius: 12,
          padding: "5px 16px",
          fontFamily: "Heebo, sans-serif",
          fontWeight: 800,
          fontSize: 13,
          color: "#c7d2fe",
          direction: "rtl",
          whiteSpace: "nowrap",
        }}
      >
        {room.emoji} {room.nameHebrew} · גיליתם כאן {hereCount}/{hereList.length} · סובבו את התחנה וגעו בציוד!
      </div>

      {/* Outside-event toast */}
      {eventToast && (
        <div
          style={{
            position: "absolute",
            top: 118,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "linear-gradient(135deg,#312e81,#1e1b4b)",
            border: "1.5px solid rgba(165,180,252,0.5)",
            borderRadius: 999,
            padding: "8px 20px",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 800,
            fontSize: 15,
            color: "#e0e7ff",
            direction: "rtl",
            whiteSpace: "nowrap",
            boxShadow: "0 6px 22px rgba(49,46,129,0.6)",
          }}
          data-testid="station-event-toast"
        >
          {eventToast}
        </div>
      )}

      {/* Zoom */}
      <div style={{ position: "absolute", bottom: 96, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomIn()} aria-label="התקרבות">+</button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomOut()} aria-label="התרחקות">−</button>
      </div>

      <NameRevealBubble
        name={activeBubble?.name ?? null}
        color={room.color}
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

      {/* Equipment card */}
      <InfoSheet open={!!card} onClose={() => setCardId(null)} accentColor={cardRoom?.color ?? room.color}>
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
                    background: "#ede9fe",
                    color: "#5b21b6",
                    borderRadius: 999,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {cardRoom?.emoji} נמצא ב{cardRoom?.nameHebrew}
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
                background: "linear-gradient(135deg,#e0e7ff,#ddd6fe)",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 700,
                fontSize: 17,
                color: "#3730a3",
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
