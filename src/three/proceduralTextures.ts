// Procedural textures & sprites shared by the globe and solar-system scenes.
// Everything is painted on canvases at runtime — no image assets, fully offline.

import * as THREE from "three";
import type { PlanetSpec } from "../data/planets";
import { fbm2D } from "./noise";

/** Deterministic PRNG so textures look identical on every launch. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

// ─── Starfield ────────────────────────────────────────────────────────────────

export function makeStarField(count: number, rMin: number, rMax: number, seed = 42): THREE.Points {
  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Uniform direction
    const u = rng() * 2 - 1;
    const phi = rng() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    const r = rMin + rng() * (rMax - rMin);
    positions[i * 3] = sq * Math.cos(phi) * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = sq * Math.sin(phi) * r;

    // Mostly white, a few warm/cool tints
    const t = rng();
    if (t < 0.75) color.setHSL(0, 0, 0.75 + rng() * 0.25);
    else if (t < 0.87) color.setHSL(0.08, 0.7, 0.75); // warm
    else color.setHSL(0.6, 0.6, 0.8); // cool
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/** Soft radial-gradient sprite texture (for glows and nebulae). */
export function makeGlowTexture(inner: string, outer: string, size = 256): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addNebulae(scene: THREE.Scene, seed = 7, count = 5, distance = 900): THREE.Sprite[] {
  const rng = mulberry32(seed);
  const palettes: [string, string][] = [
    ["rgba(147,112,219,0.55)", "rgba(147,112,219,0)"],
    ["rgba(64,160,255,0.5)", "rgba(64,160,255,0)"],
    ["rgba(255,120,180,0.45)", "rgba(255,120,180,0)"],
    ["rgba(80,220,200,0.4)", "rgba(80,220,200,0)"],
  ];
  const sprites: THREE.Sprite[] = [];
  for (let i = 0; i < count; i++) {
    const [inner, outer] = palettes[Math.floor(rng() * palettes.length)];
    const tex = makeGlowTexture(inner, outer, 256);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    const u = rng() * 2 - 1;
    const phi = rng() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    sprite.position.set(sq * Math.cos(phi) * distance, u * distance * 0.6, sq * Math.sin(phi) * distance);
    const s = 300 + rng() * 380;
    sprite.scale.set(s, s, 1);
    scene.add(sprite);
    sprites.push(sprite);
  }
  return sprites;
}

// ─── Hebrew text label sprite ────────────────────────────────────────────────

export function makeTextSprite(text: string, opts?: { fontSize?: number; color?: string; stroke?: string }): THREE.Sprite {
  const fontSize = opts?.fontSize ?? 64;
  const pad = fontSize * 0.5;
  const font = `800 ${fontSize}px Heebo, "Segoe UI", sans-serif`;

  const [measureCanvas, measureCtx] = makeCanvas(8, 8);
  void measureCanvas;
  measureCtx.font = font;
  const w = Math.ceil(measureCtx.measureText(text).width + pad * 2);
  const h = Math.ceil(fontSize * 1.6);

  const [canvas, ctx] = makeCanvas(w, h);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = opts?.stroke ?? "rgba(10,20,50,0.9)";
  ctx.lineWidth = fontSize * 0.18;
  ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = opts?.color ?? "#ffffff";
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(w / h, 1, 1); // keep aspect; caller multiplies overall size
  return sprite;
}

// ─── FBM noise painting helpers ──────────────────────────────────────────────

/**
 * Paint a small grayscale FBM field and stretch it over the target context
 * with the given blend mode — cheap "surface richness" for any planet.
 * The noise wraps horizontally so the sphere seam is invisible.
 */
export function overlayNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  alpha = 0.22,
  scale = 5,
  mode: GlobalCompositeOperation = "overlay",
) {
  const nw = 192;
  const nh = 96;
  const [noiseCanvas, nctx] = makeCanvas(nw, nh);
  const img = nctx.createImageData(nw, nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      // sample on a cylinder so the left/right edges match (no seam)
      const ang = (x / nw) * Math.PI * 2;
      const nx = Math.cos(ang) * scale;
      const nz = Math.sin(ang) * scale;
      const ny = (y / nh) * scale * 2;
      const v =
        fbm2D(nx + 31.7, ny, seed, 4) * 0.5 + fbm2D(nz + 77.3, ny, seed + 5, 4) * 0.5;
      const g = Math.floor(v * 255);
      const i = (y * nw + x) * 4;
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  nctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(noiseCanvas, 0, 0, w, h);
  ctx.restore();
}

/** Transparent cloud layer texture: white puffs from thresholded FBM. */
export function makeCloudTexture(seed = 8): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const nw = 256;
  const nh = 128;
  const [small, sctx] = makeCanvas(nw, nh);
  const img = sctx.createImageData(nw, nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const ang = (x / nw) * Math.PI * 2;
      const nx = Math.cos(ang) * 3.4;
      const nz = Math.sin(ang) * 3.4;
      const ny = (y / nh) * 6.4;
      const v = fbm2D(nx + 11, ny, seed, 5) * 0.55 + fbm2D(nz + 53, ny + 9, seed + 3, 5) * 0.45;
      // clouds where the field is dense; soft edges; thinner near poles
      const polar = Math.sin((y / nh) * Math.PI);
      const a = Math.max(0, (v - 0.52) * 3.4) * (0.35 + 0.65 * polar);
      const i = (y * nw + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(235, Math.floor(a * 255));
    }
  }
  sctx.putImageData(img, 0, 0);
  const [canvas, ctx] = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Planet surface painters ─────────────────────────────────────────────────

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

function paintCraters(ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, base: string, n: number) {
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const y = h * 0.12 + rng() * h * 0.76;
    const r = 3 + rng() * (w / 28);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = shade(base, -0.09 - rng() * 0.08);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y - r * 0.18, r * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = shade(base, 0.05);
    ctx.fill();
  }
}

function paintBlotches(ctx: CanvasRenderingContext2D, w: number, h: number, rng: () => number, color: string, n: number, alpha = 0.35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const rx = w / 22 + rng() * (w / 8);
    const ry = rx * (0.4 + rng() * 0.5);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

/** Paint a planet texture per its visual spec. Returns a THREE texture. */
export function makePlanetTexture(spec: PlanetSpec, seed = 5): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const [canvas, ctx] = makeCanvas(w, h);
  const rng = mulberry32(seed + spec.id.length * 31 + spec.id.charCodeAt(0));
  const noiseSeed = seed * 7 + spec.id.charCodeAt(0) * 3 + spec.id.length;

  // Base
  ctx.fillStyle = spec.baseColor;
  ctx.fillRect(0, 0, w, h);

  switch (spec.style) {
    case "sun": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(spec.baseColor, 0.12));
      g.addColorStop(0.5, spec.baseColor);
      g.addColorStop(1, shade(spec.accentColor, 0.02));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      paintBlotches(ctx, w, h, rng, shade(spec.accentColor, 0.08), 26, 0.3);
      paintBlotches(ctx, w, h, rng, shade(spec.baseColor, 0.18), 18, 0.35);
      // granulation: boiling-surface cells
      overlayNoise(ctx, w, h, noiseSeed, 0.4, 9, "overlay");
      overlayNoise(ctx, w, h, noiseSeed + 4, 0.22, 17, "soft-light");
      break;
    }
    case "banded": {
      const bands = 9 + Math.floor(rng() * 4);
      for (let i = 0; i < bands; i++) {
        const y0 = (i / bands) * h;
        const bh = h / bands;
        const t = i % 2 === 0 ? 0.06 : -0.06;
        ctx.fillStyle = shade(i % 3 === 0 ? spec.accentColor : spec.baseColor, t + (rng() - 0.5) * 0.06);
        ctx.fillRect(0, y0, w, bh + 1);
        // wavy seam
        ctx.fillStyle = shade(spec.accentColor, -0.05);
        ctx.globalAlpha = 0.25;
        for (let x = 0; x < w; x += 8) {
          const yw = y0 + Math.sin(x / 26 + i * 2) * 2.5;
          ctx.fillRect(x, yw, 8, 2);
        }
        ctx.globalAlpha = 1;
      }
      // flowing turbulence along the bands
      overlayNoise(ctx, w, h, noiseSeed, 0.3, 7, "overlay");
      if (spec.id === "jupiter") {
        // The Great Red Spot — a storm with swirl rings
        const sx = w * 0.68;
        const sy = h * 0.62;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-0.12);
        const swirls: [number, number, string][] = [
          [w * 0.085, h * 0.1, "#a93226"],
          [w * 0.068, h * 0.082, "#c0392b"],
          [w * 0.05, h * 0.06, "#e74c3c"],
          [w * 0.03, h * 0.036, "#ec7063"],
        ];
        for (const [rx, ry, color] of swirls) {
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case "cloudy": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(spec.baseColor, 0.06));
      g.addColorStop(1, shade(spec.accentColor, -0.02));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      paintBlotches(ctx, w, h, rng, shade(spec.baseColor, 0.14), 30, 0.4);
      paintBlotches(ctx, w, h, rng, shade(spec.accentColor, -0.05), 16, 0.25);
      // thick swirling cloud decks
      overlayNoise(ctx, w, h, noiseSeed, 0.35, 4, "overlay");
      overlayNoise(ctx, w, h, noiseSeed + 9, 0.18, 11, "soft-light");
      break;
    }
    case "icy": {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(spec.baseColor, 0.1));
      g.addColorStop(0.5, spec.baseColor);
      g.addColorStop(1, shade(spec.accentColor, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.16;
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? shade(spec.accentColor, 0.08) : shade(spec.baseColor, 0.12);
        const y = rng() * h;
        ctx.fillRect(0, y, w, 6 + rng() * 14);
      }
      ctx.globalAlpha = 1;
      // methane haze wisps
      overlayNoise(ctx, w, h, noiseSeed, 0.16, 3, "soft-light");
      if (spec.id === "neptune") {
        // The Great Dark Spot
        ctx.beginPath();
        ctx.ellipse(w * 0.38, h * 0.44, w * 0.06, h * 0.07, 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(20,40,110,0.55)";
        ctx.fill();
      }
      break;
    }
    case "rocky": {
      paintBlotches(ctx, w, h, rng, shade(spec.accentColor, 0), 24, 0.4);
      paintBlotches(ctx, w, h, rng, shade(spec.baseColor, 0.08), 20, 0.32);
      paintCraters(ctx, w, h, rng, spec.baseColor, 26);
      overlayNoise(ctx, w, h, noiseSeed, 0.3, 8, "overlay");
      if (spec.id === "mars") {
        // Valles Marineris — a giant canyon scar (FBM-displaced ridge line)
        ctx.save();
        ctx.strokeStyle = shade(spec.baseColor, -0.22);
        ctx.lineWidth = h * 0.028;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let x = w * 0.18; x <= w * 0.52; x += 8) {
          const t = x / w;
          const y = h * 0.55 + (fbm2D(t * 9, 3.7, 61, 3) - 0.5) * h * 0.09;
          if (x === w * 0.18) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        // Olympus Mons — the tallest volcano in the solar system
        const vx = w * 0.72;
        const vy = h * 0.4;
        const vr = w * 0.045;
        const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, vr);
        vg.addColorStop(0, shade(spec.baseColor, -0.16));
        vg.addColorStop(0.35, shade(spec.baseColor, 0.1));
        vg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vg;
        ctx.beginPath();
        ctx.arc(vx, vy, vr, 0, Math.PI * 2);
        ctx.fill();
        // polar caps
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.ellipse(w / 2, 6, w * 0.32, h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w / 2, h - 6, w * 0.28, h * 0.045, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "moon": {
      paintBlotches(ctx, w, h, rng, shade(spec.accentColor, 0), 16, 0.3);
      paintCraters(ctx, w, h, rng, spec.baseColor, 34);
      overlayNoise(ctx, w, h, noiseSeed, 0.26, 10, "overlay");
      if (spec.id === "pluto") {
        // Pluto's heart 💙
        ctx.save();
        ctx.translate(w * 0.52, h * 0.58);
        ctx.scale(2.2, 2.2);
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(-14, -8, -4, -18, 0, -9);
        ctx.bezierCurveTo(4, -18, 14, -8, 0, 6);
        ctx.fillStyle = "rgba(255,244,222,0.9)";
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "earth": {
      // Fallback only — the real Earth texture is painted from TopoJSON
      // (three/earthPainter.ts). If geo data failed to load, paint FBM
      // continents so Earth is never a plain blue ball.
      const og = ctx.createLinearGradient(0, 0, 0, h);
      og.addColorStop(0, "#a8d8f0");
      og.addColorStop(0.5, "#1e6fb8");
      og.addColorStop(1, "#a8d8f0");
      ctx.fillStyle = og;
      ctx.fillRect(0, 0, w, h);
      const nw = 256;
      const nh = 128;
      const [land, lctx] = makeCanvas(nw, nh);
      const img = lctx.createImageData(nw, nh);
      for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
          const ang = (x / nw) * Math.PI * 2;
          const v = fbm2D(Math.cos(ang) * 3 + 9, (y / nh) * 6, 17, 5) * 0.5 +
                    fbm2D(Math.sin(ang) * 3 + 41, (y / nh) * 6 + 2, 23, 5) * 0.5;
          const i = (y * nw + x) * 4;
          if (v > 0.52) {
            img.data[i] = 63; img.data[i + 1] = 160; img.data[i + 2] = 96; img.data[i + 3] = 255;
          } else {
            img.data[i + 3] = 0;
          }
        }
      }
      lctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(land, 0, 0, w, h);
      // polar ice
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(0, 0, w, h * 0.045);
      ctx.fillRect(0, h * 0.955, w, h * 0.045);
      break;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Saturn's rings — translucent banded annulus with a real Cassini gap. */
export function makeRingTexture(): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, 16);
  const bands: [number, number, string][] = [
    [0.0, 0.1, "rgba(180,150,110,0.0)"],
    [0.1, 0.2, "rgba(190,168,132,0.4)"],   // C ring (dim, inner)
    [0.2, 0.24, "rgba(150,125,90,0.2)"],
    [0.24, 0.52, "rgba(230,208,170,0.88)"], // B ring (bright)
    [0.52, 0.58, "rgba(90,75,55,0.06)"],    // Cassini division — the famous gap
    [0.58, 0.8, "rgba(210,186,148,0.72)"],  // A ring
    [0.8, 0.83, "rgba(140,118,88,0.15)"],   // Encke gap
    [0.83, 0.92, "rgba(205,180,140,0.6)"],
    [0.92, 1.0, "rgba(205,180,140,0.0)"],
  ];
  for (const [a, b, color] of bands) {
    ctx.fillStyle = color;
    ctx.fillRect(a * size, 0, (b - a) * size, 16);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Atmosphere (fresnel glow) ───────────────────────────────────────────────

export function makeAtmosphere(radius: number, color = 0x6fb7ff, intensity = 1.0): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      void main() {
        float a = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, -1.0)), 3.5);
        gl_FragColor = vec4(glowColor, a * intensity);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}
