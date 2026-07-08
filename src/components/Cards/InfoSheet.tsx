// Reusable kid-friendly bottom sheet for info cards.

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface InfoSheetProps {
  open: boolean;
  onClose: () => void;
  accentColor: string;
  children: ReactNode;
}

export default function InfoSheet({ open, onClose, accentColor, children }: InfoSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(8,15,40,0.45)",
              zIndex: 60,
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 61,
              maxHeight: "82%",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              borderRadius: "28px 28px 0 0",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.3)",
              overflow: "hidden",
              direction: "rtl",
              fontFamily: "Heebo, sans-serif",
            }}
          >
            <div style={{ height: 10, background: accentColor }} />
            <button
              onClick={onClose}
              aria-label="סגירה"
              style={{
                position: "absolute",
                top: 20,
                left: 14,
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                background: "#f1f5f9",
                fontSize: 20,
                fontWeight: 800,
                color: "#475569",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              ✕
            </button>
            <div style={{ overflowY: "auto", padding: "16px 20px 28px" }}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
