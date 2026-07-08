// Tap-board for the planets quiz — the solar-system lineup on a starry sky.

import { PLANETS } from "../../data/planets";

interface QuizPlanetsProps {
  hintId: string | null;
  onTap: (id: string) => void;
}

export default function QuizPlanets({ hintId, onTap }: QuizPlanetsProps) {
  return (
    <div
      className="w-full h-full"
      style={{
        background: "radial-gradient(ellipse at 50% 120%, #1b2450 0%, #0a0f2b 55%, #04060f 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4vmin",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: 760,
          padding: "80px 18px 100px",
          direction: "rtl",
        }}
      >
        {PLANETS.map((p) => {
          const px = Math.max(46, Math.min(120, p.radius * 24));
          const hinted = hintId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onTap(p.id)}
              data-testid={`quiz-planet-${p.id}`}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                fontFamily: "Heebo, sans-serif",
                animation: hinted ? "quizPulse 0.75s ease-in-out infinite" : undefined,
              }}
            >
              <span
                style={{
                  width: px,
                  height: px,
                  borderRadius: "50%",
                  background: `radial-gradient(circle at 32% 28%, ${p.baseColor}, ${p.accentColor})`,
                  boxShadow: hinted
                    ? `0 0 0 5px #f59e0b, 0 0 26px ${p.baseColor}`
                    : `0 0 18px ${p.baseColor}66`,
                  position: "relative",
                  display: "inline-block",
                }}
              >
                {p.hasRings && (
                  <span
                    style={{
                      position: "absolute",
                      inset: "38% -34%",
                      border: "5px solid rgba(228,205,160,0.85)",
                      borderRadius: "50%",
                      transform: "rotate(-16deg)",
                    }}
                  />
                )}
              </span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 14, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>
                {p.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
