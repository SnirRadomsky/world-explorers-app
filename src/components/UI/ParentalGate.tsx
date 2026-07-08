// Parental gate: a small multiplication question adults solve easily.
// Guards destructive actions (progress reset).

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ParentalGateProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

function makeChallenge() {
  const a = 3 + Math.floor(Math.random() * 6); // 3..8
  const b = 4 + Math.floor(Math.random() * 6); // 4..9
  return { a, b, answer: a * b };
}

export default function ParentalGate({ open, onSuccess, onClose }: ParentalGateProps) {
  const [challenge, setChallenge] = useState(makeChallenge);
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const reset = () => {
    setChallenge(makeChallenge());
    setEntry("");
    setWrong(false);
  };

  const press = (d: string) => {
    if (entry.length >= 3) return;
    const next = entry + d;
    setEntry(next);
    if (next.length >= String(challenge.answer).length) {
      if (Number(next) === challenge.answer) {
        reset();
        onSuccess();
      } else {
        setWrong(true);
        setTimeout(() => {
          reset();
          onClose();
        }, 900);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(8,15,40,0.55)" }}
          onClick={() => {
            reset();
            onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className="rounded-3xl p-6 text-center mx-4"
            style={{
              background: "white",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              direction: "rtl",
              fontFamily: "Heebo, sans-serif",
              maxWidth: 330,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 34 }}>👨‍👩‍👧</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#0f172a", marginTop: 2 }}>שאלה להורים</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#64748b", marginTop: 2 }}>
              כדי לאפס את ההתקדמות, פתרו:
            </div>
            <div
              data-testid="gate-question"
              style={{ fontWeight: 900, fontSize: 34, color: "#1d4ed8", margin: "10px 0 4px", direction: "ltr" }}
            >
              {challenge.a} × {challenge.b} = {entry || "?"}
            </div>
            {wrong && (
              <div style={{ color: "#dc2626", fontWeight: 800, fontSize: 15 }}>לא נכון 🙈</div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginTop: 12,
                direction: "ltr",
              }}
            >
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((d) => (
                <button
                  key={d}
                  data-testid={`gate-key-${d === "⌫" ? "del" : d}`}
                  onClick={() => {
                    if (d === "⌫") setEntry((e) => e.slice(0, -1));
                    else press(d);
                  }}
                  style={{
                    border: "none",
                    borderRadius: 14,
                    background: "#f1f5f9",
                    fontFamily: "Heebo, sans-serif",
                    fontWeight: 900,
                    fontSize: 22,
                    color: "#0f172a",
                    padding: "12px 0",
                    cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
