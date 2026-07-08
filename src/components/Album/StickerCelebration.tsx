// Full-screen celebration when a new sticker is earned (pops on any screen).

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { STICKER_BY_ID } from "../../lib/stickers";
import type { SfxName } from "../../hooks/useSfx";

interface StickerCelebrationProps {
  stickerId: string | null;
  onClose: () => void;
  onGoToAlbum: () => void;
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function StickerCelebration({
  stickerId,
  onClose,
  onGoToAlbum,
  speakHebrew,
  playSfx,
}: StickerCelebrationProps) {
  const sticker = stickerId ? STICKER_BY_ID.get(stickerId) : undefined;

  useEffect(() => {
    if (!sticker) return;
    playSfx("sparkle");
    speakHebrew(`קיבלתם מדבקה חדשה! ${sticker.nameHebrew}`);
    const t = setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.35 },
        colors: ["#fbbf24", "#f59e0b", "#fde68a", "#ffffff"],
        disableForReducedMotion: true,
      });
    }, 250);
    return () => clearTimeout(t);
  }, [sticker, playSfx, speakHebrew]);

  return (
    <AnimatePresence>
      {sticker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(8,15,40,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: 12 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 15 }}
            className="rounded-3xl p-8 text-center mx-4"
            style={{
              background: "linear-gradient(150deg,#fbbf24,#f59e0b)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              direction: "rtl",
              maxWidth: 360,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, fontSize: 20, color: "rgba(255,255,255,0.95)" }}>
              ✨ מדבקה חדשה! ✨
            </div>
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
              style={{ fontSize: 84, margin: "10px 0" }}
              data-testid="sticker-celebration-emoji"
            >
              {sticker.emoji}
            </motion.div>
            <div style={{ fontFamily: "Heebo, sans-serif", fontWeight: 900, fontSize: 28, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              {sticker.nameHebrew}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
              <button
                onClick={onGoToAlbum}
                style={{
                  border: "none",
                  borderRadius: 16,
                  background: "white",
                  color: "#b45309",
                  fontFamily: "Heebo, sans-serif",
                  fontWeight: 900,
                  fontSize: 17,
                  padding: "11px 20px",
                  cursor: "pointer",
                }}
              >
                📒 לאלבום!
              </button>
              <button
                onClick={onClose}
                style={{
                  border: "2px solid rgba(255,255,255,0.7)",
                  borderRadius: 16,
                  background: "transparent",
                  color: "white",
                  fontFamily: "Heebo, sans-serif",
                  fontWeight: 900,
                  fontSize: 17,
                  padding: "11px 20px",
                  cursor: "pointer",
                }}
              >
                ממשיכים 🎉
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
