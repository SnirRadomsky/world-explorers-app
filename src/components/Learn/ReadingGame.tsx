// מתחילים לקרוא — the child READS a big pointed word (no auto-voice!) and
// taps the matching picture out of four. Correct → the word is spoken and
// saved to "words I read". Two misses → the right picture pulses.

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { READING_WORDS, READING_WORD_BY_ID } from "../../data/readingWords";
import { pickOptions } from "../../lib/choiceQuiz";
import { shuffle, starsFor, medalFor, MEDAL_HEBREW, MEDAL_EMOJI } from "../../lib/quiz";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

const ROUND = 8;

interface ReadingGameProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

function newGame(): { targets: string[]; options: Record<string, string[]> } {
  const allIds = READING_WORDS.map((w) => w.id);
  const targets = shuffle(allIds).slice(0, ROUND);
  const options = Object.fromEntries(targets.map((t) => [t, pickOptions(allIds, t, 4)]));
  return { targets, options };
}

export default function ReadingGame({ learning, speakHebrew, playSfx }: ReadingGameProps) {
  const [game, setGame] = useState(newGame);
  const targets = game.targets;
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [locked, setLocked] = useState(false);

  const targetId = targets[index];
  const word = READING_WORD_BY_ID.get(targetId);
  const options = useMemo(() => game.options[targetId] ?? [], [game.options, targetId]);

  const restart = useCallback(() => {
    setGame(newGame());
    setIndex(0);
    setAttempts(0);
    setFirstTryCount(0);
    setFinished(false);
    setLocked(false);
  }, []);

  const tap = useCallback((id: string) => {
    if (!word || locked || finished) return;
    if (id === targetId) {
      const firstTry = attempts === 0;
      playSfx("tada");
      setConfetti((c) => c + 1);
      learning.markWordRead(targetId);
      speakHebrew(`נכון! ${word.plain}!`);
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setAttempts(0);
        if (firstTry) setFirstTryCount((c) => c + 1);
        if (index + 1 >= targets.length) {
          setFinished(true);
          const total = firstTryCount + (firstTry ? 1 : 0);
          const medal = medalFor(total, targets.length);
          playSfx(medal === "none" ? "chime" : "tada");
          speakHebrew(medal === "none" ? "כל הכבוד שקראתם! בואו נתאמן שוב" : `אתם קוראים מצוין! ${MEDAL_HEBREW[medal]}`);
        } else {
          setIndex((i) => i + 1);
        }
      }, 1200);
    } else {
      playSfx("boing");
      setShakeKey((k) => k + 1);
      setAttempts((a) => a + 1);
      speakHebrew(attempts >= 1 ? "הביטו בתמונה שמהבהבת!" : "נסו לקרוא שוב, לאט לאט");
    }
  }, [word, locked, finished, targetId, attempts, index, targets.length, firstTryCount, learning, playSfx, speakHebrew]);

  if (!word) return null;
  const hinted = attempts >= 2;
  const stars = starsFor(firstTryCount, targets.length);
  const medal = medalFor(firstTryCount, targets.length);

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "2px 14px", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 5, margin: "2px 0 8px" }}>
        {targets.map((_, i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < index ? "#22c55e" : i === index ? "#f59e0b" : "#e2e8f0" }} />
        ))}
      </div>

      <div style={{ fontWeight: 800, fontSize: 14, color: "#64748b" }}>קראו את המילה ומצאו את התמונה:</div>

      {/* THE WORD — the child reads it, no auto voice */}
      <motion.div
        key={`${index}-${shakeKey}`}
        initial={shakeKey > 0 ? { x: 0 } : { scale: 0.85, opacity: 0 }}
        animate={shakeKey > 0 ? { x: [0, -10, 10, -6, 6, 0] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        data-testid="reading-word"
        data-word-id={targetId}
        style={{
          background: "white",
          borderRadius: 24,
          boxShadow: "0 10px 28px rgba(15,23,42,0.14)",
          padding: "18px 34px",
          margin: "8px 0 4px",
          fontWeight: 900,
          fontSize: "clamp(46px, 14vw, 68px)",
          color: "#4c1d95",
          lineHeight: 1.35,
        }}
      >
        {word.display}
      </motion.div>

      {/* picture options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 400, marginTop: 12 }}>
        {options.map((id) => {
          const w = READING_WORD_BY_ID.get(id)!;
          const isHint = hinted && id === targetId;
          return (
            <button
              key={id}
              data-testid={`reading-opt-${id}`}
              onClick={() => tap(id)}
              style={{
                border: isHint ? "3px solid #a855f7" : "3px solid rgba(15,23,42,0.08)",
                borderRadius: 22,
                background: "white",
                padding: "18px 8px",
                cursor: "pointer",
                fontSize: 52,
                lineHeight: 1,
                boxShadow: isHint ? "0 0 22px rgba(168,85,247,0.65)" : "0 6px 16px rgba(15,23,42,0.12)",
                animation: isHint ? "quizPulse 0.85s ease-in-out infinite" : undefined,
              }}
            >
              {w.emoji}
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
              style={{ background: "linear-gradient(160deg,#ffffff,#faf5ff)", maxWidth: 360, width: "100%", direction: "rtl" }}
            >
              <div style={{ fontSize: 54 }}>{MEDAL_EMOJI[medal]}</div>
              <div data-testid="reading-result" style={{ fontWeight: 900, fontSize: 24, color: "#0f172a" }}>
                {MEDAL_HEBREW[medal]}
              </div>
              <div style={{ fontSize: 30, margin: "6px 0" }}>
                {"⭐".repeat(stars)}{"☆".repeat(3 - stars)}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#475569" }}>
                קראתם נכון {firstTryCount} מתוך {targets.length} מילים בניסיון ראשון
              </div>
              <button
                onClick={restart}
                style={{ marginTop: 16, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#a855f7,#6d28d9)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 16, padding: "11px 22px", cursor: "pointer" }}
              >
                🔁 מילים חדשות
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </div>
  );
}
