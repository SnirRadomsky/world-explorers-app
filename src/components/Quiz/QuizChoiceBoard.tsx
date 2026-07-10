// A multiple-choice board for the choice quiz categories: renders 2×2 option
// cards — a real rendered picture (imageUrl), a big emoji, or a large text
// label (capitals). The correct option pulses when the engine asks for a
// hint. Reuses the same onTap contract as the maps.

export interface ChoiceOption {
  id: string;
  emoji?: string;
  /** a real picture (e.g. the creature's rendered 3D portrait) — beats emoji */
  imageUrl?: string;
  label?: string;
}

interface QuizChoiceBoardProps {
  options: ChoiceOption[];
  hintId: string | null;
  /** big prompt shown above the cards, e.g. a flag or creature emoji */
  promptEmoji?: string;
  onTap: (id: string) => void;
  accent: string;
}

export default function QuizChoiceBoard({
  options,
  hintId,
  promptEmoji,
  onTap,
  accent,
}: QuizChoiceBoardProps) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{
        direction: "rtl",
        fontFamily: "Heebo, sans-serif",
        background: "radial-gradient(ellipse at 50% 30%, #1e3a8a22, transparent), #0b1220",
        padding: 16,
        paddingTop: 150,
        gap: 18,
        boxSizing: "border-box",
      }}
    >
      {promptEmoji && (
        <div
          style={{
            fontSize: "clamp(64px, 20vw, 130px)",
            lineHeight: 1,
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.5))",
          }}
        >
          {promptEmoji}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          width: "100%",
          maxWidth: 460,
        }}
      >
        {options.map((opt) => {
          const isHint = hintId === opt.id;
          return (
            <button
              key={opt.id}
              data-testid={`quiz-choice-${opt.id}`}
              onClick={() => onTap(opt.id)}
              style={{
                border: isHint ? `3px solid ${accent}` : "3px solid rgba(255,255,255,0.14)",
                borderRadius: 22,
                background: "rgba(255,255,255,0.96)",
                padding: "18px 10px",
                cursor: "pointer",
                fontFamily: "Heebo, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                boxShadow: isHint ? `0 0 26px ${accent}` : "0 6px 18px rgba(0,0,0,0.3)",
                animation: isHint ? "quizPulse 0.9s ease-in-out infinite" : undefined,
                minHeight: 108,
              }}
            >
              {opt.imageUrl ? (
                <img
                  src={opt.imageUrl}
                  alt=""
                  draggable={false}
                  style={{
                    width: "clamp(76px, 24vw, 118px)",
                    height: "clamp(76px, 24vw, 118px)",
                    objectFit: "contain",
                    pointerEvents: "none",
                  }}
                />
              ) : opt.emoji ? (
                <span style={{ fontSize: "clamp(40px, 11vw, 62px)", lineHeight: 1 }}>{opt.emoji}</span>
              ) : null}
              {opt.label && (
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: opt.emoji || opt.imageUrl ? 16 : "clamp(19px, 5vw, 24px)",
                    color: "#0f172a",
                    padding: opt.emoji || opt.imageUrl ? 0 : "16px 4px",
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </div>
  );
}
