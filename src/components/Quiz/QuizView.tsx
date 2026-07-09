// Quiz screen: pick a category (or the daily challenge), then find the answer
// — "איפה X?" on the tap-board for map categories, or a 4-card choice board
// for flags & marine. Everything is spoken (zero reading required).

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  newRound,
  roundFromItems,
  answer,
  freshQuestion,
  medalFor,
  starsFor,
  MEDAL_HEBREW,
  MEDAL_EMOJI,
  type QuizCategory,
  type QuizRound,
  type QuizQuestion,
  type QuizItem,
} from "../../lib/quiz";
import { buildAllOptions } from "../../lib/choiceQuiz";
import { dailyChallenge } from "../../lib/dailyChallenge";
import { CONTINENTS } from "../../data/continents";
import { COUNTRIES } from "../../data/countries";
import { getCountryDetails, flagEmoji } from "../../data/countryDetails";
import { ISRAEL_CITIES } from "../../data/israelCities";
import { PLANETS } from "../../data/planets";
import { MARINE_LIFE, CREATURE_BY_ID } from "../../data/marineLife";
import type { SfxName } from "../../hooks/useSfx";
import ConfettiEffect from "../Overlays/ConfettiEffect";
import QuizWorldMap from "./QuizWorldMap";
import QuizIsraelMap from "./QuizIsraelMap";
import QuizPlanets from "./QuizPlanets";
import QuizChoiceBoard, { type ChoiceOption } from "./QuizChoiceBoard";

const PRAISES = ["כל הכבוד!", "מעולה!", "וואו, נכון!", "יש! מצאתם!", "אלופים!"];
const OOPS = ["אופס, נסו שוב!", "כמעט! עוד ניסיון", "לא נורא, נסו שוב!"];

const CATEGORIES: { id: QuizCategory; label: string; emoji: string; gradient: string }[] = [
  { id: "continents", label: "יבשות", emoji: "🌍", gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  { id: "countries", label: "מדינות", emoji: "🗺️", gradient: "linear-gradient(135deg,#10b981,#059669)" },
  { id: "israel", label: "ערי ישראל", emoji: "🇮🇱", gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
  { id: "planets", label: "כוכבי לכת", emoji: "🪐", gradient: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
  { id: "flags", label: "דגלים", emoji: "🚩", gradient: "linear-gradient(135deg,#ec4899,#be185d)" },
  { id: "marine", label: "חיות ים", emoji: "🐠", gradient: "linear-gradient(135deg,#06b6d4,#0e7490)" },
];

const FLAG_COUNTRIES = COUNTRIES.filter((c) => !!getCountryDetails(c.id));

const CATALOGS: Record<QuizCategory, QuizItem[]> = {
  continents: CONTINENTS.map((c) => ({ id: c.id, nameHebrew: c.nameHebrew })),
  countries: COUNTRIES.map((c) => ({ id: c.id, nameHebrew: c.nameHebrew })),
  israel: ISRAEL_CITIES.map((c) => ({ id: c.id, nameHebrew: c.nameHebrew })),
  planets: PLANETS.map((p) => ({ id: p.id, nameHebrew: p.nameHebrew })),
  flags: FLAG_COUNTRIES.map((c) => ({ id: c.id, nameHebrew: c.nameHebrew })),
  marine: MARINE_LIFE.map((c) => ({ id: c.id, nameHebrew: c.nameHebrew })),
};

const CATALOG_IDS: Record<QuizCategory, string[]> = Object.fromEntries(
  (Object.keys(CATALOGS) as QuizCategory[]).map((k) => [k, CATALOGS[k].map((i) => i.id)]),
) as Record<QuizCategory, string[]>;

const CHOICE_CATEGORIES: QuizCategory[] = ["flags", "marine"];
const CHOICE_ACCENT: Record<string, string> = { flags: "#ec4899", marine: "#06b6d4" };

function isChoice(cat: QuizCategory): boolean {
  return CHOICE_CATEGORIES.includes(cat);
}

function questionText(cat: QuizCategory, name: string): string {
  if (cat === "flags") return `מצאו את הדגל של ${name}`;
  if (cat === "marine") return `מצאו את ${name}`;
  return `איפה ${name}?`;
}

function toChoiceOption(cat: QuizCategory, id: string): ChoiceOption {
  if (cat === "flags") {
    const d = getCountryDetails(id);
    return { id, emoji: d ? flagEmoji(d.alpha2) : "🏳️" };
  }
  const c = CREATURE_BY_ID.get(id);
  return { id, emoji: c?.emoji ?? "🐟" };
}

interface QuizViewProps {
  discovered: Record<QuizCategory, Set<string>>;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
  recordQuizResult: (category: string, stars: number, isGold: boolean) => void;
  /** daily-challenge integration */
  today: string;
  dailyStreak: number;
  dailyDoneToday: boolean;
  onCompleteDaily: () => void;
}

export default function QuizView({
  discovered,
  speakHebrew,
  playSfx,
  recordQuizResult,
  today,
  dailyStreak,
  dailyDoneToday,
  onCompleteDaily,
}: QuizViewProps) {
  const [category, setCategory] = useState<QuizCategory | null>(null);
  const [round, setRound] = useState<QuizRound | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>({});
  const [isDaily, setIsDaily] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locked, setLocked] = useState(false); // brief lock between questions

  const beginRound = useCallback((cat: QuizCategory, r: QuizRound, daily: boolean) => {
    setCategory(cat);
    setRound(r);
    setQuestion(freshQuestion(r, 0));
    setIsDaily(daily);
    setFeedback(null);
    setLocked(false);
    setOptionsMap(
      isChoice(cat) ? buildAllOptions(r.questions.map((q) => q.id), CATALOG_IDS[cat], 4) : {},
    );
  }, []);

  const startRound = useCallback(
    (cat: QuizCategory) => {
      beginRound(cat, newRound(cat, CATALOGS[cat], discovered[cat]), false);
    },
    [discovered, beginRound],
  );

  const startDaily = useCallback(() => {
    const pick = dailyChallenge(
      today,
      CATEGORIES.map((c) => c.id),
      CATALOG_IDS,
      5,
    );
    const cat = pick.category as QuizCategory;
    const items = pick.targetIds
      .map((id) => CATALOGS[cat].find((i) => i.id === id))
      .filter((i): i is QuizItem => !!i);
    beginRound(cat, roundFromItems(cat, items), true);
  }, [today, beginRound]);

  // Announce each new question.
  const targetId = question?.target.id;
  const targetName = question?.target.nameHebrew;
  useEffect(() => {
    if (targetName && category && round && !round.finished) {
      speakHebrew(questionText(category, targetName));
    }
  }, [targetId, targetName, category, round, speakHebrew]);

  const finished = round?.finished ?? false;

  // Round-end announcements + persistence.
  useEffect(() => {
    if (!finished || !round || !category) return;
    const medal = medalFor(round.correctFirstTry);
    const stars = starsFor(round.correctFirstTry);
    recordQuizResult(category, stars, medal === "gold");
    if (isDaily && !dailyDoneToday) onCompleteDaily();
    playSfx(medal === "none" ? "chime" : "tada");
    speakHebrew(
      medal === "none"
        ? "כל הכבוד שניסיתם! בואו ננסה שוב"
        : `מדהים! קיבלתם ${MEDAL_HEBREW[medal]}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const handleTap = useCallback(
    (tappedId: string) => {
      if (!round || !question || round.finished || locked) return;
      const res = answer(round, question, tappedId);

      if (res.result.kind === "correct") {
        playSfx("tada");
        setConfettiTrigger((p) => p + 1);
        setFeedback(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
        speakHebrew(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
        setLocked(true);
        setTimeout(() => {
          setRound(res.round);
          setQuestion(res.round.finished ? question : res.question);
          setFeedback(null);
          setLocked(false);
        }, 1100);
      } else if (res.result.kind === "wrong") {
        playSfx("boing");
        setShakeKey((k) => k + 1);
        const oops = OOPS[Math.floor(Math.random() * OOPS.length)];
        setFeedback(oops);
        if (res.result.reveal) {
          speakHebrew(`הנה ${question.target.nameHebrew}! לחצו על מה שמהבהב`);
        } else {
          speakHebrew(oops);
        }
        setQuestion(res.question);
        setTimeout(() => setFeedback(null), 1400);
      }
    },
    [round, question, locked, playSfx, speakHebrew],
  );

  const hintId = question && (question.hinted || question.revealed) ? question.target.id : null;

  const board = useMemo(() => {
    if (!category || !question) return null;
    if (isChoice(category)) {
      const opts = (optionsMap[question.target.id] ?? []).map((id) => toChoiceOption(category, id));
      return (
        <QuizChoiceBoard
          options={opts}
          hintId={hintId}
          onTap={handleTap}
          accent={CHOICE_ACCENT[category]}
        />
      );
    }
    if (category === "continents" || category === "countries") {
      return <QuizWorldMap kind={category} hintId={hintId} onTap={handleTap} />;
    }
    if (category === "israel") {
      return <QuizIsraelMap hintId={hintId} onTap={handleTap} />;
    }
    return <QuizPlanets hintId={hintId} onTap={handleTap} />;
  }, [category, question, optionsMap, hintId, handleTap]);

  // ── Category picker ──
  if (!category || !round || !question) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 p-6"
        style={{ direction: "rtl", fontFamily: "Heebo, sans-serif", overflowY: "auto" }}
      >
        <div
          className="text-center rounded-3xl px-8 py-4"
          style={{ background: "rgba(255,255,255,0.9)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
        >
          <div style={{ fontSize: 44 }}>❓</div>
          <h2 style={{ fontWeight: 900, fontSize: 28, color: "#1a365d", margin: 0 }}>חידון מגלי העולם</h2>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#2d4a7a", marginTop: 4 }}>
            אני שואל — אתם מוצאים!
          </p>
        </div>

        {/* Daily challenge */}
        <button
          onClick={() => {
            playSfx("pop");
            startDaily();
          }}
          data-testid="quiz-daily"
          className="border-none rounded-2xl cursor-pointer w-full max-w-md"
          style={{
            fontFamily: "Heebo, sans-serif",
            background: dailyDoneToday
              ? "linear-gradient(135deg,#94a3b8,#64748b)"
              : "linear-gradient(135deg,#f59e0b,#ea580c)",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(245,158,11,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 900, fontSize: 22, color: "white", display: "block" }}>
              🔥 אתגר היום
            </span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.92)" }}>
              {dailyDoneToday ? "סיימתם היום! חזרו מחר" : "5 שאלות מיוחדות"} · רצף {dailyStreak} ימים
            </span>
          </span>
          <span style={{ fontSize: 34 }}>{dailyDoneToday ? "✅" : "📅"}</span>
        </button>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                playSfx("pop");
                startRound(c.id);
              }}
              data-testid={`quiz-cat-${c.id}`}
              className="border-none rounded-2xl cursor-pointer"
              style={{
                fontFamily: "Heebo, sans-serif",
                background: c.gradient,
                padding: "16px 18px",
                boxShadow: "0 8px 24px rgba(30,41,120,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 20, color: "white", textShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
                {c.label}
              </span>
              <span style={{ fontSize: 28 }}>{c.emoji}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const medal = medalFor(round.correctFirstTry);
  const stars = starsFor(round.correctFirstTry);

  return (
    <div className="relative w-full h-full" style={{ fontFamily: "Heebo, sans-serif" }}>
      {/* Board */}
      <div className="absolute inset-0">{board}</div>

      {/* Question banner */}
      {!round.finished && (
        <motion.div
          key={`q-${round.index}-${shakeKey}`}
          initial={shakeKey > 0 ? { x: 0 } : { y: -30, opacity: 0 }}
          animate={shakeKey > 0 ? { x: [0, -12, 12, -8, 8, 0] } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.45 }}
          style={{
            position: "absolute",
            top: 64,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            background: "rgba(255,255,255,0.96)",
            borderRadius: 20,
            padding: "10px 22px",
            boxShadow: "0 6px 22px rgba(0,0,0,0.25)",
            direction: "rtl",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "92%",
          }}
        >
          <button
            onClick={() => speakHebrew(questionText(category, question.target.nameHebrew))}
            aria-label="השמעה חוזרת"
            style={{
              border: "none",
              background: "#eef2ff",
              borderRadius: "50%",
              width: 40,
              height: 40,
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            🔊
          </button>
          <div data-testid="quiz-question" style={{ fontWeight: 900, fontSize: "clamp(18px,4.2vw,28px)", color: "#0f172a", whiteSpace: "nowrap" }}>
            {isDaily && <span style={{ color: "#ea580c" }}>🔥 </span>}
            {questionText(category, question.target.nameHebrew)}
          </div>
        </motion.div>
      )}

      {/* Progress dots */}
      {!round.finished && (
        <div
          style={{
            position: "absolute",
            top: 122,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            display: "flex",
            gap: 6,
            direction: "rtl",
          }}
        >
          {round.questions.map((_, i) => (
            <span
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: i < round.index ? "#22c55e" : i === round.index ? "#f59e0b" : "rgba(255,255,255,0.75)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>
      )}

      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback + shakeKey}
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            style={{
              position: "absolute",
              bottom: 96,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 25,
              background: "rgba(15,23,42,0.85)",
              color: "white",
              borderRadius: 999,
              padding: "10px 26px",
              fontWeight: 900,
              fontSize: 20,
              whiteSpace: "nowrap",
              direction: "rtl",
            }}
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfettiEffect trigger={confettiTrigger} originX={0.5} originY={0.45} />

      {/* Round-end modal */}
      <AnimatePresence>
        {round.finished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(8,15,40,0.55)" }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
              className="rounded-3xl p-8 text-center mx-4"
              style={{
                background: "linear-gradient(160deg,#ffffff,#eef2ff)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                direction: "rtl",
                maxWidth: 380,
                width: "100%",
              }}
            >
              <div style={{ fontSize: 56 }}>{MEDAL_EMOJI[medal]}</div>
              <div style={{ fontWeight: 900, fontSize: 26, color: "#0f172a", marginTop: 4 }} data-testid="quiz-result">
                {MEDAL_HEBREW[medal]}
              </div>
              <div style={{ fontSize: 34, margin: "8px 0" }}>
                {"⭐".repeat(stars)}
                {"☆".repeat(3 - stars)}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#475569" }}>
                {isDaily ? (
                  <>סיימתם את אתגר היום! 🔥 רצף של {dailyStreak} ימים</>
                ) : (
                  <>ענו נכון בניסיון הראשון על {round.correctFirstTry} מתוך {round.questions.length} שאלות</>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
                {!isDaily && (
                  <button
                    onClick={() => startRound(category)}
                    style={{
                      border: "none",
                      borderRadius: 16,
                      background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                      color: "white",
                      fontFamily: "Heebo, sans-serif",
                      fontWeight: 900,
                      fontSize: 17,
                      padding: "12px 22px",
                      cursor: "pointer",
                    }}
                  >
                    🔁 עוד סיבוב
                  </button>
                )}
                <button
                  onClick={() => {
                    setCategory(null);
                    setRound(null);
                    setQuestion(null);
                  }}
                  style={{
                    border: "none",
                    borderRadius: 16,
                    background: "#e2e8f0",
                    color: "#334155",
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 900,
                    fontSize: 17,
                    padding: "12px 22px",
                    cursor: "pointer",
                  }}
                >
                  {isDaily ? "🏠 חזרה לחידון" : "נושא אחר"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
