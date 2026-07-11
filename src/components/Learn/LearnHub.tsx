// בית הספר הקטן — the learning hub: seven mini-games (math, letters, reading,
// clock, memory, drawing, music) behind one colorful menu. Ages 5–10, spoken.

import { useState } from "react";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import { TOTAL_LETTERS } from "../../data/hebrewLetters";
import { TOTAL_READING_WORDS } from "../../data/readingWords";
import MathGame from "./MathGame";
import LettersBoard from "./LettersBoard";
import ReadingGame from "./ReadingGame";
import ClockGame from "./ClockGame";
import MemoryGame from "./MemoryGame";
import DrawingPad from "./DrawingPad";
import MusicBox from "./MusicBox";
import { TOTAL_SONGS } from "../../data/songs";

export type LearnGameId = "math" | "letters" | "reading" | "clock" | "memory" | "drawing" | "music";

interface LearnHubProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function LearnHub({ learning, speakHebrew, playSfx }: LearnHubProps) {
  const [game, setGame] = useState<LearnGameId | null>(null);
  const d = learning.data;
  const mathStars = (d.mathStars.count ?? 0) + (d.mathStars.add ?? 0) + (d.mathStars.sub ?? 0);
  const clockStars = Object.values(d.clockModeStars ?? {}).reduce((a, b) => a + (b ?? 0), 0);

  const GAMES: {
    id: LearnGameId; emoji: string; label: string; sub: string; gradient: string; say: string;
  }[] = [
    { id: "math",    emoji: "➕", label: "חשבון בכיף",     sub: `${mathStars} כוכבים מתוך 9`,                              gradient: "linear-gradient(135deg,#22c55e,#15803d)", say: "בואו נספור ונחשב!" },
    { id: "letters", emoji: "🔤", label: "ארץ האותיות",    sub: `הכרתם ${learning.lettersHeard.size} מתוך ${TOTAL_LETTERS} אותיות`, gradient: "linear-gradient(135deg,#3b82f6,#1e40af)", say: "בואו נכיר את האותיות והניקוד!" },
    { id: "reading", emoji: "📖", label: "מתחילים לקרוא",  sub: `קראתם ${learning.wordsRead.size} מתוך ${TOTAL_READING_WORDS} מילים`, gradient: "linear-gradient(135deg,#a855f7,#6d28d9)", say: "בואו נקרא מילים ראשונות!" },
    { id: "clock",   emoji: "🕒", label: "מה השעה?",       sub: clockStars > 0 ? `${clockStars} כוכבים מתוך 15 · 5 משחקים` : "5 משחקי שעון!", gradient: "linear-gradient(135deg,#f97316,#c2410c)", say: "בואו נלמד מה השעה!" },
    { id: "memory",  emoji: "🃏", label: "משחק הזיכרון",   sub: d.memoryWins > 0 ? `ניצחתם ${d.memoryWins} פעמים` : "מצאו את הזוגות!", gradient: "linear-gradient(135deg,#ec4899,#9d174d)", say: "בואו נמצא זוגות!" },
    { id: "drawing", emoji: "🎨", label: "סטודיו לציור",   sub: "מציירים עם האצבע",                                        gradient: "linear-gradient(135deg,#eab308,#a16207)", say: "בואו נצייר!" },
    { id: "music",   emoji: "🎵", label: "תיבת הנגינה",    sub: `${d.songsDone.length} מתוך ${TOTAL_SONGS} שירים`,          gradient: "linear-gradient(135deg,#06b6d4,#0e7490)", say: "בואו ננגן!" },
  ];

  if (game) {
    return (
      <div className="w-full h-full flex flex-col" style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", paddingTop: 56 }}>
        <div style={{ padding: "2px 12px 6px" }}>
          <button
            data-testid="learn-back"
            onClick={() => {
              playSfx("pop");
              setGame(null);
            }}
            style={{
              border: "none",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
              fontFamily: "Heebo, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              padding: "7px 16px",
              cursor: "pointer",
              color: "#1a365d",
            }}
          >
            ⬅️ כל המשחקים
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {game === "math" && <MathGame learning={learning} speakHebrew={speakHebrew} playSfx={playSfx} />}
          {game === "letters" && <LettersBoard learning={learning} speakHebrew={speakHebrew} playSfx={playSfx} />}
          {game === "reading" && <ReadingGame learning={learning} speakHebrew={speakHebrew} playSfx={playSfx} />}
          {game === "clock" && <ClockGame learning={learning} speakHebrew={speakHebrew} playSfx={playSfx} />}
          {game === "memory" && <MemoryGame learning={learning} speakHebrew={speakHebrew} playSfx={playSfx} />}
          {game === "drawing" && <DrawingPad speakHebrew={speakHebrew} playSfx={playSfx} />}
          {game === "music" && <MusicBox learning={learning} speakHebrew={speakHebrew} playSfx={playSfx} />}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center"
      style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", paddingTop: 64, overflowY: "auto" }}
    >
      <div style={{ textAlign: "center", padding: "0 16px 4px" }}>
        <h2 style={{ fontWeight: 900, fontSize: 26, color: "#1a365d", margin: 0 }}>🎓 בית הספר הקטן</h2>
        <p style={{ fontWeight: 700, fontSize: 13.5, color: "#475569", margin: "4px 0 8px" }}>
          לומדים חשבון, אותיות וקריאה — במשחק!
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          width: "100%",
          maxWidth: 470,
          padding: "4px 16px 26px",
        }}
      >
        {GAMES.map((g) => (
          <button
            key={g.id}
            data-testid={`learn-tile-${g.id}`}
            onClick={() => {
              playSfx("pop");
              speakHebrew(g.say);
              setGame(g.id);
            }}
            style={{
              border: "none",
              borderRadius: 20,
              background: g.gradient,
              padding: "14px 14px 12px",
              minHeight: 104,
              cursor: "pointer",
              fontFamily: "Heebo, sans-serif",
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 22px rgba(15,23,42,0.22)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontWeight: 900, fontSize: "clamp(15px,4vw,19px)", color: "white", textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                {g.label}
              </span>
              <span style={{ fontSize: 32, lineHeight: 1 }}>{g.emoji}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.94)", marginTop: 8 }}>
              {g.sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
