// מה השעה? — the clock corner: three mini-games behind one menu.
// 1) "קוראים שעון" — read the analog clock (whole / half / quarter hours).
// 2) "התאמת שעונים" — match digital ↔ analog clock faces.
// 3) "כוונו את השעון" — drag the hands (or tap the quick buttons) to set a
//    requested time. Per-mode best stars are persisted via useLearning.

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { starsFor, medalFor, MEDAL_HEBREW, MEDAL_EMOJI, shuffle } from "../../lib/quiz";
import type { LearningState } from "../../hooks/useLearning";
import type { ClockMode } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

const ROUND = 6;
const HOUR_NAMES = ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר", "אחת-עשרה", "שתים-עשרה"];

type ClockMinutes = 0 | 15 | 30 | 45;
type ReadLevel = "full" | "half" | "quarter";

interface ClockTime {
  hour: number;          // 1..12
  minutes: ClockMinutes;
}

const LEVEL_MINUTES: Record<ReadLevel, ClockMinutes[]> = {
  full: [0],
  half: [0, 30],
  quarter: [0, 15, 30, 45],
};

function timeName(t: ClockTime): string {
  switch (t.minutes) {
    case 0: return HOUR_NAMES[t.hour];
    case 15: return `${HOUR_NAMES[t.hour]} ורבע`;
    case 30: return `${HOUR_NAMES[t.hour]} וחצי`;
    case 45: return `רבע ל${HOUR_NAMES[(t.hour % 12) + 1]}`;
  }
}

function digitalOf(t: ClockTime): string {
  return `${t.hour}:${String(t.minutes).padStart(2, "0")}`;
}

function sameTime(a: ClockTime, b: ClockTime): boolean {
  return a.hour === b.hour && a.minutes === b.minutes;
}

/** testid suffix — keeps the original "full"/"half" names for compatibility. */
function minuteSuffix(m: ClockMinutes): string {
  return m === 0 ? "full" : m === 30 ? "half" : m === 15 ? "q15" : "q45";
}

function makeRound(minutesPool: ClockMinutes[], count = ROUND): ClockTime[] {
  const all: ClockTime[] = [];
  for (let h = 1; h <= 12; h++) {
    for (const minutes of minutesPool) all.push({ hour: h, minutes });
  }
  return shuffle(all).slice(0, count);
}

function makeOptions(target: ClockTime, minutesPool: ClockMinutes[]): ClockTime[] {
  const opts: ClockTime[] = [target];
  let guard = 0;
  while (opts.length < 4 && guard++ < 90) {
    const cand: ClockTime = {
      hour: 1 + Math.floor(Math.random() * 12),
      minutes: minutesPool[Math.floor(Math.random() * minutesPool.length)],
    };
    if (!opts.some((o) => sameTime(o, cand))) opts.push(cand);
  }
  return shuffle(opts);
}

// ─── The analog clock face (static or with draggable hands) ──────────────────

interface ClockFaceProps {
  time: ClockTime;
  /** CSS size of the SVG square. */
  size?: string;
  /** Enable dragging the hands (the "set the clock" game). */
  onChange?: (t: ClockTime) => void;
  testid?: string;
}

function ClockFace({ time, size = "min(62vw, 250px)", onChange, testid = "clock-face" }: ClockFaceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<"hour" | "minute" | null>(null);

  const hourAngle = ((time.hour % 12) + time.minutes / 60) * 30 - 90;
  const minuteAngle = time.minutes * 6 - 90;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const svgPoint = (e: React.PointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * 200 - 100,
      ((e.clientY - rect.top) / rect.height) * 200 - 100,
    ];
  };

  const onDown = (e: React.PointerEvent) => {
    if (!onChange || !svgRef.current) return;
    const [x, y] = svgPoint(e);
    const minTip: [number, number] = [Math.cos(rad(minuteAngle)) * 66, Math.sin(rad(minuteAngle)) * 66];
    const hourTip: [number, number] = [Math.cos(rad(hourAngle)) * 44, Math.sin(rad(hourAngle)) * 44];
    const dMin = Math.hypot(x - minTip[0], y - minTip[1]);
    const dHour = Math.hypot(x - hourTip[0], y - hourTip[1]);
    dragging.current = dMin <= dHour ? "minute" : "hour";
    svgRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!onChange || !dragging.current || !svgRef.current) return;
    const [x, y] = svgPoint(e);
    if (Math.hypot(x, y) < 8) return; // too close to the center to read an angle
    const deg = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360; // 0 = 12 o'clock
    if (dragging.current === "minute") {
      const minutes = ((Math.round(deg / 90) % 4) * 15) as ClockMinutes;
      if (minutes !== time.minutes) onChange({ ...time, minutes });
    } else {
      let hour = Math.round(deg / 30) % 12;
      if (hour === 0) hour = 12;
      if (hour !== time.hour) onChange({ ...time, hour });
    }
  };

  const onUp = () => { dragging.current = null; };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      data-testid={testid}
      data-hour={time.hour}
      data-minutes={time.minutes}
      data-half={time.minutes === 30 ? "1" : "0"}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={onChange ? { touchAction: "none", cursor: "grab" } : undefined}
    >
      <circle cx="100" cy="100" r="94" fill="#fff7ed" stroke="#f97316" strokeWidth="8" />
      <circle cx="100" cy="100" r="86" fill="white" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = rad(i * 30 - 60);
        const x = 100 + Math.cos(a) * 72;
        const y = 100 + Math.sin(a) * 72 + 7;
        return (
          <text key={i} x={x} y={y} textAnchor="middle" fontSize="19" fontWeight="900" fill="#7c2d12" fontFamily="Heebo, sans-serif">
            {i + 1}
          </text>
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = rad(i * 30);
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 82} y1={100 + Math.sin(a) * 82}
            x2={100 + Math.cos(a) * 88} y2={100 + Math.sin(a) * 88}
            stroke="#fdba74" strokeWidth="3" strokeLinecap="round"
          />
        );
      })}
      {/* minute hand */}
      <line
        x1="100" y1="100"
        x2={100 + Math.cos(rad(minuteAngle)) * 66}
        y2={100 + Math.sin(rad(minuteAngle)) * 66}
        stroke="#334155" strokeWidth="6" strokeLinecap="round"
      />
      {/* hour hand */}
      <line
        x1="100" y1="100"
        x2={100 + Math.cos(rad(hourAngle)) * 44}
        y2={100 + Math.sin(rad(hourAngle)) * 44}
        stroke="#c2410c" strokeWidth="9" strokeLinecap="round"
      />
      {onChange && (
        <>
          {/* chunky grab knobs so little fingers can catch the hands */}
          <circle
            cx={100 + Math.cos(rad(minuteAngle)) * 66}
            cy={100 + Math.sin(rad(minuteAngle)) * 66}
            r="13" fill="#334155" opacity="0.9"
          />
          <circle
            cx={100 + Math.cos(rad(hourAngle)) * 44}
            cy={100 + Math.sin(rad(hourAngle)) * 44}
            r="13" fill="#c2410c" opacity="0.9"
          />
        </>
      )}
      <circle cx="100" cy="100" r="7" fill="#c2410c" />
    </svg>
  );
}

/** A friendly digital clock display. */
function DigitalClock({ time, big, testid }: { time: ClockTime; big?: boolean; testid?: string }) {
  return (
    <div
      data-testid={testid}
      data-hour={time.hour}
      data-minutes={time.minutes}
      style={{
        direction: "ltr",
        background: "#0f172a",
        color: "#4ade80",
        borderRadius: big ? 18 : 12,
        padding: big ? "10px 26px" : "6px 14px",
        fontFamily: "'Courier New', monospace",
        fontWeight: 900,
        fontSize: big ? 46 : 24,
        letterSpacing: 2,
        boxShadow: "inset 0 0 12px rgba(0,0,0,0.7), 0 6px 16px rgba(15,23,42,0.25)",
        border: "3px solid #334155",
      }}
    >
      {digitalOf(time)}
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function ProgressDots({ total, index }: { total: number; index: number }) {
  return (
    <div style={{ display: "flex", gap: 5, margin: "2px 0 6px" }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < index ? "#22c55e" : i === index ? "#f59e0b" : "#e2e8f0" }} />
      ))}
    </div>
  );
}

function ResultModal({ firstTry, total, onAgain }: { firstTry: number; total: number; onAgain: () => void }) {
  const stars = starsFor(firstTry, total);
  const medal = medalFor(firstTry, total);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(8,15,40,0.55)" }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="rounded-3xl p-8 text-center mx-4"
        style={{ background: "linear-gradient(160deg,#ffffff,#fff7ed)", maxWidth: 360, width: "100%", direction: "rtl" }}
      >
        <div style={{ fontSize: 54 }}>{MEDAL_EMOJI[medal]}</div>
        <div data-testid="clock-result" style={{ fontWeight: 900, fontSize: 24, color: "#0f172a" }}>{MEDAL_HEBREW[medal]}</div>
        <div style={{ fontSize: 30, margin: "6px 0" }}>{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</div>
        <button
          onClick={onAgain}
          style={{ marginTop: 14, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#f97316,#c2410c)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 16, padding: "11px 22px", cursor: "pointer" }}
        >
          🔁 עוד פעם
        </button>
      </motion.div>
    </motion.div>
  );
}

const menuBtn = (gradient: string): React.CSSProperties => ({
  border: "none",
  borderRadius: 18,
  background: gradient,
  color: "white",
  fontFamily: "Heebo, sans-serif",
  fontWeight: 900,
  fontSize: 17,
  padding: "14px 18px",
  cursor: "pointer",
  textAlign: "right",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  boxShadow: "0 6px 18px rgba(15,23,42,0.2)",
});

interface ClockGameProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

type ClockScreen =
  | { kind: "menu" }
  | { kind: "read"; level: ReadLevel }
  | { kind: "match" }
  | { kind: "set" };

export default function ClockGame({ learning, speakHebrew, playSfx }: ClockGameProps) {
  const [screen, setScreen] = useState<ClockScreen>({ kind: "menu" });

  const back = useCallback(() => {
    playSfx("pop");
    setScreen({ kind: "menu" });
  }, [playSfx]);

  const finishMode = useCallback((mode: ClockMode, firstTry: number, total: number) => {
    learning.recordClockModeStars(mode, starsFor(firstTry, total));
  }, [learning]);

  if (screen.kind === "read") {
    return <ReadGame level={screen.level} onFinish={finishMode} onBack={back} speakHebrew={speakHebrew} playSfx={playSfx} />;
  }
  if (screen.kind === "match") {
    return <MatchGame onFinish={finishMode} onBack={back} speakHebrew={speakHebrew} playSfx={playSfx} />;
  }
  if (screen.kind === "set") {
    return <SetGame onFinish={finishMode} onBack={back} speakHebrew={speakHebrew} playSfx={playSfx} />;
  }

  const modeStars = learning.data.clockModeStars ?? {};
  const starsOf = (mode: ClockMode) => {
    const s = modeStars[mode] ?? 0;
    return s > 0 ? ` ${"⭐".repeat(s)}` : "";
  };
  const start = (next: ClockScreen, say: string) => {
    playSfx("pop");
    speakHebrew(say);
    setScreen(next);
  };

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "0 16px", overflowY: "auto" }}>
      <div style={{ fontSize: 44, marginTop: 2 }}>🕒</div>
      <h3 style={{ fontWeight: 900, fontSize: 23, color: "#1a365d", margin: "0 0 2px" }}>מה השעה?</h3>
      <p style={{ fontWeight: 700, fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>בחרו משחק שעון:</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 380, paddingBottom: 22 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: "#9a3412" }}>📖 קוראים שעון</div>
        <button data-testid="clock-level-full" onClick={() => start({ kind: "read", level: "full" }, "מה השעה על השעון?")} style={menuBtn("linear-gradient(135deg,#f97316,#c2410c)")}>
          <span>🐣 שעות עגולות{starsOf("read-full")}</span><span>🕐</span>
        </button>
        <button data-testid="clock-level-half" onClick={() => start({ kind: "read", level: "half" }, "מה השעה על השעון?")} style={menuBtn("linear-gradient(135deg,#ea580c,#9a3412)")}>
          <span>🚀 גם חצאי שעות{starsOf("read-half")}</span><span>🕜</span>
        </button>
        <button data-testid="clock-level-quarter" onClick={() => start({ kind: "read", level: "quarter" }, "מה השעה על השעון?")} style={menuBtn("linear-gradient(135deg,#c2410c,#7c2d12)")}>
          <span>🌟 גם רבעי שעות{starsOf("read-quarter")}</span><span>🕘</span>
        </button>
        <div style={{ fontWeight: 900, fontSize: 14, color: "#9a3412", marginTop: 6 }}>🎮 עוד משחקים</div>
        <button data-testid="clock-mode-match" onClick={() => start({ kind: "match" }, "התאימו בין שעון דיגיטלי לשעון מחוגים!")} style={menuBtn("linear-gradient(135deg,#0ea5e9,#0369a1)")}>
          <span>🔁 התאמת שעונים{starsOf("match")}</span><span>⌚</span>
        </button>
        <button data-testid="clock-mode-set" onClick={() => start({ kind: "set" }, "הזיזו את המחוגים וכוונו את השעון!")} style={menuBtn("linear-gradient(135deg,#8b5cf6,#6d28d9)")}>
          <span>🕹️ כוונו את השעון{starsOf("set")}</span><span>👆</span>
        </button>
      </div>
    </div>
  );
}

// ─── Sub-game shared chrome ──────────────────────────────────────────────────

function GameFrame({ children, onBack, dots }: { children: React.ReactNode; onBack: () => void; dots: { total: number; index: number } }) {
  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "0 14px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 420, justifyContent: "center", position: "relative" }}>
        <button
          data-testid="clock-menu-back"
          onClick={onBack}
          style={{ position: "absolute", right: 0, top: 0, border: "none", borderRadius: 999, background: "rgba(255,255,255,0.92)", boxShadow: "0 3px 10px rgba(0,0,0,0.14)", fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 12.5, padding: "6px 12px", cursor: "pointer", color: "#7c2d12" }}
        >
          🕒 תפריט
        </button>
        <ProgressDots total={dots.total} index={dots.index} />
      </div>
      {children}
    </div>
  );
}

interface SubGameProps {
  onFinish: (mode: ClockMode, firstTry: number, total: number) => void;
  onBack: () => void;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

// ─── Game 1: read the analog clock ───────────────────────────────────────────

function ReadGame({ level, onFinish, onBack, speakHebrew, playSfx }: SubGameProps & { level: ReadLevel }) {
  const minutesPool = LEVEL_MINUTES[level];
  const [round] = useState(() => makeRound(minutesPool));
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [locked, setLocked] = useState(false);

  const target = round[index];
  const options = useMemo(
    () => (target ? makeOptions(target, minutesPool) : []),
    [target, minutesPool]
  );

  const tap = useCallback((t: ClockTime) => {
    if (!target || locked || finished) return;
    if (sameTime(t, target)) {
      const firstTry = attempts === 0;
      playSfx("tada");
      setConfetti((c) => c + 1);
      speakHebrew(`נכון! השעה ${timeName(target)}`);
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setAttempts(0);
        const total = firstTryCount + (firstTry ? 1 : 0);
        if (firstTry) setFirstTryCount(total);
        if (index + 1 >= round.length) {
          setFinished(true);
          onFinish(`read-${level}` as ClockMode, total, round.length);
        } else {
          setIndex((i) => i + 1);
        }
      }, 1200);
    } else {
      playSfx("boing");
      setAttempts((a) => a + 1);
      speakHebrew(attempts >= 1 ? "רמז: הביטו לאן מצביע המחוג הקצר!" : "נסו שוב!");
    }
  }, [target, locked, finished, attempts, index, round.length, firstTryCount, level, onFinish, playSfx, speakHebrew]);

  if (!target) return null;
  const hinted = attempts >= 2;

  return (
    <GameFrame onBack={onBack} dots={{ total: round.length, index }}>
      <div
        data-testid="clock-question"
        onClick={() => speakHebrew("מה השעה על השעון?")}
        style={{ fontWeight: 900, fontSize: 21, color: "#0f172a", cursor: "pointer", marginBottom: 4 }}
      >
        🔊 מה השעה?
      </div>
      <ClockFace time={target} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 400, marginTop: 10, paddingBottom: 18 }}>
        {options.map((t, i) => {
          const isHint = hinted && sameTime(t, target);
          return (
            <button
              key={i}
              data-testid={`clock-opt-${t.hour}-${minuteSuffix(t.minutes)}`}
              onClick={() => tap(t)}
              style={{
                border: isHint ? "3px solid #f97316" : "3px solid rgba(15,23,42,0.08)",
                borderRadius: 18,
                background: "white",
                fontFamily: "Heebo, sans-serif",
                fontWeight: 900,
                fontSize: 19,
                color: "#0f172a",
                padding: "14px 6px",
                cursor: "pointer",
                boxShadow: isHint ? "0 0 20px rgba(249,115,22,0.6)" : "0 6px 16px rgba(15,23,42,0.12)",
                animation: isHint ? "quizPulse 0.85s ease-in-out infinite" : undefined,
              }}
            >
              {timeName(t)}
            </button>
          );
        })}
      </div>
      <ConfettiEffect trigger={confetti} originX={0.5} originY={0.4} />
      <AnimatePresence>
        {finished && <ResultModal firstTry={firstTryCount} total={round.length} onAgain={onBack} />}
      </AnimatePresence>
      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </GameFrame>
  );
}

// ─── Game 2: match digital ↔ analog ──────────────────────────────────────────

interface MatchQuestion {
  target: ClockTime;
  direction: "d2a" | "a2d"; // digital→analog (pick a face) or analog→digital
  options: ClockTime[];
}

function makeMatchRound(): MatchQuestion[] {
  // difficulty ramps: whole hours → halves → quarters
  const levels: ReadLevel[] = ["full", "full", "half", "half", "quarter", "quarter"];
  const used = new Set<string>();
  return levels.map((lvl, i) => {
    const pool = LEVEL_MINUTES[lvl];
    let target: ClockTime;
    let guard = 0;
    do {
      target = {
        hour: 1 + Math.floor(Math.random() * 12),
        minutes: pool[Math.floor(Math.random() * pool.length)],
      };
    } while (used.has(digitalOf(target)) && guard++ < 40);
    used.add(digitalOf(target));
    return { target, direction: i % 2 === 0 ? "d2a" : "a2d", options: makeOptions(target, pool) } as MatchQuestion;
  });
}

function MatchGame({ onFinish, onBack, speakHebrew, playSfx }: SubGameProps) {
  const [round] = useState(makeMatchRound);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [locked, setLocked] = useState(false);

  const q = round[index];

  const tap = useCallback((t: ClockTime) => {
    if (!q || locked || finished) return;
    if (sameTime(t, q.target)) {
      const firstTry = attempts === 0;
      playSfx("tada");
      setConfetti((c) => c + 1);
      speakHebrew(`מעולה! ${digitalOf(q.target)} זה בדיוק ${timeName(q.target)}`);
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setAttempts(0);
        const total = firstTryCount + (firstTry ? 1 : 0);
        if (firstTry) setFirstTryCount(total);
        if (index + 1 >= round.length) {
          setFinished(true);
          onFinish("match", total, round.length);
        } else {
          setIndex((i) => i + 1);
        }
      }, 1300);
    } else {
      playSfx("boing");
      setAttempts((a) => a + 1);
      speakHebrew("כמעט! נסו שוב");
    }
  }, [q, locked, finished, attempts, index, round.length, firstTryCount, onFinish, playSfx, speakHebrew]);

  if (!q) return null;
  const hinted = attempts >= 2;

  return (
    <GameFrame onBack={onBack} dots={{ total: round.length, index }}>
      <div
        data-testid="clock-question"
        onClick={() => speakHebrew(q.direction === "d2a" ? `מצאו את השעון שמראה ${timeName(q.target)}` : "איזו שעה דיגיטלית מתאימה לשעון?")}
        style={{ fontWeight: 900, fontSize: 18.5, color: "#0f172a", cursor: "pointer", margin: "2px 0 8px", textAlign: "center" }}
      >
        {q.direction === "d2a" ? "🔊 מצאו את שעון המחוגים המתאים:" : "🔊 איזו שעה דיגיטלית מתאימה?"}
      </div>

      {q.direction === "d2a" ? (
        <DigitalClock time={q.target} big testid="clock-match-target" />
      ) : (
        <ClockFace time={q.target} size="min(48vw, 200px)" testid="clock-match-target" />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 420, marginTop: 12, paddingBottom: 18 }}>
        {q.options.map((t, i) => {
          const isHint = hinted && sameTime(t, q.target);
          return (
            <button
              key={i}
              data-testid={`clock-match-opt-${i}`}
              data-hour={t.hour}
              data-minutes={t.minutes}
              onClick={() => tap(t)}
              style={{
                border: isHint ? "3px solid #0ea5e9" : "3px solid rgba(15,23,42,0.08)",
                borderRadius: 18,
                background: "white",
                cursor: "pointer",
                padding: q.direction === "d2a" ? "8px 4px 4px" : "14px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isHint ? "0 0 20px rgba(14,165,233,0.6)" : "0 6px 16px rgba(15,23,42,0.12)",
                animation: isHint ? "quizPulse 0.85s ease-in-out infinite" : undefined,
              }}
            >
              {q.direction === "d2a" ? (
                <ClockFace time={t} size="min(30vw, 120px)" testid={`clock-match-face-${i}`} />
              ) : (
                <DigitalClock time={t} />
              )}
            </button>
          );
        })}
      </div>
      <ConfettiEffect trigger={confetti} originX={0.5} originY={0.4} />
      <AnimatePresence>
        {finished && <ResultModal firstTry={firstTryCount} total={round.length} onAgain={onBack} />}
      </AnimatePresence>
      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </GameFrame>
  );
}

// ─── Game 3: set the clock (drag the hands) ──────────────────────────────────

const SET_ROUND = 5;

function makeSetRound(): ClockTime[] {
  // ramp: whole, whole, half, quarter, quarter-to
  const minutes: ClockMinutes[] = [0, 0, 30, 15, 45];
  const hours = shuffle(Array.from({ length: 12 }, (_, i) => i + 1)).slice(0, SET_ROUND);
  return minutes.map((m, i) => ({ hour: hours[i], minutes: m }));
}

function SetGame({ onFinish, onBack, speakHebrew, playSfx }: SubGameProps) {
  const [round] = useState(makeSetRound);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<ClockTime>({ hour: 12, minutes: 0 });
  const [attempts, setAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [locked, setLocked] = useState(false);

  const target = round[index];

  const check = useCallback(() => {
    if (!target || locked || finished) return;
    if (sameTime(current, target)) {
      const firstTry = attempts === 0;
      playSfx("tada");
      setConfetti((c) => c + 1);
      speakHebrew(`מדהים! כיוונתם את השעון ל${timeName(target)}`);
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setAttempts(0);
        setCurrent({ hour: 12, minutes: 0 });
        const total = firstTryCount + (firstTry ? 1 : 0);
        if (firstTry) setFirstTryCount(total);
        if (index + 1 >= round.length) {
          setFinished(true);
          onFinish("set", total, round.length);
        } else {
          setIndex((i) => i + 1);
          speakHebrew(`עכשיו כוונו את השעון ל${timeName(round[index + 1])}`);
        }
      }, 1400);
    } else {
      playSfx("boing");
      setAttempts((a) => a + 1);
      const hourOk = current.hour === target.hour;
      speakHebrew(hourOk ? "המחוג הקצר נכון! עכשיו סובבו את המחוג הארוך" : "הביטו במחוג הקצר — לאיזה מספר הוא צריך להצביע?");
    }
  }, [target, current, locked, finished, attempts, index, round, firstTryCount, onFinish, playSfx, speakHebrew]);

  const plusQuarter = useCallback(() => {
    playSfx("pop");
    setCurrent((c) => ({ ...c, minutes: ((c.minutes + 15) % 60) as ClockMinutes }));
  }, [playSfx]);

  const plusHour = useCallback(() => {
    playSfx("pop");
    setCurrent((c) => ({ ...c, hour: (c.hour % 12) + 1 }));
  }, [playSfx]);

  if (!target) return null;

  const quickBtn: React.CSSProperties = {
    border: "none",
    borderRadius: 999,
    background: "white",
    boxShadow: "0 4px 12px rgba(15,23,42,0.15)",
    fontFamily: "Heebo, sans-serif",
    fontWeight: 900,
    fontSize: 14,
    color: "#4c1d95",
    padding: "10px 16px",
    cursor: "pointer",
  };

  return (
    <GameFrame onBack={onBack} dots={{ total: round.length, index }}>
      <div
        data-testid="clock-set-target"
        data-hour={target.hour}
        data-minutes={target.minutes}
        onClick={() => speakHebrew(`כוונו את השעון ל${timeName(target)}`)}
        style={{ fontWeight: 900, fontSize: 19, color: "#0f172a", cursor: "pointer", margin: "2px 0 6px", textAlign: "center" }}
      >
        🔊 כוונו את השעון ל: <span style={{ color: "#6d28d9" }}>{timeName(target)}</span>
      </div>
      <DigitalClock time={target} />
      <div style={{ margin: "8px 0 2px" }}>
        <ClockFace time={current} onChange={setCurrent} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        👆 גררו את המחוגים או השתמשו בכפתורים
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button data-testid="clock-set-plus-hour" onClick={plusHour} style={quickBtn}>🕐 שעה +</button>
        <button data-testid="clock-set-plus-quarter" onClick={plusQuarter} style={quickBtn}>⏱️ רבע שעה +</button>
        <button
          data-testid="clock-set-check"
          onClick={check}
          style={{
            border: "none",
            borderRadius: 999,
            background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
            color: "white",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 900,
            fontSize: 16,
            padding: "10px 26px",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(109,40,217,0.4)",
          }}
        >
          ✅ בדקו אותי!
        </button>
      </div>
      <div style={{ height: 18 }} />
      <ConfettiEffect trigger={confetti} originX={0.5} originY={0.4} />
      <AnimatePresence>
        {finished && <ResultModal firstTry={firstTryCount} total={round.length} onAgain={onBack} />}
      </AnimatePresence>
    </GameFrame>
  );
}
