// Cinematic rocket flight between Earth and space — a full-screen canvas
// sequence: countdown → liftoff (shake + layered flame + smoke) → atmosphere
// breakout (star streaks) → free space with a painted Earth shrinking behind.
// The reverse direction plays a fiery re-entry with a parachute finale.
// Skippable, honors prefers-reduced-motion, and runs a short fade in e2e mode.

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

/** Paint the Earth seen from space: oceans, two-tone FBM continents,
 *  drifting clouds, polar ice, terminator shading and an inner atmosphere. */
function paintEarthDisc(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();

  // ocean with a sunlit sheen top-left
  const g = ctx.createRadialGradient(r * 0.62, r * 0.6, r * 0.08, r, r, r * 1.05);
  g.addColorStop(0, "#7fd0f7");
  g.addColorStop(0.35, "#3d9ce0");
  g.addColorStop(0.75, "#1d5aa8");
  g.addColorStop(1, "#0d2f66");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // continents + clouds: painted per-pixel on a small canvas, then stretched
  // with smoothing so they read as soft organic shapes, not pixel blocks
  const n = 112;
  const small = document.createElement("canvas");
  small.width = n;
  small.height = n;
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(n, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      const v = fbm2D(x * 0.073 + 5, y * 0.073 + 9, 13, 4);
      if (v > 0.54) {
        const [rr, gg, bb] = v > 0.62 ? [194, 168, 107] : v > 0.575 ? [63, 154, 88] : [87, 176, 106];
        img.data[i] = rr; img.data[i + 1] = gg; img.data[i + 2] = bb;
        img.data[i + 3] = Math.min(255, Math.floor((v - 0.54) * 2800));
      }
      const cv = fbm2D(x * 0.095 + 41, y * 0.095 + 23, 29, 4);
      if (cv > 0.575) {
        const a = Math.min(0.9, (cv - 0.575) * 6.5);
        // blend cloud over land in-place
        img.data[i] = Math.round(img.data[i] * (1 - a) + 255 * a);
        img.data[i + 1] = Math.round(img.data[i + 1] * (1 - a) + 255 * a);
        img.data[i + 2] = Math.round(img.data[i + 2] * (1 - a) + 255 * a);
        img.data[i + 3] = Math.max(img.data[i + 3], Math.floor(a * 255));
      }
    }
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // a soft blur pass turns the pixel field into organic coastlines
  ctx.filter = `blur(${Math.max(1, size / 180)}px)`;
  ctx.drawImage(small, 0, 0, size, size);
  ctx.filter = "none";

  // polar ice
  for (const py of [size * 0.05, size * 0.95]) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(r, py, r * 0.52, size * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // terminator: night creeping over the bottom-right limb
  const night = ctx.createRadialGradient(r * 0.55, r * 0.55, r * 0.55, r, r, r * 1.42);
  night.addColorStop(0, "rgba(2,6,20,0)");
  night.addColorStop(0.72, "rgba(2,6,20,0)");
  night.addColorStop(1, "rgba(2,6,20,0.85)");
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, size, size);

  // thin inner atmosphere rim
  ctx.strokeStyle = "rgba(150,210,255,0.55)";
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(r, r, r - size * 0.008, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

/** Soft purple/cyan nebulae painted once and layered under the stars. */
function paintNebula(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const rng = mulberry32(77);
  const palettes = [
    ["rgba(147,112,219,0.32)", "rgba(147,112,219,0)"],
    ["rgba(70,160,255,0.26)", "rgba(70,160,255,0)"],
    ["rgba(255,120,190,0.2)", "rgba(255,120,190,0)"],
  ];
  for (let i = 0; i < 4; i++) {
    const [inner, outer] = palettes[i % palettes.length];
    const x = rng() * w;
    const y = rng() * h * 0.8;
    const rad = 120 + rng() * 200;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return c;
}

/** The ship: metallic body, glossy nose, porthole, fins, nozzle and a
 *  layered flame (glow → plume → white core → shock diamonds). */
function drawRocket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  flameOn: boolean,
  t: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // ── flame (painted first, behind the body) ──
  if (flameOn) {
    const flick = 0.82 + 0.14 * Math.sin(t * 41) + 0.09 * Math.sin(t * 97 + 1.7);
    const fl = 46 * flick;
    // outer glow
    let g: CanvasGradient = ctx.createRadialGradient(0, 32, 2, 0, 36, fl * 1.15);
    g.addColorStop(0, "rgba(255,225,140,0.85)");
    g.addColorStop(0.45, "rgba(255,140,40,0.4)");
    g.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 32 + fl * 0.32, 17, fl * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // orange plume
    g = ctx.createLinearGradient(0, 28, 0, 28 + fl * 1.3);
    g.addColorStop(0, "#fff3b0");
    g.addColorStop(0.35, "#ffb347");
    g.addColorStop(1, "rgba(255,90,25,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-7.5, 28);
    ctx.quadraticCurveTo(0, 28 + fl * 1.35, 7.5, 28);
    ctx.closePath();
    ctx.fill();
    // white-hot core
    g = ctx.createLinearGradient(0, 28, 0, 28 + fl * 0.6);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-3.6, 28);
    ctx.quadraticCurveTo(0, 28 + fl * 0.72, 3.6, 28);
    ctx.closePath();
    ctx.fill();
    // shock diamonds
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = Math.max(0, 0.75 - i * 0.2) * flick;
      ctx.fillStyle = "#fff7d6";
      ctx.beginPath();
      ctx.ellipse(0, 30 + i * fl * 0.17, 2.8 - i * 0.6, 4 - i * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── nozzle ──
  const nozzle = ctx.createLinearGradient(-8, 22, 8, 22);
  nozzle.addColorStop(0, "#566274");
  nozzle.addColorStop(0.5, "#2c3442");
  nozzle.addColorStop(1, "#171d28");
  ctx.fillStyle = nozzle;
  ctx.beginPath();
  ctx.moveTo(-6, 22);
  ctx.lineTo(6, 22);
  ctx.lineTo(8.5, 30);
  ctx.lineTo(-8.5, 30);
  ctx.closePath();
  ctx.fill();
  if (flameOn) {
    ctx.fillStyle = "rgba(255,190,90,0.65)";
    ctx.fillRect(-7, 28.4, 14, 1.6);
  }

  // ── fins (light side / dark side) ──
  const finL = ctx.createLinearGradient(-24, 0, -10, 0);
  finL.addColorStop(0, "#c8362f");
  finL.addColorStop(1, "#ef5f52");
  ctx.fillStyle = finL;
  ctx.beginPath();
  ctx.moveTo(-10.5, 25);
  ctx.quadraticCurveTo(-22, 30, -24, 39);
  ctx.lineTo(-14, 26);
  ctx.lineTo(-10.5, 8);
  ctx.closePath();
  ctx.fill();
  const finR = ctx.createLinearGradient(10, 0, 24, 0);
  finR.addColorStop(0, "#b12b25");
  finR.addColorStop(1, "#7e211d");
  ctx.fillStyle = finR;
  ctx.beginPath();
  ctx.moveTo(10.5, 25);
  ctx.quadraticCurveTo(22, 30, 24, 39);
  ctx.lineTo(14, 26);
  ctx.lineTo(10.5, 8);
  ctx.closePath();
  ctx.fill();

  // ── body: metallic cylinder ──
  const body = ctx.createLinearGradient(-11, 0, 11, 0);
  body.addColorStop(0, "#f8fafd");
  body.addColorStop(0.42, "#e6ecf4");
  body.addColorStop(0.75, "#b9c5d4");
  body.addColorStop(1, "#7e8c9d".slice(0, 7));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-11, 26);
  ctx.lineTo(-11, -12);
  ctx.lineTo(11, -12);
  ctx.lineTo(11, 26);
  ctx.closePath();
  ctx.fill();
  // panel seams
  ctx.strokeStyle = "rgba(70,90,110,0.28)";
  ctx.lineWidth = 0.8;
  for (const py of [-4, 12]) {
    ctx.beginPath();
    ctx.moveTo(-11, py);
    ctx.lineTo(11, py);
    ctx.stroke();
  }
  // blue accent band
  const band = ctx.createLinearGradient(-11, 0, 11, 0);
  band.addColorStop(0, "#3b82f6");
  band.addColorStop(1, "#1e3a8a");
  ctx.fillStyle = band;
  ctx.fillRect(-11, 16, 22, 4.6);

  // ── nose cone ──
  const nose = ctx.createLinearGradient(0, -44, 0, -10);
  nose.addColorStop(0, "#ff7a63");
  nose.addColorStop(1, "#c53030");
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(-11, -12);
  ctx.quadraticCurveTo(-5, -38, 0, -44);
  ctx.quadraticCurveTo(5, -38, 11, -12);
  ctx.closePath();
  ctx.fill();
  // gloss streak
  ctx.save();
  ctx.rotate(-0.22);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-6, -22, 1.8, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── porthole ──
  ctx.fillStyle = "#c7d3e2";
  ctx.beginPath();
  ctx.arc(0, 2, 8.2, 0, Math.PI * 2);
  ctx.fill();
  const glass = ctx.createRadialGradient(-2.4, -0.5, 0.5, 0, 2, 7);
  glass.addColorStop(0, "#bfe6ff");
  glass.addColorStop(0.55, "#57a8e8");
  glass.addColorStop(1, "#1e5a9e");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.arc(0, 2, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#55657a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 2, 8.2, 0, Math.PI * 2);
  ctx.stroke();
  // reflection arc on the glass
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-1, 0.6, 4.2, -2.4, -1.1);
  ctx.stroke();

  ctx.restore();
}

/** Big Hebrew milestone caption with pop-in / fade-out. k runs 0→1. */
function drawCaption(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, k: number) {
  if (k <= 0 || k >= 1) return;
  const fadeIn = Math.min(1, k / 0.12);
  const fadeOut = Math.min(1, (1 - k) / 0.18);
  const alpha = Math.min(fadeIn, fadeOut);
  const pop = 1 + 0.2 * Math.max(0, 1 - k / 0.12);
  ctx.save();
  ctx.translate(W / 2, H * 0.16);
  ctx.scale(pop, pop);
  ctx.globalAlpha = alpha;
  ctx.direction = "rtl";
  ctx.font = "900 30px Heebo, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(10,20,55,0.9)";
  ctx.lineWidth = 8;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

interface Puff {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  life: number; // 0..1 remaining
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

    const earthDisc = paintEarthDisc(360);
    const nebula = quick ? null : paintNebula(W, H);
    const rng = mulberry32(9);
    const stars = Array.from({ length: 150 }, () => ({
      x: rng() * W,
      y: rng() * H,
      r: 0.5 + rng() * 1.7,
      tw: rng() * Math.PI * 2,
      hue: rng(), // 0..1 → white / warm / cool
    }));
    const streakAngles = Array.from({ length: 120 }, () => rng() * Math.PI * 2);
    const clouds = Array.from({ length: 9 }, () => ({
      x: rng() * W,
      y: rng() * H,
      w: 70 + rng() * 130,
      speed: 0.6 + rng() * 0.8,
    }));
    const puffs: Puff[] = [];

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

    const starColor = (hue: number, alpha: number) =>
      hue < 0.72
        ? `rgba(255,255,255,${alpha})`
        : hue < 0.86
          ? `rgba(255,214,165,${alpha})`
          : `rgba(168,208,255,${alpha})`;

    const drawStars = (alpha: number, t: number) => {
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + s.tw);
        ctx.fillStyle = starColor(s.hue, alpha * (0.4 + 0.6 * tw));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.8 + tw * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawStreaks = (speed: number) => {
      const cx = W / 2;
      const cy = H / 2;
      for (let i = 0; i < streakAngles.length; i++) {
        const a = streakAngles[i];
        const near = 30 + ((i * 37) % 90);
        const len = near + speed * (90 + ((i * 53) % 160));
        const grad = ctx.createLinearGradient(
          cx + Math.cos(a) * near, cy + Math.sin(a) * near,
          cx + Math.cos(a) * len, cy + Math.sin(a) * len
        );
        grad.addColorStop(0, "rgba(210,225,255,0.05)");
        grad.addColorStop(1, i % 5 === 0 ? "rgba(190,220,255,0.95)" : "rgba(235,242,255,0.85)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1 + (i % 3);
        ctx.globalAlpha = 0.3 + 0.6 * Math.min(1, speed);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const drawCloud = (x: number, y: number, w: number) => {
      const g = ctx.createRadialGradient(x, y, w * 0.12, x, y, w);
      g.addColorStop(0, "rgba(255,255,255,0.92)");
      g.addColorStop(0.55, "rgba(255,255,255,0.65)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.36);
      ctx.translate(-x, -y);
      ctx.beginPath();
      ctx.arc(x, y, w, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

    const spawnPuffs = (x: number, y: number, count: number, spread: number) => {
      for (let i = 0; i < count; i++) {
        puffs.push({
          x: x + (Math.random() - 0.5) * spread,
          y: y + Math.random() * 8,
          r: 6 + Math.random() * 12,
          vx: (Math.random() - 0.5) * 60,
          vy: 20 + Math.random() * 50,
          life: 1,
        });
      }
    };

    let lastT = 0;
    const drawPuffs = (dt: number, rise: number) => {
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life -= dt * 0.8;
        if (p.life <= 0) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += (p.vy + rise) * dt;
        p.r += dt * 26;
        const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(232,238,246,${0.5 * p.life})`);
        g.addColorStop(1, "rgba(200,210,224,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawEarth = (er: number, ex: number, ey: number) => {
      // outer atmosphere glow (two soft rings)
      const glow = ctx.createRadialGradient(ex, ey, er * 0.94, ex, ey, er * 1.22);
      glow.addColorStop(0, "rgba(110,180,255,0.5)");
      glow.addColorStop(0.5, "rgba(80,150,255,0.18)");
      glow.addColorStop(1, "rgba(60,120,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey, er * 1.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(earthDisc, ex - er, ey - er, er * 2, er * 2);
    };

    const drawMoon = (x: number, y: number, r: number) => {
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, "#f4f2ec");
      g.addColorStop(1, "#b9b4a8");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(120,115,105,0.35)";
      for (const [dx, dy, cr] of [[-0.3, 0.1, 0.16], [0.25, -0.2, 0.12], [0.1, 0.35, 0.1]] as const) {
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, cr * r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawSatellite = (t: number) => {
      const k = ((t * 0.09) % 1.3) - 0.15;
      const sx = W * k;
      const sy = H * 0.22 + Math.sin(k * 4) * 14;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(0.25);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = "#2b4d8f";
      ctx.fillRect(-19, -3, 11, 6);
      ctx.fillRect(8, -3, 11, 6);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -9);
      ctx.stroke();
      ctx.restore();
    };

    const draw = (t: number) => {
      const dt = Math.min(0.05, t - lastT);
      lastT = t;
      ctx.clearRect(0, 0, W, H);

      if (quick) {
        ctx.fillStyle = "#04060f";
        ctx.fillRect(0, 0, W, H);
        drawStars(0.9, t);
        drawRocket(ctx, W / 2, H * (1 - t / total) * 0.8 + H * 0.1, 1.4, true, t);
        return;
      }

      if (flight.dir === "up") {
        if (t < 1.5) {
          // ── countdown on the launchpad ──
          drawSkyUp(0.05);
          // ground + pad
          ctx.fillStyle = "#243447";
          ctx.fillRect(0, H * 0.86, W, H * 0.14);
          ctx.fillStyle = "#31465e";
          ctx.fillRect(W / 2 - 70, H * 0.85, 140, 12);
          // gantry tower with truss lines
          ctx.fillStyle = "#38506b";
          ctx.fillRect(W / 2 + 44, H * 0.5, 15, H * 0.36);
          ctx.strokeStyle = "rgba(160,185,215,0.5)";
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 7; i++) {
            const ty = H * 0.52 + i * H * 0.048;
            ctx.beginPath();
            ctx.moveTo(W / 2 + 44, ty);
            ctx.lineTo(W / 2 + 59, ty + H * 0.024);
            ctx.stroke();
          }
          // floodlights
          for (const fx of [W / 2 - 120, W / 2 + 120]) {
            const fg = ctx.createRadialGradient(fx, H * 0.86, 2, fx, H * 0.86, 60);
            fg.addColorStop(0, "rgba(255,240,200,0.5)");
            fg.addColorStop(1, "rgba(255,240,200,0)");
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(fx, H * 0.86, 60, 0, Math.PI * 2);
            ctx.fill();
          }
          // venting steam
          if (Math.random() < 0.5) spawnPuffs(W / 2 - 14, H * 0.8, 1, 10);
          drawPuffs(dt, -30);
          drawRocket(ctx, W / 2, H * 0.74, 2.0, false, t);
          const num = Math.max(1, 3 - Math.floor(t));
          const pop = 1 + 0.25 * (1 - ((t % 1) + 1) % 1);
          ctx.save();
          ctx.translate(W / 2, H * 0.3);
          ctx.scale(pop, pop);
          ctx.font = "900 110px Heebo, sans-serif";
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(255,200,80,0.8)";
          ctx.shadowBlur = 30;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "rgba(20,40,90,0.9)";
          ctx.lineWidth = 10;
          ctx.strokeText(String(num), 0, 0);
          ctx.fillText(String(num), 0, 0);
          ctx.restore();
        } else if (t < UP_ARRIVE) {
          // ── liftoff: shake, flame, smoke, clouds streaming down ──
          const k = (t - 1.5) / (UP_ARRIVE - 1.5); // 0→1
          drawSkyUp(k * 0.75);
          const shake = (1 - k) * 4.5;
          ctx.save();
          ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          for (const c of clouds) {
            c.y += (6 + k * 22) * c.speed;
            if (c.y > H + 40) { c.y = -40; c.x = Math.random() * W; }
            drawCloud(c.x, c.y, c.w);
          }
          drawStars(k * 0.8, t);
          const ry = H * 0.74 - k * H * 0.45;
          const rs = 2.0 - k * 0.5;
          spawnPuffs(W / 2, ry + 34 * rs, 2, 16);
          drawPuffs(dt, 60);
          drawRocket(ctx, W / 2, ry, rs, true, t);
          ctx.restore();
          drawCaption(ctx, W, H, "ממריאים! 🚀", k);
        } else if (t < 4.1) {
          // ── atmosphere breakout: hyperspeed star streaks ──
          const k = (t - UP_ARRIVE) / (4.1 - UP_ARRIVE);
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          if (nebula) ctx.drawImage(nebula, 0, 0);
          drawStreaks(0.3 + k * 2.4);
          drawRocket(ctx, W / 2, H / 2, 1.1, true, t);
          drawCaption(ctx, W, H, "פורצים את האטמוספרה! ✨", k);
        } else {
          // ── free space: Earth floats away behind us ──
          const k = (t - 4.1) / (total - 4.1);
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          if (nebula) ctx.drawImage(nebula, 0, 0);
          drawStars(1, t);
          drawMoon(W * 0.82, H * 0.18, 26);
          drawSatellite(t);
          const er = H * (0.5 - k * 0.34);
          const ey = H * (0.95 + k * 0.25);
          drawEarth(er, W / 2, ey);
          drawRocket(ctx, W / 2 + k * 60, H * 0.42 - k * H * 0.3, 1.1 - k * 0.35, true, t);
          drawCaption(ctx, W, H, "הגענו לחלל! 🌌", k);
        }
      } else {
        // ── coming home: Earth grows → streaks → fiery re-entry ──
        if (t < 1.0) {
          const k = t / 1.0;
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          if (nebula) ctx.drawImage(nebula, 0, 0);
          drawStars(1, t);
          drawMoon(W * 0.18, H * 0.14, 22);
          const er = H * (0.16 + k * 0.3);
          const ey = H * (1.18 - k * 0.16);
          drawEarth(er, W / 2, ey);
          drawRocket(ctx, W / 2, H * 0.4, 1.1, true, t);
          drawCaption(ctx, W, H, "חוזרים הביתה! 🌍", k);
        } else if (t < DOWN_ARRIVE) {
          const k = (t - 1.0) / (DOWN_ARRIVE - 1.0);
          ctx.fillStyle = "#04060f";
          ctx.fillRect(0, 0, W, H);
          drawStreaks(0.3 + k * 2.2);
          drawRocket(ctx, W / 2, H / 2, 1.1, true, t);
        } else {
          // re-entry: heat glow + clouds rushing up
          const k = (t - DOWN_ARRIVE) / (total - DOWN_ARRIVE);
          drawSkyUp(0.7 - k * 0.65);
          for (const c of clouds) {
            c.y -= (8 + (1 - k) * 18) * c.speed;
            if (c.y < -40) { c.y = H + 40; c.x = Math.random() * W; }
            drawCloud(c.x, c.y, c.w);
          }
          // heat shield glow (fades as we slow down)
          const glow = Math.max(0, 1 - k * 1.6);
          if (glow > 0) {
            const gy = H * 0.5 - 40;
            const grad = ctx.createRadialGradient(W / 2, gy, 6, W / 2, gy, 130);
            grad.addColorStop(0, `rgba(255,190,70,${0.85 * glow})`);
            grad.addColorStop(0.5, `rgba(255,110,30,${0.4 * glow})`);
            grad.addColorStop(1, "rgba(255,80,20,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(W / 2, gy, 130, 0, Math.PI * 2);
            ctx.fill();
            // plasma streaks racing past
            ctx.strokeStyle = `rgba(255,170,60,${0.5 * glow})`;
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 7; i++) {
              const px = W / 2 + (i - 3) * 26 + Math.sin(t * 9 + i) * 5;
              ctx.beginPath();
              ctx.moveTo(px, H * 0.34);
              ctx.lineTo(px + 6, H * 0.52);
              ctx.stroke();
            }
          }
          ctx.save();
          ctx.translate(W / 2, H * 0.5);
          ctx.rotate(Math.PI); // nose down
          drawRocket(ctx, 0, 0, 1.6, glow > 0.1, t);
          ctx.restore();
          // parachute at the very end
          if (k > 0.7) {
            const stripes = ["#f2b134", "#ef5f52", "#f2b134", "#ef5f52", "#f2b134"];
            const pr = 62;
            const py = H * 0.5 - 112;
            for (let i = 0; i < 5; i++) {
              ctx.fillStyle = stripes[i];
              ctx.beginPath();
              ctx.moveTo(W / 2, py);
              ctx.arc(W / 2, py, pr, Math.PI + (i * Math.PI) / 5, Math.PI + ((i + 1) * Math.PI) / 5);
              ctx.closePath();
              ctx.fill();
            }
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.lineWidth = 2;
            for (const dx of [-pr + 4, -pr / 2, 0, pr / 2, pr - 4]) {
              ctx.beginPath();
              ctx.moveTo(W / 2 + dx, py + (Math.abs(dx) > pr / 2 ? 6 : 0));
              ctx.lineTo(W / 2, H * 0.5 - 32);
              ctx.stroke();
            }
            drawCaption(ctx, W, H, "המצנח נפתח! 🪂", (k - 0.7) / 0.3);
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
