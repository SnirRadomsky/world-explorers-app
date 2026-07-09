// Cinematic rocket flight between Earth and space — a full-screen canvas
// sequence: countdown → liftoff (shake + flame + clouds) → atmosphere
// breakout (star streaks) → free space with Earth shrinking behind.
// The reverse direction plays a fiery re-entry. Skippable, honors
// prefers-reduced-motion, and runs a short fade in e2e mode.

import { useEffect, useRef, useState } from "react";
import { fbm2D } from "../../three/noise";
import { mulberry32 } from "../../three/proceduralTextures";

export interface Flight {
  to: string;             // destination screen id (opaque to this component)
  dir: "up" | "down";     // up = Earth → space, down = space → Earth
}

interface LaunchOverlayProps {
  flight: Flight | null;
  /** Called mid-sequence while the screen is fully covered — switch screens here. */
  onArrive: (to: string) => void;
  onDone: () => void;
  speakHebrew: (text: string) => void;
}

const UP_TOTAL = 5.6;
const UP_ARRIVE = 3.0;
const DOWN_TOTAL = 4.2;
const DOWN_ARRIVE = 2.0;

function isQuickMode(): boolean {
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const e2e = new URLSearchParams(window.location.search).has("e2e");
  return reduced || e2e;
}

/** Paint a mini-Earth disc (blue + FBM continents + polar ice) once. */
function paintEarthDisc(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(r * 0.7, r * 0.7, r * 0.1, r, r, r);
  g.addColorStop(0, "#5db9f0");
  g.addColorStop(0.7, "#2470b8");
  g.addColorStop(1, "#123a6e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // continents
  const n = 64;
  const cell = size / n;
  ctx.fillStyle = "#3fa060";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (fbm2D(x * 0.11 + 5, y * 0.11 + 9, 13, 4) > 0.55) {
        ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
      }
    }
  }
  // polar ice
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(r, size * 0.06, r * 0.55, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  // rim shading
  const rim = ctx.createRadialGradient(r, r, r * 0.78, r, r, r);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(1, "rgba(4,10,30,0.55)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flame: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // flame (below body), flickering
  if (flame > 0) {
    const f = 30 + Math.sin(flame * 47) * 6 + Math.random() * 6;
    const grad = ctx.createLinearGradient(0, 26, 0, 26 + f);
    grad.addColorStop(0, "#fff3b0");
    grad.addColorStop(0.4, "#ffb347");
    grad.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-9, 26);
    ctx.quadraticCurveTo(0, 26 + f * 1.25, 9, 26);
    ctx.closePath();
    ctx.fill();
  }
  // fins
  ctx.fillStyle = "#e2504a";
  ctx.beginPath();
  ctx.moveTo(-11, 26);
  ctx.lineTo(-22, 36);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(11, 26);
  ctx.lineTo(22, 36);
  ctx.lineTo(11, 10);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = "#f4f6fb";
  ctx.beginPath();
  ctx.moveTo(-11, 26);
  ctx.lineTo(-11, -8);
  ctx.quadraticCurveTo(0, -40, 11, -8);
  ctx.lineTo(11, 26);
  ctx.closePath();
  ctx.fill();
  // nose
  ctx.fillStyle = "#e2504a";
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.quadraticCurveTo(0, -40, 11, -8);
  ctx.quadraticCurveTo(0, -22, -11, -8);
  ctx.closePath();
  ctx.fill();
  // window
  ctx.fillStyle = "#57b8e8";
  ctx.strokeStyle = "#33566e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 2, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export default function LaunchOverlay({ flight, onArrive, onDone, speakHebrew }: LaunchOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef({ arrived: false, done: false });

  // Latest callbacks without restarting the animation
  const cbRef = useRef({ onArrive, onDone, speakHebrew });
  useEffect(() => {
    cbRef.current = { onArrive, onDone, speakHebrew };
  }, [onArrive, onDone, speakHebrew]);

  // finish() of the active run, reachable from the skip button
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!flight || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      cbRef.current.onArrive(flight.to);
      cbRef.current.onDone();
      return;
    }

    const quick = isQuickMode();
    const total = quick ? 0.8 : flight.dir === "up" ? UP_TOTAL : DOWN_TOTAL;
    const arriveAt = quick ? 0.35 : flight.dir === "up" ? UP_ARRIVE : DOWN_ARRIVE;
    doneRef.current = { arrived: false, done: false };
    setFading(false);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const earthDisc = paintEarthDisc(320);
    const rng = mulberry32(9);
    const stars = Array.from({ length: 130 }, () => ({
      x: rng() * W,
      y: rng() * H,
      r: 0.6 + rng() * 1.6,
      tw: rng() * Math.PI * 2,
    }));
    const streakAngles = Array.from({ length: 110 }, () => rng() * Math.PI * 2);
    const clouds = Array.from({ length: 9 }, () => ({
      x: rng() * W,
      y: rng() * H,
      w: 70 + rng() * 130,
      speed: 0.6 + rng() * 0.8,
    }));

    if (!quick && flight.dir === "up") {
      cbRef.current.speakHebrew("שלוש, שתיים, אחת — ממריאים!");
    }

    let handle = 0;
    const t0 = performance.now();

    const arrive = () => {
      if (doneRef.current.arrived) return;
      doneRef.current.arrived = true;
      cbRef.current.onArrive(flight.to);
    };
    const finish = () => {
      if (doneRef.current.done) return;
      doneRef.current.done = true;
      arrive();
      cbRef.current.onDone();
    };
    finishRef.current = finish;

    const drawStars = (alpha: number, t: number) => {
      for (const s of stars) {
        ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(t * 2.2 + s.tw));
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawStreaks = (speed: number) => {
      const cx = W / 2;
      const cy = H / 2;
      ctx.strokeStyle = "rgba(210,225,255,0.85)";
      for (let i = 0; i < streakAngles.length; i++) {
        const a = streakAngles[i];
        const near = 30 + ((i * 37) % 90);
        const len = near + speed * (90 + ((i * 53) % 160));
        ctx.lineWidth = 1 + (i % 3);
        ctx.globalAlpha = 0.25 + 0.6 * Math.min(1, speed);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const drawSkyUp = (p: number) => {
      // p: 0 ground dusk → 1 space black
      const g = ctx.createLinearGradient(0, 0, 0, H);
      const mix = (a: number[], b: number[], k: number) =>
        `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
      g.addColorStop(0, mix([16, 42, 94], [2, 3, 9], p));
      g.addColorStop(0.55, mix([59, 130, 196], [4, 6, 18], p));
      g.addColorStop(1, mix([240, 160, 90], [10, 14, 34], p));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      if (quick) {
        ctx.fillStyle = "#04060f";
        ctx.fillRect(0, 0, W, H);
        drawStars(0.9, t);
        drawRocket(ctx, W / 2, H * (1 - t / total) * 0.8 + H * 0.1, 1.4, t * 10);
        return;
      }

      if (flight.dir === "up") {
        if (t < 1.5) {
          // ── countdown on the launchpad ──
          drawSkyUp(0.05);
          // ground
          ctx.fillStyle = "#243447";
          ctx.fillRect(0, H * 0.86, W, H * 0.14);
          // tower
          ctx.fillStyle = "#38506b";
          ctx.fillRect(W / 2 + 42, H * 0.5, 16, H * 0.36);
          // steam puffs
          for (let i = 0; i < 7; i++) {
            const px = W / 2 + Math.sin(i * 2.4 + t * 3) * 42;
            ctx.fillStyle = `rgba(220,228,238,${0.3 + 0.2 * Math.sin(t * 5 + i)})`;
            ctx.beginPath();
            ctx.arc(px, H * 0.86 - 6, 14 + (i % 3) * 8, 0, Math.PI * 2);
            ctx.fill();
          }
          drawRocket(ctx, W / 2, H * 0.74, 2.0, 0);
          const num = Math.max(1, 3 - Math.floor(t));
          const pop = 1 + 0.25 * (1 - ((t % 1) + 1) % 1);
          ctx.save();
          ctx.translate(W / 2, H * 0.3);
          ctx.scale(pop, pop);
          ctx.font = "900 110px Heebo, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "rgba(20,40,90,0.9)";
          ctx.lineWidth = 10;
          ctx.strokeText(String(num), 0, 0);
          ctx.fillText(String(num), 0, 0);
          ctx.restore();
        } else if (t < UP_ARRIVE) {
          // ── liftoff: shake, flame, clouds streaming down ──
          const k = (t - 1.5) / (UP_ARRIVE - 1.5); // 0→1
          drawSkyUp(k * 0.75);
          const shake = (1 - k) * 4;
          ctx.save();
          ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          for (const c of clouds) {
            c.y += (6 + k * 22) * c.speed;
            if (c.y > H + 40) { c.y = -40; c.x = Math.random() * W; }
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.w, c.w * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          drawStars(k * 0.8, t);
          const ry = H * 0.74 - k * H * 0.45;
          drawRocket(ctx, W / 2, ry, 2.0 - k * 0.5, t);
          ctx.restore();
        } else if (t < 4.1) {
          // ── atmosphere breakout: hyperspeed star streaks ──
          const k = (t - UP_ARRIVE) / (4.1 - UP_ARRIVE);
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          drawStreaks(0.3 + k * 2.4);
          drawRocket(ctx, W / 2, H / 2, 1.1, t);
        } else {
          // ── free space: Earth floats away behind us ──
          const k = (t - 4.1) / (total - 4.1);
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          drawStars(1, t);
          const er = H * (0.5 - k * 0.34);
          const ey = H * (0.95 + k * 0.25);
          ctx.drawImage(earthDisc, W / 2 - er, ey - er, er * 2, er * 2);
          // atmosphere halo
          ctx.strokeStyle = `rgba(110,170,255,${0.5 - k * 0.3})`;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(W / 2, ey, er + 6, 0, Math.PI * 2);
          ctx.stroke();
          drawRocket(ctx, W / 2 + k * 60, H * 0.42 - k * H * 0.3, 1.1 - k * 0.35, t);
        }
      } else {
        // ── coming home: Earth grows → streaks → fiery re-entry ──
        if (t < 1.0) {
          const k = t / 1.0;
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          drawStars(1, t);
          const er = H * (0.16 + k * 0.3);
          const ey = H * (1.18 - k * 0.16);
          ctx.drawImage(earthDisc, W / 2 - er, ey - er, er * 2, er * 2);
          drawRocket(ctx, W / 2, H * 0.4, 1.1, t);
        } else if (t < DOWN_ARRIVE) {
          const k = (t - 1.0) / (DOWN_ARRIVE - 1.0);
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          drawStreaks(0.3 + k * 2.2);
          drawRocket(ctx, W / 2, H / 2, 1.1, t);
        } else {
          // re-entry: heat glow + clouds rushing up
          const k = (t - DOWN_ARRIVE) / (total - DOWN_ARRIVE);
          drawSkyUp(0.7 - k * 0.65);
          for (const c of clouds) {
            c.y -= (8 + (1 - k) * 18) * c.speed;
            if (c.y < -40) { c.y = H + 40; c.x = Math.random() * W; }
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.w, c.w * 0.36, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // heat shield glow (fades as we slow down)
          const glow = Math.max(0, 1 - k * 1.6);
          if (glow > 0) {
            const gy = H * 0.5 - 40;
            const grad = ctx.createRadialGradient(W / 2, gy, 6, W / 2, gy, 120);
            grad.addColorStop(0, `rgba(255,180,60,${0.8 * glow})`);
            grad.addColorStop(1, "rgba(255,80,20,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(W / 2, gy, 120, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.save();
          ctx.translate(W / 2, H * 0.5);
          ctx.rotate(Math.PI); // nose down
          drawRocket(ctx, 0, 0, 1.6, glow > 0.1 ? t : 0);
          ctx.restore();
          // parachute at the very end
          if (k > 0.7) {
            ctx.fillStyle = "#f2b134";
            ctx.beginPath();
            ctx.arc(W / 2, H * 0.5 - 110, 60, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 2;
            for (const dx of [-50, 0, 50]) {
              ctx.beginPath();
              ctx.moveTo(W / 2 + dx, H * 0.5 - 110);
              ctx.lineTo(W / 2, H * 0.5 - 30);
              ctx.stroke();
            }
          }
        }
      }
    };

    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      if (t >= arriveAt) arrive();
      if (t >= total) {
        setFading(true);
        setTimeout(finish, 260);
        return;
      }
      draw(t);
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(handle);
     
  }, [flight]);

  if (!flight) return null;

  return (
    <div
      data-testid="launch-overlay"
      className="fixed inset-0 z-40"
      style={{
        background: "#04060f",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.25s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <button
        data-testid="launch-skip"
        onClick={() => finishRef.current()}
        style={{
          position: "absolute",
          bottom: 26,
          left: "50%",
          transform: "translateX(-50%)",
          border: "1.5px solid rgba(255,255,255,0.4)",
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          color: "white",
          fontFamily: "Heebo, sans-serif",
          fontWeight: 800,
          fontSize: 15,
          padding: "9px 22px",
          cursor: "pointer",
          direction: "rtl",
        }}
      >
        דלג ⏭️
      </button>
    </div>
  );
}
