// משלחת הצוללת — pick a craft (submarine / diver) and an area (5 tabs):
// shipwreck, kelp forest, glowing cave, sunken city, hot vents. Tap finds
// to discover them — rescue a turtle, clean the sea, open treasure chests.
// Shares the discovery flow (bubble → confetti → fact card → milestones).

import { useCallback, useEffect, useRef, useState } from "react";
import { DeepSeaScene, type DeepSeaPick } from "../../three/DeepSeaScene";
import {
  DEEP_SEA_AREAS,
  DEEP_SEA_AREA_BY_ID,
  DEEP_SEA_FIND_BY_ID,
  DIVE_CRAFTS,
  TOTAL_DEEP_SEA_FINDS,
  findsFor,
  type DeepSeaAreaId,
  type DiveCraftId,
} from "../../data/deepSea";
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

const EVENT_TOASTS: Record<"whale" | "dolphin" | "squid" | "glowfish", string> = {
  whale: "🐋 לווייתן ענק שוחה לידנו!",
  dolphin: "🐬 דולפין שובב בא לשחק!",
  squid: "🦑 דיונון ענק וידידותי במרחק... איזה מסתורי!",
  glowfish: "✨ להקת דגים זוהרים חולפת!",
};

const SPECIAL_SFX: Record<string, SfxName> = {
  rescue: "tada",
  clean: "sparkle",
  treasure: "tada",
};

interface DeepSeaViewProps {
  deepSeaDiscovery: DiscoveryState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function DeepSeaView({
  deepSeaDiscovery,
  speakHebrew,
  playSfx,
}: DeepSeaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DeepSeaScene | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [areaId, setAreaId] = useState<DeepSeaAreaId>("wreck");
  const [craft, setCraft] = useState<DiveCraftId>("sub");
  const [webglFailed, setWebglFailed] = useState(false);
  const [activeBubble, setActiveBubble] = useState<{ id: string; name: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0.5, y: 0.5 });
  const [milestone, setMilestone] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [eventToast, setEventToast] = useState<string | null>(null);
  const welcomedRef = useRef<Set<DeepSeaAreaId>>(new Set());

  const area = DEEP_SEA_AREA_BY_ID.get(areaId)!;

  const stateRef = useRef({ deepSeaDiscovery, playSfx, speakHebrew });
  useEffect(() => {
    stateRef.current = { deepSeaDiscovery, playSfx, speakHebrew };
  }, [deepSeaDiscovery, playSfx, speakHebrew]);

  const handlePick = useCallback((pick: DeepSeaPick | null) => {
    const s = stateRef.current;
    if (!pick) return;
    const find = DEEP_SEA_FIND_BY_ID.get(pick.id);
    if (!find) return;

    s.playSfx("pop");
    engineRef.current?.playReaction(pick.id);
    const isNew = s.deepSeaDiscovery.discover(pick.id);
    s.speakHebrew(find.nameHebrew);
    setActiveBubble({ id: pick.id, name: `${find.emoji} ${find.nameHebrew}` });

    if (isNew) {
      s.playSfx(find.special ? SPECIAL_SFX[find.special] : "chime");
      setConfettiOrigin({ x: pick.screenX / window.innerWidth, y: pick.screenY / window.innerHeight });
      setConfettiTrigger((p) => p + 1);
      if (s.deepSeaDiscovery.discovered.size + 1 === TOTAL_DEEP_SEA_FINDS) {
        setTimeout(() => setMilestone("חקרתם את כל מעמקי הים! 🤿👑"), 1600);
      }
    }

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setActiveBubble(null), 3400);
  }, []);

  const handleEvent = useCallback((kind: "whale" | "dolphin" | "squid" | "glowfish") => {
    setEventToast(EVENT_TOASTS[kind]);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setEventToast(null), 4200);
  }, []);

  // engine lifecycle — rebuilt per area/craft
  useEffect(() => {
    if (!containerRef.current) return;
    let scene: DeepSeaScene | null = null;
    try {
      scene = new DeepSeaScene(containerRef.current, {
        area: DEEP_SEA_AREA_BY_ID.get(areaId)!,
        craft,
        discovered: stateRef.current.deepSeaDiscovery.discovered,
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
    if (!welcomedRef.current.has(areaId)) {
      welcomedRef.current.add(areaId);
      stateRef.current.speakHebrew(DEEP_SEA_AREA_BY_ID.get(areaId)!.welcomeHebrew);
    }
    return () => {
      engineRef.current = null;
      scene?.dispose();
    };
  }, [areaId, craft, handlePick, handleEvent]);

  useEffect(() => {
    engineRef.current?.setDiscovered(deepSeaDiscovery.discovered);
  }, [deepSeaDiscovery.discovered]);

  const hereList = findsFor(areaId);
  const hereCount = hereList.filter((f) => deepSeaDiscovery.discovered.has(f.id)).length;

  if (webglFailed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 p-8"
        style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", textAlign: "center", background: "#0b3a55" }}
      >
        <div style={{ fontSize: 60 }}>🤿</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "white" }}>
          הצוללת לא הצליחה לצלול במכשיר הזה 😢
        </div>
      </div>
    );
  }

  const card = cardId ? DEEP_SEA_FIND_BY_ID.get(cardId) : undefined;
  const cardArea = card ? DEEP_SEA_AREA_BY_ID.get(card.area) : undefined;

  return (
    <div className="relative w-full h-full" style={{ minHeight: 400, background: area.water }}>
      <div ref={containerRef} className="absolute inset-0" data-testid="deepsea-container" />

      {/* Area tabs */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          gap: 4,
          background: "rgba(255,255,255,0.88)",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          direction: "rtl",
          maxWidth: "94vw",
          overflowX: "auto",
        }}
      >
        {DEEP_SEA_AREAS.map((a) => (
          <button
            key={a.id}
            data-testid={`deepsea-area-${a.id}`}
            onClick={() => {
              playSfx(a.id === areaId ? "pop" : "whoosh");
              setAreaId(a.id);
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
              background: areaId === a.id ? `linear-gradient(135deg, ${a.color}, #0f2c44)` : "transparent",
              color: areaId === a.id ? "white" : "#475569",
            }}
          >
            {a.emoji} {a.nameHebrew}
          </button>
        ))}
      </div>

      {/* Craft toggle + progress */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          direction: "rtl",
        }}
      >
        <div
          style={{
            background: "rgba(2,20,35,0.72)",
            borderRadius: 12,
            padding: "4px 14px",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            color: "#bae6fd",
            whiteSpace: "nowrap",
          }}
        >
          {area.emoji} {area.nameHebrew} · גיליתם כאן {hereCount}/{hereList.length}
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 999,
            padding: 4,
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
          }}
        >
          {DIVE_CRAFTS.map((c) => (
            <button
              key={c.id}
              data-testid={`deepsea-craft-${c.id}`}
              onClick={() => {
                if (c.id === craft) return;
                playSfx("whoosh");
                setCraft(c.id);
                speakHebrew(c.helloHebrew);
              }}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "8px 16px",
                fontFamily: "Heebo, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                background:
                  craft === c.id
                    ? c.id === "sub"
                      ? "linear-gradient(135deg,#f59e0b,#b45309)"
                      : "linear-gradient(135deg,#0ea5e9,#0369a1)"
                    : "transparent",
                color: craft === c.id ? "white" : "#475569",
              }}
            >
              {c.emoji} {c.nameHebrew}
            </button>
          ))}
        </div>
      </div>

      {/* Visitor toast */}
      {eventToast && (
        <div
          style={{
            position: "absolute",
            top: 118,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "linear-gradient(135deg,#0e7490,#155e75)",
            border: "1.5px solid rgba(165,243,252,0.5)",
            borderRadius: 999,
            padding: "8px 20px",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 800,
            fontSize: 15,
            color: "#cffafe",
            direction: "rtl",
            whiteSpace: "nowrap",
            boxShadow: "0 6px 22px rgba(14,116,144,0.6)",
          }}
          data-testid="deepsea-event-toast"
        >
          {eventToast}
        </div>
      )}

      {/* Zoom */}
      <div style={{ position: "absolute", bottom: 110, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomIn()} aria-label="התקרבות">+</button>
        <button style={roundBtn} onClick={() => engineRef.current?.zoomOut()} aria-label="התרחקות">−</button>
      </div>

      <NameRevealBubble
        name={activeBubble?.name ?? null}
        color={area.color}
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

      {/* Find card */}
      <InfoSheet open={!!card} onClose={() => setCardId(null)} accentColor={cardArea?.color ?? area.color}>
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
                    background: "#e0f2fe",
                    color: "#075985",
                    borderRadius: 999,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {cardArea?.emoji} התגלה ב{cardArea?.nameHebrew}
                </span>
                {card.special && (
                  <span
                    style={{
                      display: "inline-block",
                      background: card.special === "clean" ? "#dcfce7" : card.special === "rescue" ? "#fee2e2" : "#fef3c7",
                      color: card.special === "clean" ? "#166534" : card.special === "rescue" ? "#991b1b" : "#92400e",
                      borderRadius: 999,
                      padding: "2px 12px",
                      fontWeight: 700,
                      fontSize: 13,
                      marginTop: 4,
                      marginRight: 6,
                    }}
                  >
                    {card.special === "clean" ? "🧹 משימת ניקיון" : card.special === "rescue" ? "🚑 משימת חילוץ" : "💎 אוצר נדיר"}
                  </span>
                )}
              </div>
            </div>

            <div
              onClick={() => {
                playSfx("pop");
                speakHebrew(card.factHebrew);
              }}
              style={{
                marginTop: 14,
                background: "linear-gradient(135deg,#cffafe,#a5f3fc)",
                borderRadius: 16,
                padding: "12px 16px",
                fontWeight: 700,
                fontSize: 17,
                color: "#155e75",
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
