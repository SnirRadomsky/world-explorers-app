// משחק הזיכרון — 12 flip-cards (6 pairs) in three themes. CSS 3D flip,
// gentle for little hands: no timer, mismatches simply flip back.

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shuffle } from "../../lib/quiz";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";

const THEMES: { id: string; nameHebrew: string; emoji: string; pool: string[] }[] = [
  { id: "animals", nameHebrew: "חיות העולם", emoji: "🦁", pool: ["🦁", "🐼", "🦒", "🐘", "🦘", "🐫", "🦜", "🐻‍❄️"] },
  { id: "ocean",   nameHebrew: "חיות הים",   emoji: "🐠", pool: ["🐠", "🐬", "🐢", "🐙", "🦀", "🐧", "🦈", "🪼"] },
  { id: "world",   nameHebrew: "העולם",      emoji: "🌍", pool: ["🗼", "🗽", "🗿", "🕌", "⛰️", "🏛️", "🚀", "🌋"] },
];

interface Card {
  key: number;
  emoji: string;
  open: boolean;
  matched: boolean;
}

interface MemoryGameProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function MemoryGame({ learning, speakHebrew, playSfx }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [openKeys, setOpenKeys] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [busy, setBusy] = useState(false);

  const start = useCallback((themeId: string) => {
    playSfx("pop");
    const theme = THEMES.find((t) => t.id === themeId)!;
    const chosen = shuffle(theme.pool).slice(0, 6);
    const deck = shuffle([...chosen, ...chosen]).map((emoji, i) => ({
      key: i,
      emoji,
      open: false,
      matched: false,
    }));
    setCards(deck);
    setOpenKeys([]);
    setMoves(0);
    setWon(false);
    speakHebrew("מצאו את הזוגות! הפכו שני קלפים");
  }, [playSfx, speakHebrew]);

  const flip = useCallback((key: number) => {
    if (!cards || busy || won) return;
    const card = cards.find((c) => c.key === key);
    if (!card || card.open || card.matched) return;

    playSfx("pop");
    const nowOpen = [...openKeys, key];
    setCards(cards.map((c) => (c.key === key ? { ...c, open: true } : c)));
    setOpenKeys(nowOpen);

    if (nowOpen.length === 2) {
      setMoves((m) => m + 1);
      const first = cards.find((c) => c.key === nowOpen[0])!;
      const second = cards.find((c) => c.key === key)!;
      const isMatch = first.emoji === second.emoji;
      setBusy(true);
      setTimeout(() => {
        setCards((prev) => {
          if (!prev) return prev;
          const next = prev.map((c) =>
            nowOpen.includes(c.key)
              ? { ...c, open: isMatch, matched: isMatch || c.matched }
              : c
          );
          if (isMatch && next.every((c) => c.matched)) {
            setWon(true);
            setConfetti((cf) => cf + 1);
            learning.recordMemoryWin();
            playSfx("tada");
            speakHebrew("ניצחתם! מצאתם את כל הזוגות!");
          }
          return next;
        });
        if (isMatch) {
          playSfx("chime");
        }
        setOpenKeys([]);
        setBusy(false);
      }, isMatch ? 350 : 900);
    }
  }, [cards, busy, won, openKeys, learning, playSfx, speakHebrew]);

  if (!cards) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-5" style={{ direction: "rtl" }}>
        <div style={{ fontSize: 52 }}>🃏</div>
        <h3 style={{ fontWeight: 900, fontSize: 24, color: "#1a365d", margin: 0 }}>משחק הזיכרון</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              data-testid={`memory-theme-${t.id}`}
              onClick={() => start(t.id)}
              style={{
                border: "none",
                borderRadius: 18,
                background: "linear-gradient(135deg,#ec4899,#9d174d)",
                color: "white",
                fontFamily: "Heebo, sans-serif",
                fontWeight: 900,
                fontSize: 19,
                padding: "15px 20px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                boxShadow: "0 8px 20px rgba(236,72,153,0.35)",
              }}
            >
              <span>{t.nameHebrew}</span>
              <span style={{ fontSize: 28 }}>{t.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center" style={{ direction: "rtl", padding: "0 14px", overflowY: "auto" }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: "#64748b", margin: "2px 0 8px" }} data-testid="memory-moves">
        🃏 צעדים: {moves}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%", maxWidth: 380 }}>
        {cards.map((c) => (
          <button
            key={c.key}
            data-testid={`memory-card-${c.key}`}
            aria-pressed={c.open || c.matched}
            onClick={() => flip(c.key)}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              perspective: 500,
              height: 92,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                transformStyle: "preserve-3d",
                transition: "transform 0.4s ease",
                transform: c.open || c.matched ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* back */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  background: "linear-gradient(135deg,#f472b6,#be185d)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  backfaceVisibility: "hidden",
                  boxShadow: "0 5px 14px rgba(15,23,42,0.18)",
                }}
              >
                ❔
              </div>
              {/* face */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  background: c.matched ? "#fdf2f8" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 42,
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  boxShadow: c.matched ? "0 0 16px rgba(236,72,153,0.5)" : "0 5px 14px rgba(15,23,42,0.18)",
                }}
              >
                {c.emoji}
              </div>
            </div>
          </button>
        ))}
      </div>

      <ConfettiEffect trigger={confetti} originX={0.5} originY={0.4} />

      <AnimatePresence>
        {won && (
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
              style={{ background: "linear-gradient(160deg,#ffffff,#fdf2f8)", maxWidth: 360, width: "100%", direction: "rtl" }}
            >
              <div style={{ fontSize: 54 }}>🏆</div>
              <div data-testid="memory-result" style={{ fontWeight: 900, fontSize: 24, color: "#0f172a" }}>
                ניצחתם ב-{moves} צעדים!
              </div>
              <button
                onClick={() => setCards(null)}
                style={{ marginTop: 14, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#ec4899,#9d174d)", color: "white", fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 16, padding: "11px 22px", cursor: "pointer" }}
              >
                🔁 משחק חדש
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
