import { useCallback, useMemo, useState } from "react";
import HomeScreen, { type HomeTarget } from "./components/UI/HomeScreen";
import LaunchOverlay, { type Flight } from "./components/Space/LaunchOverlay";
import GlobeView from "./components/Globe/GlobeView";
import Map2DView from "./components/WorldMap/Map2DView";
import IsraelMap from "./components/WorldMap/IsraelMap";
import SolarSystemView from "./components/Space/SolarSystemView";
import OceanDiveView from "./components/Ocean/OceanDiveView";
import QuizView from "./components/Quiz/QuizView";
import StickerAlbum from "./components/Album/StickerAlbum";
import Encyclopedia from "./components/Explorer/Encyclopedia";
import StickerCelebration from "./components/Album/StickerCelebration";
import ParentalGate from "./components/UI/ParentalGate";
import DiscoveryCounter from "./components/UI/DiscoveryCounter";
import AudioToggle from "./components/UI/AudioToggle";
import { useDiscovery } from "./hooks/useDiscovery";
import { useAudio } from "./hooks/useAudio";
import { useSfx } from "./hooks/useSfx";
import { useStickers } from "./hooks/useStickers";
import { CONTINENTS } from "./data/continents";
import { COUNTRIES } from "./data/countries";
import { TOTAL_ISRAEL_CITIES } from "./data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "./data/planets";
import { TOTAL_MARINE_CREATURES } from "./data/marineLife";
import type { OceanId } from "./data/oceans";
import { STICKERS } from "./lib/stickers";

type Screen = "home" | "globe" | "map2d" | "israel" | "space" | "ocean" | "quiz" | "album" | "encyclopedia";
type WorldMode = "continents" | "countries";

const SCREEN_LABELS: Record<Screen, string> = {
  home: "",
  globe: "הגלובוס שלי",
  map2d: "מפה שטוחה",
  israel: "ערי ישראל",
  space: "מערכת השמש",
  ocean: "עולם האוקיינוס",
  quiz: "חידון",
  album: "אלבום מדבקות",
  encyclopedia: "האנציקלופדיה",
};

const topBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  border: "none",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.9)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  fontSize: 20,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [worldMode, setWorldMode] = useState<WorldMode>("continents");
  const [gateOpen, setGateOpen] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [oceanStart, setOceanStart] = useState<OceanId | undefined>(undefined);

  // Local calendar day (YYYY-MM-DD) for the daily challenge — offline, no clock in pure logic.
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { isMuted, toggleMute, speakHebrew, speakLang } = useAudio();
  const { play } = useSfx(isMuted);

  const continentsDiscovery = useDiscovery("continents");
  const countriesDiscovery = useDiscovery("countries");
  const israelDiscovery = useDiscovery("israel");
  const planetsDiscovery = useDiscovery("planets");
  const constellationsDiscovery = useDiscovery("constellations");
  const oceanDiscovery = useDiscovery("ocean");
  const visitedDiscovery = useDiscovery("visited");

  const progressSnapshot = useMemo(
    () => ({
      continentsDiscovered: continentsDiscovery.discovered,
      countriesDiscovered: countriesDiscovery.discovered,
      israelDiscovered: israelDiscovery.totalDiscovered,
      planetsDiscovered: planetsDiscovery.totalDiscovered,
      constellationsDiscovered: constellationsDiscovery.totalDiscovered,
      oceanDiscovered: oceanDiscovery.discovered,
      visitedCount: visitedDiscovery.totalDiscovered,
    }),
    [
      continentsDiscovery.discovered,
      countriesDiscovery.discovered,
      israelDiscovery.totalDiscovered,
      planetsDiscovery.totalDiscovered,
      constellationsDiscovery.totalDiscovered,
      oceanDiscovery.discovered,
      visitedDiscovery.totalDiscovered,
    ]
  );

  const stickers = useStickers(progressSnapshot);

  const grandTotal =
    continentsDiscovery.totalDiscovered +
    countriesDiscovery.totalDiscovered +
    israelDiscovery.totalDiscovered +
    planetsDiscovery.totalDiscovered +
    constellationsDiscovery.totalDiscovered +
    oceanDiscovery.totalDiscovered;

  const activeWorldDiscovery = worldMode === "continents" ? continentsDiscovery : countriesDiscovery;

  // Fly a rocket between Earth screens and space 🚀 (cinematic sequence)
  const goWithRocket = useCallback((to: Screen) => {
    setFlight((cur) => cur ?? { to, dir: to === "space" ? "up" : "down" });
  }, []);

  const handleHomeSelect = useCallback(
    (target: HomeTarget) => {
      play("pop");
      if (target === "space") goWithRocket("space");
      else setScreen(target);
    },
    [play, goWithRocket]
  );

  const counter = (() => {
    switch (screen) {
      case "globe":
      case "map2d":
        return {
          count: activeWorldDiscovery.totalDiscovered,
          total: worldMode === "continents" ? CONTINENTS.length : COUNTRIES.length,
        };
      case "israel":
        return { count: israelDiscovery.totalDiscovered, total: TOTAL_ISRAEL_CITIES };
      case "space":
        return { count: planetsDiscovery.totalDiscovered, total: TOTAL_SPACE_OBJECTS };
      case "ocean":
        return { count: oceanDiscovery.totalDiscovered, total: TOTAL_MARINE_CREATURES };
      default:
        return null;
    }
  })();

  const canReset =
    screen === "globe" || screen === "map2d" || screen === "israel" || screen === "space" || screen === "ocean";

  const doReset = useCallback(() => {
    setGateOpen(false);
    if (screen === "israel") israelDiscovery.resetProgress();
    else if (screen === "space") {
      planetsDiscovery.resetProgress();
      constellationsDiscovery.resetProgress();
    } else if (screen === "ocean") oceanDiscovery.resetProgress();
    else activeWorldDiscovery.resetProgress();
    speakHebrew("ההתקדמות אופסה. יוצאים להרפתקה חדשה!");
  }, [screen, israelDiscovery, planetsDiscovery, constellationsDiscovery, oceanDiscovery, activeWorldDiscovery, speakHebrew]);

  // ── Home ──
  if (screen === "home") {
    return (
      <div className="h-full w-full" style={{ fontFamily: "Heebo, sans-serif" }}>
        <HomeScreen
          onSelect={handleHomeSelect}
          totalDiscovered={grandTotal}
          discoveredPerMode={{
            continents: continentsDiscovery.totalDiscovered,
            countries: countriesDiscovery.totalDiscovered,
            israel: israelDiscovery.totalDiscovered,
            planets: planetsDiscovery.totalDiscovered,
            ocean: oceanDiscovery.totalDiscovered,
          }}
          stickersUnlocked={stickers.unlocked.size}
          stickersTotal={STICKERS.length}
        />
        <StickerCelebration
          stickerId={stickers.pendingCelebration}
          onClose={() => stickers.pendingCelebration && stickers.markCelebrated(stickers.pendingCelebration)}
          onGoToAlbum={() => {
            if (stickers.pendingCelebration) stickers.markCelebrated(stickers.pendingCelebration);
            setScreen("album");
          }}
          speakHebrew={speakHebrew}
          playSfx={play}
        />
        <LaunchOverlay
          flight={flight}
          onArrive={(to) => setScreen(to as Screen)}
          onDone={() => setFlight(null)}
          speakHebrew={speakHebrew}
        />
      </div>
    );
  }

  // ── All other screens share the top bar ──
  const isSpaceish = screen === "space";

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      style={{ fontFamily: "Heebo, sans-serif", background: isSpaceish ? "#020309" : undefined }}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 right-0 left-0 z-30 flex items-center justify-between gap-1 p-2"
        style={{ direction: "rtl", pointerEvents: "none" }}
      >
        <button
          onClick={() => {
            play("pop");
            if (screen === "space") goWithRocket("home");
            else setScreen("home");
          }}
          style={{ ...topBtn, pointerEvents: "auto" }}
          aria-label="חזרה הביתה"
          data-testid="home-button"
        >
          🏠
        </button>

        <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              color: isSpaceish ? "#c7d2fe" : "#64748b",
              letterSpacing: "0.5px",
              textShadow: isSpaceish ? "0 1px 4px rgba(0,0,0,0.8)" : undefined,
              whiteSpace: "nowrap",
            }}
          >
            {SCREEN_LABELS[screen]}
          </div>
          {counter && <DiscoveryCounter count={counter.count} total={counter.total} />}
        </div>

        <div className="flex items-center gap-2" style={{ pointerEvents: "auto" }}>
          {canReset && (
            <button
              onClick={() => setGateOpen(true)}
              style={topBtn}
              title="איפוס גילויים"
              aria-label="איפוס גילויים"
              data-testid="reset-button"
            >
              🗑️
            </button>
          )}
          <AudioToggle isMuted={isMuted} onToggle={toggleMute} />
        </div>
      </div>

      {/* Screens */}
      {screen === "globe" && (
        <GlobeView
          mode={worldMode}
          onModeChange={setWorldMode}
          continentsDiscovery={continentsDiscovery}
          countriesDiscovery={countriesDiscovery}
          speakHebrew={speakHebrew}
          speakLang={speakLang}
          playSfx={play}
          wordsHeard={stickers.wordsHeard}
          markWordHeard={stickers.markWordHeard}
          markSeasonSeen={stickers.markSeasonSeen}
          markVisited={(id) => visitedDiscovery.discover(id)}
          onGoTo2D={() => setScreen("map2d")}
          onGoSpace={() => goWithRocket("space")}
          onDiveOcean={(ocean) => {
            setOceanStart(ocean);
            setScreen("ocean");
          }}
        />
      )}

      {screen === "map2d" && (
        <Map2DView
          mode={worldMode}
          onModeChange={setWorldMode}
          continentsDiscovery={continentsDiscovery}
          countriesDiscovery={countriesDiscovery}
          speakHebrew={speakHebrew}
          speakLang={speakLang}
          playSfx={play}
          wordsHeard={stickers.wordsHeard}
          markWordHeard={stickers.markWordHeard}
          markVisited={(id) => visitedDiscovery.discover(id)}
          onGoTo3D={() => setScreen("globe")}
        />
      )}

      {screen === "israel" && (
        <IsraelMap
          discoveredSet={israelDiscovery.discovered}
          onDiscover={israelDiscovery.discover}
          speakHebrew={speakHebrew}
          playSfx={play}
        />
      )}

      {screen === "space" && (
        <SolarSystemView
          planetsDiscovery={planetsDiscovery}
          constellationsDiscovery={constellationsDiscovery}
          speakHebrew={speakHebrew}
          playSfx={play}
          onBackToEarth={() => goWithRocket("globe")}
        />
      )}

      {screen === "ocean" && (
        <OceanDiveView
          oceanDiscovery={oceanDiscovery}
          speakHebrew={speakHebrew}
          playSfx={play}
          initialOcean={oceanStart}
        />
      )}

      {screen === "quiz" && (
        <QuizView
          discovered={{
            continents: continentsDiscovery.discovered,
            countries: countriesDiscovery.discovered,
            israel: israelDiscovery.discovered,
            planets: planetsDiscovery.discovered,
            flags: countriesDiscovery.discovered,
            marine: oceanDiscovery.discovered,
          }}
          speakHebrew={speakHebrew}
          playSfx={play}
          recordQuizResult={stickers.recordQuizResult}
          today={todayStr}
          dailyStreak={stickers.dailyStreak}
          dailyDoneToday={stickers.dailyDoneToday(todayStr)}
          onCompleteDaily={() => stickers.completeDaily(todayStr)}
        />
      )}

      {screen === "album" && (
        <StickerAlbum unlocked={stickers.unlocked} speakHebrew={speakHebrew} playSfx={play} />
      )}

      {screen === "encyclopedia" && (
        <Encyclopedia
          discovered={{
            continents: continentsDiscovery.discovered,
            countries: countriesDiscovery.discovered,
            planets: planetsDiscovery.discovered,
            constellations: constellationsDiscovery.discovered,
            ocean: oceanDiscovery.discovered,
          }}
          speakHebrew={speakHebrew}
          playSfx={play}
        />
      )}

      {/* Overlays */}
      <ParentalGate open={gateOpen} onSuccess={doReset} onClose={() => setGateOpen(false)} />
      <StickerCelebration
        stickerId={stickers.pendingCelebration}
        onClose={() => stickers.pendingCelebration && stickers.markCelebrated(stickers.pendingCelebration)}
        onGoToAlbum={() => {
          if (stickers.pendingCelebration) stickers.markCelebrated(stickers.pendingCelebration);
          setScreen("album");
        }}
        speakHebrew={speakHebrew}
        playSfx={play}
      />
      <LaunchOverlay
        flight={flight}
        onArrive={(to) => setScreen(to as Screen)}
        onDone={() => setFlight(null)}
        speakHebrew={speakHebrew}
      />
    </div>
  );
}
