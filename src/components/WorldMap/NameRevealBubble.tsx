import { motion, AnimatePresence } from "framer-motion";

interface NameRevealBubbleProps {
  name: string | null;
  subName?: string;      // shown below main name (e.g. country name for cities)
  color: string;
  position: { x: number; y: number } | null;
  onDismiss: () => void;
  /** Optional "more info" action — shows an עוד! button that opens a card. */
  onMore?: () => void;
}

export default function NameRevealBubble({ name, subName, color, onDismiss, onMore }: NameRevealBubbleProps) {
  return (
    <AnimatePresence>
      {name && (
        <motion.div
          key={name}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, mass: 0.8 }}
          onClick={onDismiss}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 40,
            pointerEvents: "auto",
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              background: color,
              borderRadius: "24px",
              padding: subName ? "16px 36px 20px" : "20px 40px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 5px rgba(255,255,255,0.6)",
              cursor: "pointer",
              userSelect: "none",
              textAlign: "center",
              direction: "rtl",
            }}
          >
            <div
              style={{
                fontFamily: "Heebo, sans-serif",
                fontWeight: 900,
                fontSize: "clamp(36px, 6vw, 56px)",
                color: "white",
                textShadow: "0 3px 10px rgba(0,0,0,0.4)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
            {subName && (
              <div
                style={{
                  fontFamily: "Heebo, sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(18px, 2.5vw, 26px)",
                  color: "rgba(255,255,255,0.88)",
                  marginTop: "6px",
                  textShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                {subName}
              </div>
            )}
            {onMore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMore();
                }}
                style={{
                  marginTop: 10,
                  border: "none",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.95)",
                  color: "#1e293b",
                  fontFamily: "Heebo, sans-serif",
                  fontWeight: 900,
                  fontSize: 18,
                  padding: "8px 26px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                }}
              >
                עוד! 👀
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
