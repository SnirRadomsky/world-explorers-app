// דו"ח הורים — a clean progress summary for grown-ups, opened from the home
// screen behind the multiplication parental gate. Read-only, one glance.

import { motion, AnimatePresence } from "framer-motion";
import { CONTINENTS } from "../../data/continents";
import { COUNTRIES } from "../../data/countries";
import { TOTAL_ISRAEL_SITES } from "../../data/israelCities";
import { TOTAL_SPACE_OBJECTS } from "../../data/planets";
import { TOTAL_MARINE_CREATURES } from "../../data/marineLife";
import { TOTAL_LANDMARKS, TOTAL_TREASURES } from "../../data/landmarks";
import { TOTAL_LETTERS } from "../../data/hebrewLetters";
import { TOTAL_READING_WORDS } from "../../data/readingWords";
import { STICKERS } from "../../lib/stickers";
import { TOTAL_SONGS } from "../../data/songs";
import type { LearnData } from "../../hooks/useLearning";

export interface ParentsReportData {
  continents: number;
  countries: number;
  israel: number;
  planets: number;
  ocean: number;
  landmarks: number;
  treasures: number;
  stickers: number;
  dailyStreak: number;
  learn: LearnData;
}

interface ParentsReportProps {
  open: boolean;
  onClose: () => void;
  data: ParentsReportData;
}

function Row({ emoji, label, value, total }: { emoji: string; label: string; value: number; total?: number }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 22, width: 30, textAlign: "center" }}>{emoji}</span>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5, color: "#334155" }}>{label}</span>
      <span dir="ltr" style={{ fontWeight: 900, fontSize: 14.5, color: "#0f172a", whiteSpace: "nowrap" }}>
        {value}{total !== undefined && ` / ${total}`}
      </span>
      {pct !== null && (
        <span style={{ width: 56, height: 8, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", flexShrink: 0 }}>
          <span style={{ display: "block", width: `${pct}%`, height: "100%", background: pct >= 100 ? "#16a34a" : "#3b82f6" }} />
        </span>
      )}
    </div>
  );
}

export default function ParentsReport({ open, onClose, data }: ParentsReportProps) {
  const mathStars = (data.learn.mathStars.count ?? 0) + (data.learn.mathStars.add ?? 0) + (data.learn.mathStars.sub ?? 0);
  const clockStars = Object.values(data.learn.clockModeStars ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(8,15,40,0.6)", direction: "rtl", fontFamily: "Heebo, sans-serif" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="parents-report"
            style={{
              background: "white",
              borderRadius: 24,
              padding: "20px 22px",
              width: "100%",
              maxWidth: 420,
              maxHeight: "86vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 900, fontSize: 21, color: "#1a365d", margin: 0 }}>
                👨‍👩‍👧 דו"ח התקדמות להורים
              </h3>
              <button
                onClick={onClose}
                aria-label="סגירה"
                style={{ border: "none", background: "#f1f5f9", borderRadius: "50%", width: 34, height: 34, fontSize: 15, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontWeight: 800, fontSize: 13, color: "#64748b", margin: "12px 0 2px" }}>🌍 גילוי העולם</div>
            <Row emoji="🌍" label="יבשות" value={data.continents} total={CONTINENTS.length} />
            <Row emoji="🗺️" label="מדינות" value={data.countries} total={COUNTRIES.length} />
            <Row emoji="🇮🇱" label="ערי ישראל ואתרים" value={data.israel} total={TOTAL_ISRAEL_SITES} />
            <Row emoji="🪐" label="גופי חלל" value={data.planets} total={TOTAL_SPACE_OBJECTS} />
            <Row emoji="🐠" label="חיות ים" value={data.ocean} total={TOTAL_MARINE_CREATURES} />
            <Row emoji="🏛️" label="פלאי עולם" value={data.landmarks} total={TOTAL_LANDMARKS} />
            <Row emoji="💎" label="אוצרות" value={data.treasures} total={TOTAL_TREASURES} />

            <div style={{ fontWeight: 800, fontSize: 13, color: "#64748b", margin: "14px 0 2px" }}>🎓 בית הספר הקטן</div>
            <Row emoji="🔤" label="אותיות שהוכרו" value={data.learn.lettersHeard.length} total={TOTAL_LETTERS} />
            <Row emoji="📖" label="מילים שנקראו" value={data.learn.wordsRead.length} total={TOTAL_READING_WORDS} />
            <Row emoji="➕" label="כוכבי חשבון" value={mathStars} total={9} />
            <Row emoji="🕒" label="כוכבי שעון" value={clockStars} total={15} />
            <Row emoji="🃏" label="ניצחונות זיכרון" value={data.learn.memoryWins} />
            <Row emoji="🎵" label="שירים שנוגנו" value={data.learn.songsDone.length} total={TOTAL_SONGS} />
            <Row emoji="🦜" label="שיא משחק ההד" value={data.learn.echoBest ?? 0} />

            <div style={{ fontWeight: 800, fontSize: 13, color: "#64748b", margin: "14px 0 2px" }}>🏆 הישגים</div>
            <Row emoji="📒" label="מדבקות" value={data.stickers} total={STICKERS.length} />
            <Row emoji="🔥" label="רצף אתגר יומי" value={data.dailyStreak} />

            <p style={{ fontWeight: 600, fontSize: 12, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 }}>
              הנתונים נשמרים על המכשיר בלבד. איפוס התקדמות אפשרי מכל מסך פעילות דרך כפתור 🗑️.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
