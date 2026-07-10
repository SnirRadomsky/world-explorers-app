// חשבון בכיף — counting, addition and subtraction with visual objects.
// 8 questions per round, 4 big answer buttons, everything spoken. After two
// misses the right answer pulses; the round ends with stars, like the quiz.

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  makeRound,
  MATH_LEVELS,
  type MathLevel,
  type MathQuestion,
} from "../../lib/mathQuiz";
import { starsFor, medalFor, MEDAL_HEBREW, MEDAL_EMOJI } from "../../lib/quiz";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

const PRAISES = ["כל הכבוד!", "מעולה!", "בדיוק!", "יש! נכון!", "אלופים!"];

interface MathGameProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

/** Rows of emoji for the visual part of a question. */
function EmojiGroup({ emoji, count, crossed }: { emoji: string; count: number; crossed?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 300 }}>
      {Array.from({ length: count }, (_, i) => {
        const isCrossed = crossed !== undefined && i >= count - crossed;
        return (
          <span
            key={i}
            style={{
              fontSize: count > 6 ? 30 : 38,
              lineHeight: 1.1,
              position: "relative",
              opacity: isCrossed ? 0.35 : 1,
              filter: isCrossed ? "grayscale(0.8)" : "none",
            }}
          >
            {emoji}
            {isCrossed && (
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: count > 6 ? 26 : 32 }}>
                ❌
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function MathGame({ learning, speakHebrew, playSfx }: MathGameProps) {
  const [level, setLevel] = useState<MathLevel | null>(null);
  const [round, setRound] = useState<MathQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  const q = round[index];

  const start = useCallback((lvl: MathLevel) => {
    const r = makeRound(lvl);
    setLevel(lvl);
    setRound(r);
    setIndex(0);
    setAttempts(0);
    setFirstTryCount(0);
    setFinished(false);
    setFeedback(null);
    setLocked(false);
    speakHebrew(r[0].promptHebrew);
  }, [speakHebrew]);

  const answer = useCallback((n: number) => {
    if (!q || locked || finished) return;
    if (n === q.answer) {
      const firstTry = attempts === 0;
      playSfx("tada");
      setConfetti((c) => c + 1);
      const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      setFeedback(praise);
      speakHebrew(praise);
      setLocked(true);
      setTimeout(() => {
        setFeedback(null);
        setLocked(false);
        setAttempts(0);
        if (index + 1 >= round.length) {
          const total = firstTryCount + (firstTry ? 1 : 0);
          setFirstTryCount(total);
          setFinished(true);
          const stars = starsFor(total, round.length);
          learning.recordMathStars(level!, stars);
          const medal = medalFor(total, round.length);
          playSfx(medal === "none" ? "chime" : "tada");
          speakHebrew(medal === "none" ? "כל הכבוד שניסיתם! בואו שוב" : `מדהים! קיבלתם ${MEDAL_HEBREW[medal]}`);
        } else {
          if (firstTry) setFirstTryCount((c) => c + 1);
          setIndex((i) => i + 1);
          speakHebrew(round[index + 1].promptHebrew);
        }
      }, 1100);
    } else {
      playSfx("boing");
      setShakeKey((k) => k + 1);
      setAttempts((a) => a + 1);
      const oops = attempts >= 1 ? "הביטו במספר שמהבהב!" : "אופס, נסו שוב!";
      setFeedback(oops);
      speakHebrew(oops);
      setTimeout(() => setFeedback(null), 1300);
    }
  }, [q, locked, finished, attempts, index, round, firstTryCount, level, learning, playSfx, speakHebrew]);

  const hinted = attempts >= 2;
  const stars = useMemo(() => starsFor(firstTryCount, round.length || 8), [firstTryCount, round.length]);
  const medal = useMemo(() => medalFor(firstTryCount, round.length || 8), [firstTryCount, round.length]);

  // ── level picker ──
  if (!level) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-5" style={{ direction: "rtl" }}>
        <div style={{ fontSize: 52 }}>➕</div>
        <h3 style={{ fontWeight: 900, fontSize: 24, color: "#1a365d", margin: 0 }}>חשבון בכיף</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
          {MATH_LEVELS.map((l) => (
            <button
              key={l.id}
              data-testid={`math-level-${l.id}`}
              onClick={() => {
                playSfx("pop");
                start(l.id);
              }}
              style={{
                border: "none",
                borderRadius: 18,
                background: "linear-gradient(135deg,#22c55e,#15803d)",
                color: "white",
                fontFamily: "Heebo, sans-serif",
                padding: "16px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 8px 20px rgba(34,197,94,0.35)",
              }}
            >
              <span style={{ textAlign: "right" }}>
                <span style={{ fontWeight: 900, fontSize: 21, display: "block" }}>{l.nameHebrew}</span>
                <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.92 }}>{l.descHebrew}</span>
              </span>
              <span style={{ fontSize: 34 }}>{l.emoji}</span>
              {(learning.data.mathStars[l.id] ?? 0) > 0 && (
                <span style={{ fontSize: 14 }}>{"⭐".repeat(learning.data.mathStars[l.id]!)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "4px 14px", overflowY: "auto" }}>
      {/* progress dots */}
      <div style={{ display: "flex", gap: 5, margin: "2px 0 8px" }}>
        {round.map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < index ? "#22c55e" : i === index ? "#f59e0b" : "#e2e8f0" }} />
        ))}
      </div>

      {/* question */}
      <motion.div
        key={`${index}-${shakeKey}`}
        initial={shakeKey > 0 ? { x: 0 } : { y: -16, opacity: 0 }}
        animate={shakeKey > 0 ? { x: [0, -10, 10, -6, 6, 0] } : { y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "white",
          borderRadius: 20,
          boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
          padding: "14px 18px",
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        <div
          data-testid="math-question"
          data-answer={q.answer}
          onClick={() => speakHebrew(q.promptHebrew)}
          style={{ fontWeight: 900, fontSize: 21, color: "#0f172a", cursor: "pointer", marginBottom: 10 }}
        >
          🔊 {q.promptHebrew}
        </div>
        {q.level === "count" && <EmojiGroup emoji={q.emoji} count={q.a} />}
        {q.level === "add" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <EmojiGroup emoji={q.emoji} count={q.a} />
            <span style={{ fontWeight: 900, fontSize: 34, color: "#22c55e" }}>+</span>
            <EmojiGroup emoji={q.emoji} count={q.b} />
          </div>
        )}
        {q.level === "sub" && <EmojiGroup emoji={q.emoji} count={q.a} crossed={q.b} />}
      </motion.div>

      {/* options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 420, marginTop: 14 }}>
        {q.options.map((n) => (
          <button
            key={n}
            data-testid={`math-opt-${n}`}
            onClick={() => answer(n)}
            style={{
              border: hinted && n === q.answer ? "3px solid #f59e0b" : "3px solid rgba(15,23,42,0.08)",
              borderRadius: 20,
              background: "white",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 900,
              fontSize: 42,
              color: "#0f172a",
              padding: "16px 8px",
              cursor: "pointer",
              boxShadow: hinted && n === q.answer ? "0 0 22px rgba(245,158,11,0.7)" : "0 6px 16px rgba(15,23,42,0.12)",
              animation: hinted && n === q.answer ? "quizPulse 0.85s ease-in-out infinite" : undefined,
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback + shakeKey}
            initial={{ scale: 0.7, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            style={{
              marginTop: 14,
              background: "rgba(15,23,42,0.85)",
              color: "white",
              borderRadius: 999,
              padding: "8px 22px",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfettiEffect trigger={confetti} originX={0.5} originY={0.4} />

      {/* round end */}
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
              style={{ background: "linear-gradient(160deg,#ffffff,#f0fdf4)", maxWidth: 360, width: "100%", direction: "rtl" }}
            >
              <div style={{ fontSize: 54 }}>{MEDAL_EMOJI[medal]}</div>
              <div data-testid="math-result" style={{ fontWeight: 900, fontSize: 24, color: "#0f172a" }}>
                {MEDAL_HEBREW[medal]}
              </div>
              <div style={{ fontSize: 30, margin: "6px 0" }}>
                {"⭐".repeat(stars)}{"☆".repeat(3 - stars)}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#475569" }}>
                {firstTryCount} מתוך {round.length} בניסיון ראשון
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
                <button
                  onClick={() => start(level)}
                  style={{ border: "none", borderRadius: 14, background: "linear-gradient(135deg,#22c55e,#15803d)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 16, padding: "11px 20px", cursor: "pointer" }}
                >
                  🔁 עוד סיבוב
                </button>
                <button
                  onClick={() => setLevel(null)}
                  style={{ border: "none", borderRadius: 14, background: "#e2e8f0", color: "#334155", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 16, padding: "11px 20px", cursor: "pointer" }}
                >
                  רמה אחרת
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </div>
  );
}
