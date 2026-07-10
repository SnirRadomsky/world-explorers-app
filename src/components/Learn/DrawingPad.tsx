// סטודיו לציור — finger painting: 10 colors, 3 brush sizes, emoji stamps,
// eraser and clear. The masterpiece auto-saves to localStorage and waits for
// the artist's next visit.

import { useCallback, useEffect, useRef, useState } from "react";
import type { SfxName } from "../../hooks/useSfx";

const SAVE_KEY = "world-explorers-drawing";
const COLORS = ["#0f172a", "#dc2626", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#3b82f6", "#a855f7", "#ec4899", "#8a5a2b"];
const SIZES = [4, 10, 22];
const STAMPS = ["⭐", "❤️", "🌸", "🐟", "🚀", "🌈"];

interface DrawingPadProps {
  speakHebrew: (text: string) => void;
  playSfx: (name: SfxName) => void;
}

export default function DrawingPad({ speakHebrew, playSfx }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState(COLORS[5]);
  const [size, setSize] = useState(SIZES[1]);
  const [stamp, setStamp] = useState<string | null>(null);
  const [eraser, setEraser] = useState(false);

  // size the canvas to its container once + restore the saved drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, w, h);
        img.src = saved;
      }
    } catch { /* ignore */ }
  }, []);

  const save = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (canvas) localStorage.setItem(SAVE_KEY, canvas.toDataURL("image/png"));
    } catch { /* storage full — skip silently */ }
  }, []);

  const pos = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const down = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (stamp) {
      ctx.font = `${size * 3 + 18}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stamp, p.x, p.y);
      playSfx("pop");
      save();
      return;
    }
    drawingRef.current = true;
    lastRef.current = p;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = eraser ? "#ffffff" : color;
    ctx.fill();
  }, [stamp, size, eraser, color, pos, playSfx, save]);

  const move = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  }, [eraser, color, size, pos]);

  const up = useCallback(() => {
    if (drawingRef.current) {
      drawingRef.current = false;
      save();
    }
  }, [save]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const wrap = wrapRef.current;
    if (!canvas || !ctx || !wrap) return;
    playSfx("whoosh");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, wrap.clientWidth, wrap.clientHeight);
    save();
    speakHebrew("דף חדש! מה נצייר עכשיו?");
  }, [playSfx, save, speakHebrew]);

  const chip: React.CSSProperties = {
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontFamily: "Heebo, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ direction: "rtl", padding: "0 10px 10px" }}>
      {/* toolbars */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", padding: "2px 0 6px" }}>
        {COLORS.map((c, i) => (
          <button
            key={c}
            data-testid={`drawing-color-${i}`}
            onClick={() => {
              setColor(c);
              setEraser(false);
              setStamp(null);
            }}
            style={{
              ...chip,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: c,
              outline: color === c && !eraser && !stamp ? "3px solid #f59e0b" : "2px solid rgba(255,255,255,0.8)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
            aria-label={`צבע ${i + 1}`}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", paddingBottom: 6 }}>
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => { setSize(s); setStamp(null); }}
            style={{ ...chip, width: 38, height: 32, background: size === s && !stamp ? "#dbeafe" : "white", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
            aria-label={`מכחול ${s}`}
          >
            <span style={{ width: s * 0.7 + 4, height: s * 0.7 + 4, borderRadius: "50%", background: "#334155", display: "block" }} />
          </button>
        ))}
        <button
          onClick={() => { setEraser((v) => !v); setStamp(null); }}
          style={{ ...chip, padding: "4px 10px", fontSize: 17, background: eraser ? "#fee2e2" : "white", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
          aria-label="מחק"
        >
          🧽
        </button>
        {STAMPS.map((st) => (
          <button
            key={st}
            onClick={() => { setStamp(stamp === st ? null : st); setEraser(false); }}
            style={{ ...chip, padding: "4px 8px", fontSize: 17, background: stamp === st ? "#fef3c7" : "white", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
            aria-label={`חותמת ${st}`}
          >
            {st}
          </button>
        ))}
        <button
          data-testid="drawing-clear"
          onClick={clear}
          style={{ ...chip, padding: "4px 12px", fontSize: 14, fontWeight: 900, background: "white", color: "#b91c1c", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
        >
          🗑️ דף חדש
        </button>
      </div>

      {/* canvas */}
      <div
        ref={wrapRef}
        style={{ flex: 1, minHeight: 0, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 24px rgba(15,23,42,0.18)", background: "white" }}
      >
        <canvas
          ref={canvasRef}
          data-testid="drawing-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
        />
      </div>
    </div>
  );
}
