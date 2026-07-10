// מה השעה? — a friendly analog clock (SVG) teaching whole and half hours.
// 6 questions, 4 spoken text answers, stars at the end.

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { starsFor, medalFor, MEDAL_HEBREW, MEDAL_EMOJI, shuffle } from "../../lib/quiz";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

const ROUND = 6;
const HOUR_NAMES = ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר", "אחת-עשרה", "שתים-עשרה"];

interface ClockTime {
  hour: number;      // 1..12
  half: boolean;     // :30
}

function timeName(t: ClockTime): string {
  return t.half ? `${HOUR_NAMES[t.hour]} וחצי` : HOUR_NAMES[t.hour];
}

function sameTime(a: ClockTime, b: ClockTime): boolean {
  return a.hour === b.hour && a.half === b.half;
}

function makeRound(withHalves: boolean): ClockTime[] {
  const all: ClockTime[] = [];
  for (let h = 1; h <= 12; h++) {
    all.push({ hour: h, half: false });
    if (withHalves) all.push({ hour: h, half: true });
  }
  return shuffle(all).slice(0, ROUND);
}

function makeOptions(target: ClockTime, withHalves: boolean): ClockTime[] {
  const opts: ClockTime[] = [target];
  let guard = 0;
  while (opts.length < 4 && guard++ < 60) {
    const cand: ClockTime = {
      hour: 1 + Math.floor(Math.random() * 12),
      half: withHalves ? Math.random() > 0.5 : false,
    };
    if (!opts.some((o) => sameTime(o, cand))) opts.push(cand);
  }
  return shuffle(opts);
}

/** The analog clock face. */
function ClockFace({ time }: { time: ClockTime }) {
  const hourAngle = ((time.hour % 12) + (time.half ? 0.5 : 0)) * 30 - 90;
  const minuteAngle = (time.half ? 180 : 0) - 90;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  return (
    <svg viewBox="0 0 200 200" width="min(62vw, 250px)" height="min(62vw, 250px)" data-testid="clock-face" data-hour={time.hour} data-half={time.half ? "1" : "0"}>
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
      <circle cx="100" cy="100" r="7" fill="#c2410c" />
    </svg>
  );
}

interface ClockGameProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function ClockGame({ learning, speakHebrew, playSfx }: ClockGameProps) {
  const [withHalves, setWithHalves] = useState<boolean | null>(null);
  const [round, setRound] = useState<ClockTime[]>([]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [locked, setLocked] = useState(false);

  const target = round[index];
  const options = useMemo(
    () => (target ? makeOptions(target, withHalves ?? false) : []),
    [target, withHalves]
  );

  const start = useCallback((halves: boolean) => {
    playSfx("pop");
    setWithHalves(halves);
    setRound(makeRound(halves));
    setIndex(0);
    setAttempts(0);
    setFirstTryCount(0);
    setFinished(false);
    speakHebrew("מה השעה על השעון?");
  }, [playSfx, speakHebrew]);

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
        if (firstTry) setFirstTryCount((c) => c + 1);
        if (index + 1 >= round.length) {
          setFinished(true);
          const total = firstTryCount + (firstTry ? 1 : 0);
          const stars = starsFor(total, round.length);
          learning.recordClockStars(stars);
        } else {
          setIndex((i) => i + 1);
        }
      }, 1200);
    } else {
      playSfx("boing");
      setAttempts((a) => a + 1);
      speakHebrew(attempts >= 1 ? "רמז: הביטו לאן מצביע המחוג הקצר!" : "נסו שוב!");
    }
  }, [target, locked, finished, attempts, index, round.length, firstTryCount, learning, playSfx, speakHebrew]);

  if (withHalves === null) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-5" style={{ direction: "rtl" }}>
        <div style={{ fontSize: 52 }}>🕒</div>
        <h3 style={{ fontWeight: 900, fontSize: 24, color: "#1a365d", margin: 0 }}>מה השעה?</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
          <button
            data-testid="clock-level-full"
            onClick={() => start(false)}
            style={{ border: "none", borderRadius: 18, background: "linear-gradient(135deg,#f97316,#c2410c)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 19, padding: "16px 20px", cursor: "pointer" }}
          >
            🐣 שעות עגולות
          </button>
          <button
            data-testid="clock-level-half"
            onClick={() => start(true)}
            style={{ border: "none", borderRadius: 18, background: "linear-gradient(135deg,#ea580c,#9a3412)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 19, padding: "16px 20px", cursor: "pointer" }}
          >
            🚀 גם חצאי שעות
          </button>
        </div>
      </div>
    );
  }

  if (!target) return null;
  const hinted = attempts >= 2;
  const stars = starsFor(firstTryCount, round.length);
  const medal = medalFor(firstTryCount, round.length);

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "0 14px", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 5, margin: "2px 0 6px" }}>
        {round.map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < index ? "#22c55e" : i === index ? "#f59e0b" : "#e2e8f0" }} />
        ))}
      </div>
      <div
        data-testid="clock-question"
        onClick={() => speakHebrew("מה השעה על השעון?")}
        style={{ fontWeight: 900, fontSize: 21, color: "#0f172a", cursor: "pointer", marginBottom: 4 }}
      >
        🔊 מה השעה?
      </div>
      <ClockFace time={target} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 400, marginTop: 10 }}>
        {options.map((t, i) => {
          const isHint = hinted && sameTime(t, target);
          return (
            <button
              key={i}
              data-testid={`clock-opt-${t.hour}-${t.half ? "half" : "full"}`}
              onClick={() => tap(t)}
              style={{
                border: isHint ? "3px solid #f97316" : "3px solid rgba(15,23,42,0.08)",
                borderRadius: 18,
                background: "white",
                fontFamily: "Heebo, sans-serif",
                fontWeight: 900,
                fontSize: 20,
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
        {finished && (
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
                onClick={() => setWithHalves(null)}
                style={{ marginTop: 14, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#f97316,#c2410c)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 16, padding: "11px 22px", cursor: "pointer" }}
              >
                🔁 עוד פעם
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </div>
  );
}
