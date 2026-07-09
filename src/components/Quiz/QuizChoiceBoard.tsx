// A multiple-choice board for the flags & marine quiz categories: renders
// 2×2 option cards (big emoji + optional label). The correct option pulses
// when the engine asks for a hint. Reuses the same onTap contract as the maps.

export interface ChoiceOption {
  id: string;
  emoji: string;
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
              <span style={{ fontSize: "clamp(40px, 11vw, 62px)", lineHeight: 1 }}>{opt.emoji}</span>
              {opt.label && (
                <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{opt.label}</span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`@keyframes quizPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
    </div>
  );
}
