// ארץ האותיות — the alphabet board: tap a letter for its card (name, nikud
// row, word + picture, final form), everything spoken. Includes the
// "מצאו את האות" hunt game (4 big letters, engine-style hints).

import { useCallback, useMemo, useState } from "react";
import {
  HEBREW_LETTERS,
  NIKUD_FORMS,
  nikudDisplay,
  nikudSpoken,
  type HebrewLetter,
} from "../../data/hebrewLetters";
import { pickOptions } from "../../lib/choiceQuiz";
import { shuffle } from "../../lib/quiz";
import type { LearningState } from "../../hooks/useLearning";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import InfoSheet from "../Cards/InfoSheet";

const HUNT_LENGTH = 8;
const LETTER_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#06b6d4", "#eab308"];

interface LettersBoardProps {
  learning: LearningState;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function LettersBoard({ learning, speakHebrew, playSfx }: LettersBoardProps) {
  const [card, setCard] = useState<HebrewLetter | null>(null);
  const [hunt, setHunt] = useState<{ targets: string[]; index: number; attempts: number } | null>(null);
  const [confetti, setConfetti] = useState(0);

  const openLetter = useCallback((l: HebrewLetter) => {
    playSfx("pop");
    learning.markLetterHeard(l.id);
    speakHebrew(`${l.nameHebrew}. ${l.wordPlain}`);
    setCard(l);
  }, [learning, playSfx, speakHebrew]);

  const startHunt = useCallback(() => {
    playSfx("pop");
    const targets = shuffle(HEBREW_LETTERS.map((l) => l.id)).slice(0, HUNT_LENGTH);
    setHunt({ targets, index: 0, attempts: 0 });
    const first = HEBREW_LETTERS.find((l) => l.id === targets[0])!;
    speakHebrew(`מצאו את האות ${first.nameHebrew}!`);
  }, [playSfx, speakHebrew]);

  const huntOptions = useMemo(() => {
    if (!hunt) return [];
    return pickOptions(HEBREW_LETTERS.map((l) => l.id), hunt.targets[hunt.index], 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hunt?.index, hunt?.targets]);

  const huntTap = useCallback((id: string) => {
    if (!hunt) return;
    const target = hunt.targets[hunt.index];
    const letter = HEBREW_LETTERS.find((l) => l.id === target)!;
    if (id === target) {
      playSfx("tada");
      setConfetti((c) => c + 1);
      learning.markLetterHeard(id);
      if (hunt.index + 1 >= hunt.targets.length) {
        speakHebrew("כל הכבוד! מצאתם את כל האותיות!");
        setHunt(null);
      } else {
        const next = HEBREW_LETTERS.find((l) => l.id === hunt.targets[hunt.index + 1])!;
        speakHebrew(`נכון! עכשיו מצאו את האות ${next.nameHebrew}`);
        setHunt({ ...hunt, index: hunt.index + 1, attempts: 0 });
      }
    } else {
      playSfx("boing");
      speakHebrew(hunt.attempts >= 1 ? `הנה ${letter.nameHebrew} — מהבהבת!` : "נסו שוב!");
      setHunt({ ...hunt, attempts: hunt.attempts + 1 });
    }
  }, [hunt, learning, playSfx, speakHebrew]);

  // ── hunt mode ──
  if (hunt) {
    const target = hunt.targets[hunt.index];
    const letter = HEBREW_LETTERS.find((l) => l.id === target)!;
    const hinted = hunt.attempts >= 2;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-5" style={{ direction: "rtl" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {hunt.targets.map((_, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < hunt.index ? "#22c55e" : i === hunt.index ? "#f59e0b" : "#e2e8f0" }} />
          ))}
        </div>
        <div
          data-testid="hunt-question"
          data-target={target}
          onClick={() => speakHebrew(`מצאו את האות ${letter.nameHebrew}!`)}
          style={{ background: "white", borderRadius: 18, padding: "12px 22px", fontWeight: 900, fontSize: 22, color: "#0f172a", boxShadow: "0 8px 22px rgba(15,23,42,0.12)", cursor: "pointer" }}
        >
          🔊 מצאו את האות {letter.nameHebrew}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, width: "100%", maxWidth: 380 }}>
          {huntOptions.map((id, i) => (
            <button
              key={id}
              data-testid={`hunt-opt-${id}`}
              onClick={() => huntTap(id)}
              style={{
                border: hinted && id === target ? "3px solid #f59e0b" : "3px solid rgba(15,23,42,0.08)",
                borderRadius: 22,
                background: "white",
                color: LETTER_COLORS[i % LETTER_COLORS.length],
                fontFamily: "Heebo, sans-serif",
                fontWeight: 900,
                fontSize: 64,
                padding: "14px 8px",
                cursor: "pointer",
                boxShadow: hinted && id === target ? "0 0 22px rgba(245,158,11,0.7)" : "0 6px 16px rgba(15,23,42,0.12)",
                animation: hinted && id === target ? "quizPulse 0.85s ease-in-out infinite" : undefined,
                lineHeight: 1,
              }}
            >
              {id}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHunt(null)}
          style={{ border: "none", borderRadius: 999, background: "#e2e8f0", color: "#334155", fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 14, padding: "8px 18px", cursor: "pointer" }}
        >
          חזרה ללוח האותיות
        </button>
        <ConfettiEffect trigger={confetti} originX={0.5} originY={0.4} />
        <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
      </div>
    );
  }

  // ── the board ──
  return (
    <div className="w-full h-full flex flex-col" style={{ direction: "rtl" }}>
      <div style={{ textAlign: "center", padding: "0 14px 6px" }}>
        <button
          data-testid="letter-hunt"
          onClick={startHunt}
          style={{
            border: "none",
            borderRadius: 16,
            background: "linear-gradient(135deg,#3b82f6,#1e40af)",
            color: "white",
            fontFamily: "Heebo, sans-serif",
            fontWeight: 900,
            fontSize: 16,
            padding: "10px 22px",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(59,130,246,0.4)",
          }}
        >
          🔎 משחק: מצאו את האות!
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px 24px" }}>
        <div
          data-testid="letters-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, maxWidth: 470, margin: "0 auto" }}
        >
          {HEBREW_LETTERS.map((l, i) => {
            const heard = learning.lettersHeard.has(l.id);
            return (
              <button
                key={l.id}
                data-testid={`letter-card-${l.id}`}
                onClick={() => openLetter(l)}
                style={{
                  border: "none",
                  borderRadius: 18,
                  background: "white",
                  padding: "10px 4px 8px",
                  cursor: "pointer",
                  fontFamily: "Heebo, sans-serif",
                  boxShadow: "0 4px 12px rgba(15,23,42,0.1)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {heard && (
                  <span style={{ position: "absolute", top: 4, left: 6, fontSize: 12 }}>✅</span>
                )}
                <span style={{ fontWeight: 900, fontSize: 40, lineHeight: 1, color: LETTER_COLORS[i % LETTER_COLORS.length] }}>
                  {l.letter}
                </span>
                <span style={{ fontSize: 17 }}>{l.emoji}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* letter card */}
      <InfoSheet open={!!card} onClose={() => setCard(null)} accentColor="#3b82f6">
        {card && (
          <div style={{ textAlign: "center" }}>
            <div
              onClick={() => speakHebrew(card.nameHebrew)}
              style={{ fontWeight: 900, fontSize: 76, lineHeight: 1.05, color: "#1d4ed8", cursor: "pointer" }}
            >
              {card.letter}
            </div>
            <div style={{ fontWeight: 800, fontSize: 19, color: "#334155", marginTop: 2 }}>
              {card.nameHebrew}
            </div>

            {/* nikud row — first steps of reading! */}
            <div style={{ fontWeight: 800, fontSize: 13, color: "#64748b", marginTop: 12 }}>
              🎵 עם ניקוד — לחצו ותשמעו:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 6 }}>
              {NIKUD_FORMS.map((f) => (
                <button
                  key={f.id}
                  data-testid={`nikud-${f.id}`}
                  onClick={() => {
                    playSfx("pop");
                    speakHebrew(nikudSpoken(card.letter, f));
                  }}
                  style={{
                    border: "2px solid #bfdbfe",
                    borderRadius: 14,
                    background: "#eff6ff",
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 900,
                    fontSize: 30,
                    color: "#1e3a8a",
                    padding: "6px 12px",
                    cursor: "pointer",
                    lineHeight: 1.3,
                  }}
                  title={f.nameHebrew}
                >
                  {nikudDisplay(card.letter, f)}
                </button>
              ))}
            </div>

            {/* the word */}
            <button
              onClick={() => {
                playSfx("pop");
                speakHebrew(card.wordPlain);
              }}
              style={{
                marginTop: 14,
                border: "none",
                borderRadius: 16,
                background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                fontFamily: "Heebo, sans-serif",
                padding: "10px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "14px auto 0",
              }}
            >
              <span style={{ fontSize: 36 }}>{card.emoji}</span>
              <span style={{ fontWeight: 900, fontSize: 27, color: "#0f172a" }}>{card.word}</span>
              <span style={{ fontSize: 15 }}>🔊</span>
            </button>

            {/* final form when it exists */}
            {card.finalForm && (
              <button
                onClick={() => {
                  playSfx("pop");
                  speakHebrew(`${card.nameHebrew} סופית. ${card.finalWordPlain}`);
                }}
                style={{
                  marginTop: 10,
                  border: "2px dashed #93c5fd",
                  borderRadius: 16,
                  background: "white",
                  fontFamily: "Heebo, sans-serif",
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "10px auto 0",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 13, color: "#64748b" }}>אות סופית:</span>
                <span style={{ fontWeight: 900, fontSize: 30, color: "#1d4ed8" }}>{card.finalForm}</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: "#0f172a" }}>{card.finalWord}</span>
                <span style={{ fontSize: 24 }}>{card.finalEmoji}</span>
              </button>
            )}
          </div>
        )}
      </InfoSheet>
    </div>
  );
}
