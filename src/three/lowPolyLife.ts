// Marine-creature builders 2.0 — smooth lathe-profile bodies, real
// countershading and patterns painted as vertex colors, shaped fins and a
// named animation rig (tail / flukes / fins / arms) that OceanDiveScene
// drives every frame. Fully procedural — no model files, no image assets,
// and no canvas dependency (works headless in unit tests).

import * as THREE from "three";
import type { MarineCreature } from "../data/marineLife";

// ─── Small helpers ────────────────────────────────────────────────────────────

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Deterministic 2D hash → [0,1) for procedural spots. */
const hash2 = (u: number, v: number) => {
  const s = Math.sin(u * 127.1 + v * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function solidMat(color: string | number, opts?: {
  rough?: number; metal?: number; emissive?: string; emissiveIntensity?: number;
  opacity?: number; side?: THREE.Side; flat?: boolean;
}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.rough ?? 0.6,
    metalness: opts?.metal ?? 0.05,
    flatShading: opts?.flat ?? false,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts?.emissive ? (opts?.emissiveIntensity ?? 0.8) : 0,
    transparent: opts?.opacity !== undefined,
    opacity: opts?.opacity ?? 1,
    side: opts?.side ?? THREE.FrontSide,
  });
}

/** Material for vertex-colored bodies (color multiplies, keep white). */
function bodyMat(opts?: { rough?: number; emissive?: string; emissiveIntensity?: number }) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: opts?.rough ?? 0.55,
    metalness: 0.04,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts?.emissive ? (opts?.emissiveIntensity ?? 0.3) : 0,
  });
}

/** Fin membrane material — slightly translucent, double-sided. */
function finMat(color: string, opacity = 0.96) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.04,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
}

// ─── Vertex-color painting ────────────────────────────────────────────────────

/**
 * Paint fn gets body-normalized coords: nx along the body (-1 tail → +1 nose),
 * ny up (-1 belly → +1 back), nz side (-1..+1); returns the vertex color.
 */
type PaintFn = (nx: number, ny: number, nz: number) => THREE.Color;

function paintVerts(geo: THREE.BufferGeometry, fn: PaintFn) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const mid = new THREE.Vector3();
  bb.getCenter(mid);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const nx = size.x > 1e-6 ? ((pos.getX(i) - mid.x) / size.x) * 2 : 0;
    const ny = size.y > 1e-6 ? ((pos.getY(i) - mid.y) / size.y) * 2 : 0;
    const nz = size.z > 1e-6 ? ((pos.getZ(i) - mid.z) / size.z) * 2 : 0;
    const c = fn(nx, ny, nz);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Real-fish countershading: dark back fading to a light belly. */
function countershade(back: string, belly: string): PaintFn {
  const b = new THREE.Color(back);
  const be = new THREE.Color(belly);
  return (_nx, ny) => be.clone().lerp(b, smooth(-0.55, 0.35, ny));
}

function patternPaint(c: MarineCreature): PaintFn {
  const base = countershade(c.color, c.accentColor);
  const white = new THREE.Color("#f8fafc");
  const dark = new THREE.Color("#0f172a");
  switch (c.pattern) {
    case "clown":
      return (nx, ny, nz) => {
        for (const center of [0.55, -0.02, -0.62]) {
          const d = Math.abs(nx - center);
          if (d < 0.11) return white.clone();
          if (d < 0.16) return dark.clone();
        }
        return base(nx, ny, nz);
      };
    case "tang": {
      const yellow = new THREE.Color("#fbbf24");
      return (nx, ny, nz) => {
        if (nx < -0.62) return yellow.clone(); // tail wedge
        const ex = (nx + 0.05) / 0.55;
        const ey = (ny - 0.25) / 0.42;
        if (ex * ex + ey * ey < 1) return dark.clone(); // the "palette" mark
        return base(nx, ny, nz);
      };
    }
    case "angel": {
      const a = new THREE.Color(c.color);
      const b = new THREE.Color(c.accentColor);
      return (nx) => (Math.floor((nx + 1) * 2.6) % 2 === 0 ? a.clone() : b.clone());
    }
    case "lionfish":
      return (nx, ny, nz) =>
        Math.sin(nx * 16 + ny * 2) > 0.2 ? new THREE.Color("#fee2e2") : base(nx, ny, nz);
    case "spots": {
      const spot = new THREE.Color(c.accentColor).lerp(white, 0.4);
      return (nx, ny, nz) => {
        const ang = Math.atan2(nz, ny); // around the body
        const u = Math.floor(nx * 5 + 50);
        const v = Math.floor((ang / Math.PI) * 3.2 + 50);
        const fu = nx * 5 + 50 - u;
        const fv = (ang / Math.PI) * 3.2 + 50 - v;
        if (hash2(u, v) < 0.42 && Math.hypot(fu - 0.5, fv - 0.5) < 0.26) return spot.clone();
        return base(nx, ny, nz);
      };
    }
    case "orca":
      return (nx, ny, nz) => {
        // white chin + belly sweep
        if (ny < -0.34 || (nx > 0.62 && ny < 0.1)) return white.clone();
        // the famous oval eye patch on each side
        const ex = (nx - 0.42) / 0.16;
        const ey = (ny - 0.34) / 0.13;
        if (ex * ex + ey * ey < 1 && Math.abs(nz) > 0.25) return white.clone();
        // grey saddle behind the dorsal fin
        const sx = (nx + 0.28) / 0.2;
        const sy = (ny - 0.42) / 0.2;
        if (sx * sx + sy * sy < 1) return new THREE.Color("#94a3b8");
        return new THREE.Color(c.color);
      };
    case "shimmer": {
      return (nx, ny, nz) => {
        const col = base(nx, ny, nz);
        const s = 0.5 + 0.5 * Math.sin(nx * 20);
        return col.lerp(white, s * 0.18);
      };
    }
    default:
      return base;
  }
}

// ─── Body / fin geometry ──────────────────────────────────────────────────────

/** profile: [t (0 tail → 1 nose), radius as fraction of len] */
function makeBody(
  len: number,
  profile: [number, number][],
  opts?: { sy?: number; sz?: number; seg?: number }
): THREE.BufferGeometry {
  // densify the silhouette through a spline so the body is smooth AND has
  // enough rings along its length for crisp vertex-color patterns
  const raw = profile.map(([t, r]) => new THREE.Vector2(Math.max(0.004, r * len), t * len));
  const pts = new THREE.SplineCurve(raw).getPoints(36).map((p) => new THREE.Vector2(Math.max(0.004, p.x), p.y));
  const geo = new THREE.LatheGeometry(pts, opts?.seg ?? 30);
  geo.rotateZ(-Math.PI / 2); // profile axis → +X (nose at +X)
  geo.center();
  geo.scale(1, opts?.sy ?? 1, opts?.sz ?? 1);
  geo.computeVertexNormals();
  return geo;
}

const PROFILES: Record<string, [number, number][]> = {
  fish:    [[0, 0.012], [0.06, 0.055], [0.22, 0.15], [0.46, 0.205], [0.7, 0.185], [0.88, 0.115], [0.97, 0.05], [1, 0.008]],
  shark:   [[0, 0.01], [0.08, 0.045], [0.3, 0.125], [0.55, 0.165], [0.76, 0.15], [0.92, 0.085], [1, 0.012]],
  whale:   [[0, 0.014], [0.07, 0.07], [0.25, 0.175], [0.55, 0.225], [0.8, 0.215], [0.95, 0.16], [1, 0.05]],
  sperm:   [[0, 0.01], [0.07, 0.05], [0.28, 0.14], [0.52, 0.185], [0.74, 0.21], [0.96, 0.2], [1, 0.09]],
  dolphin: [[0, 0.012], [0.08, 0.05], [0.3, 0.14], [0.58, 0.175], [0.83, 0.125], [0.95, 0.07], [1, 0.03]],
  blob:    [[0, 0.05], [0.2, 0.16], [0.5, 0.24], [0.75, 0.26], [0.92, 0.2], [1, 0.08]],
};

/** Crescent (forked) tail fin, drawn in the XY plane, trailing toward -X. */
function crescentTailGeo(size: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(-size * 0.5, size * 0.16, -size, size * 0.66);
  s.quadraticCurveTo(-size * 0.42, size * 0.14, -size * 0.34, 0);
  s.quadraticCurveTo(-size * 0.42, -size * 0.14, -size, -size * 0.66);
  s.quadraticCurveTo(-size * 0.5, -size * 0.16, 0, 0);
  return new THREE.ShapeGeometry(s, 8);
}

/** Rounded paddle tail (e.g. moray, gulper). */
function paddleTailGeo(size: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0.14 * size);
  s.quadraticCurveTo(-size, 0.55 * size, -size, 0);
  s.quadraticCurveTo(-size, -0.55 * size, 0, -0.14 * size);
  s.closePath();
  return new THREE.ShapeGeometry(s, 6);
}

/** Swept-back dorsal fin in the XY plane (base at y=0, sweeping to -X). */
function dorsalGeo(w: number, h: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(w * 0.28, 0);
  s.quadraticCurveTo(w * 0.24, h * 0.9, -w * 0.18, h);
  s.quadraticCurveTo(-w * 0.32, h * 0.45, -w * 0.72, 0);
  s.closePath();
  return new THREE.ShapeGeometry(s, 6);
}

/** Teardrop pectoral fin/flipper in the XY plane, pointing -X. */
function flipperGeo(len: number, wid: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(-len * 0.3, wid * 0.75, -len, wid * 0.25);
  s.quadraticCurveTo(-len * 0.85, -wid * 0.15, 0, -wid * 0.3);
  s.closePath();
  return new THREE.ShapeGeometry(s, 6);
}

// ─── Face bits ────────────────────────────────────────────────────────────────

/** A proper eye: white ball, dark pupil, tiny gleam. side = +1 / -1 (z). */
function eyeAt(x: number, y: number, z: number, r: number): THREE.Group {
  const g = new THREE.Group();
  const side = Math.sign(z) || 1;
  const white = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), solidMat("#f8fafc", { rough: 0.25 }));
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 8, 8), solidMat("#0b1220", { rough: 0.2 }));
  pupil.position.set(r * 0.18, 0, side * r * 0.55);
  const gleam = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 6, 6), solidMat("#ffffff", { emissive: "#ffffff", emissiveIntensity: 0.5 }));
  gleam.position.set(r * 0.3, r * 0.3, side * r * 0.72);
  white.add(pupil, gleam);
  white.position.set(x, y, z);
  g.add(white);
  return g;
}

function eyePair(parent: THREE.Object3D, x: number, y: number, z: number, r: number) {
  parent.add(eyeAt(x, y, z, r), eyeAt(x, y, -z, r));
}

/** Gentle smile / mouth line — a thin dark torus arc. */
function mouthArc(x: number, y: number, r: number, arc = 1.5): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.09, 5, 12, arc),
    solidMat("#1f2937", { rough: 0.4 })
  );
  m.rotation.z = Math.PI + (Math.PI - arc) / 2; // open side up (smile)
  m.position.set(x, y, 0);
  return m;
}

/** Named animation pivot with rest rotation zero. */
function pivot(name: string, x: number, y: number, z: number): THREE.Group {
  const p = new THREE.Group();
  p.name = name;
  p.position.set(x, y, z);
  return p;
}

// ─── Shared assemblies ────────────────────────────────────────────────────────

interface FishOpts {
  len?: number;
  profile?: [number, number][];
  sy?: number;
  sz?: number;
  tailSize?: number;
  dorsal?: { w: number; h: number } | null;
  pect?: { len: number; wid: number } | null;
  eyeR?: number;
  glow?: boolean;
}

/** The generic fish chassis every fish-like builder starts from. */
function fishBase(c: MarineCreature, o?: FishOpts): THREE.Group {
  const g = new THREE.Group();
  const len = o?.len ?? 1.7;
  const geo = makeBody(len, o?.profile ?? PROFILES.fish, {
    sy: o?.sy ?? 1.12,
    sz: o?.sz ?? 0.56,
  });
  paintVerts(geo, patternPaint(c));
  const body = new THREE.Mesh(
    geo,
    bodyMat(c.glows || o?.glow ? { emissive: c.accentColor, emissiveIntensity: 0.25 } : undefined)
  );
  g.add(body);

  // tail on a named pivot so the scene can wag it
  const tailP = pivot("tail", -len * 0.5, 0, 0);
  const tail = new THREE.Mesh(crescentTailGeo((o?.tailSize ?? 0.42) * len), finMat(c.accentColor));
  tailP.add(tail);
  g.add(tailP);

  if (o?.dorsal !== null) {
    const d = o?.dorsal ?? { w: len * 0.34, h: len * 0.22 };
    const dorsalP = pivot("dorsal", len * 0.05, len * 0.2 * (o?.sy ?? 1.12), 0);
    const dm = new THREE.Mesh(dorsalGeo(d.w, d.h), finMat(c.color));
    dorsalP.add(dm);
    g.add(dorsalP);
  }

  if (o?.pect !== null) {
    const p = o?.pect ?? { len: len * 0.22, wid: len * 0.12 };
    for (const s of [1, -1]) {
      const pp = pivot(s > 0 ? "pectL" : "pectR", len * 0.18, -len * 0.03, s * len * 0.16);
      const fin = new THREE.Mesh(flipperGeo(p.len, p.wid), finMat(c.accentColor));
      fin.rotation.x = s * 0.9;
      fin.rotation.y = s * 0.35;
      pp.add(fin);
      g.add(pp);
    }
  }

  eyePair(g, len * 0.33, len * 0.07, len * 0.1 * (o?.sz ?? 0.56) + len * 0.045, o?.eyeR ?? len * 0.045);
  g.add(mouthArc(len * 0.48, -len * 0.045, len * 0.05));
  return g;
}

/** Shark chassis: longer body, vertical crescent tail, gills. */
function sharkBase(c: MarineCreature, len = 2.6, sz = 0.8): THREE.Group {
  const g = new THREE.Group();
  const geo = makeBody(len, PROFILES.shark, { sy: 1, sz });
  paintVerts(geo, patternPaint(c));
  g.add(new THREE.Mesh(geo, bodyMat({ rough: 0.5 })));

  const tailP = pivot("tail", -len * 0.5, 0.02, 0);
  const tail = new THREE.Mesh(crescentTailGeo(len * 0.3), finMat(c.color));
  tail.scale.y = 1.35; // shark tails are tall
  tailP.add(tail);
  g.add(tailP);

  const dorsalP = pivot("dorsal", len * 0.04, len * 0.14, 0);
  dorsalP.add(new THREE.Mesh(dorsalGeo(len * 0.26, len * 0.2), finMat(c.color)));
  g.add(dorsalP);

  for (const s of [1, -1]) {
    const pp = pivot(s > 0 ? "pectL" : "pectR", len * 0.16, -len * 0.05, s * len * 0.1);
    const fin = new THREE.Mesh(flipperGeo(len * 0.28, len * 0.13), finMat(c.color));
    fin.rotation.x = s * 1.15;
    fin.rotation.z = -0.25;
    pp.add(fin);
    g.add(pp);
  }

  // gill slits
  for (let i = 0; i < 3; i++) {
    for (const s of [1, -1]) {
      const gill = new THREE.Mesh(
        new THREE.TorusGeometry(len * 0.045, len * 0.006, 4, 8, 1.4),
        solidMat("#1f2937")
      );
      gill.position.set(len * (0.22 + i * 0.045), 0, s * len * 0.115);
      gill.rotation.y = s * Math.PI * 0.5;
      gill.rotation.z = -0.7;
      g.add(gill);
    }
  }

  eyePair(g, len * 0.36, len * 0.045, len * 0.075, len * 0.028);
  g.add(mouthArc(len * 0.46, -len * 0.05, len * 0.045, 1.9));
  return g;
}

/** Whale chassis: horizontal flukes, side flippers, blowhole. */
function whaleBase(
  c: MarineCreature,
  o?: { len?: number; profile?: [number, number][]; flipperLen?: number }
): THREE.Group {
  const g = new THREE.Group();
  const len = o?.len ?? 3.2;
  const geo = makeBody(len, o?.profile ?? PROFILES.whale, { sy: 0.95, sz: 0.85 });
  paintVerts(geo, patternPaint(c));
  g.add(new THREE.Mesh(geo, bodyMat({ rough: 0.45 })));

  // horizontal flukes
  const flukesP = pivot("flukes", -len * 0.5, 0.02, 0);
  const flukes = new THREE.Mesh(crescentTailGeo(len * 0.26), finMat(c.color));
  flukes.rotation.x = Math.PI / 2;
  flukesP.add(flukes);
  g.add(flukesP);

  for (const s of [1, -1]) {
    const fp = pivot(s > 0 ? "flipperL" : "flipperR", len * 0.14, -len * 0.09, s * len * 0.13);
    const fl = new THREE.Mesh(flipperGeo((o?.flipperLen ?? 0.24) * len, len * 0.1), finMat(c.color));
    fl.rotation.x = s * 1.25;
    fp.add(fl);
    g.add(fp);
  }

  // blowhole
  const blow = new THREE.Mesh(new THREE.SphereGeometry(len * 0.02, 6, 6), solidMat("#1f2937"));
  blow.position.set(len * 0.3, len * 0.105, 0);
  g.add(blow);

  eyePair(g, len * 0.36, -len * 0.015, len * 0.095, len * 0.02);
  g.add(mouthArc(len * 0.45, -len * 0.06, len * 0.05, 1.7));
  return g;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

type Builder = (c: MarineCreature) => THREE.Group;

const builders: Record<string, Builder> = {
  fish(c) {
    return fishBase(c);
  },

  angelfish(c) {
    const g = fishBase(c, { len: 1.5, sy: 1.85, sz: 0.34, tailSize: 0.3, dorsal: { w: 0.55, h: 0.42 } });
    // trailing ventral fin streamers
    for (const [x, y] of [[0.1, -0.52], [-0.15, -0.45]]) {
      const streamer = new THREE.Mesh(flipperGeo(0.42, 0.1), finMat(c.accentColor, 0.9));
      streamer.position.set(x, y, 0);
      streamer.rotation.z = 0.9;
      g.add(streamer);
    }
    return g;
  },

  swordfish(c) {
    const g = fishBase(c, { len: 1.9, sy: 0.95, sz: 0.5, dorsal: { w: 0.6, h: 0.5 } });
    const bill = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.05, 1.0, 8), solidMat(c.color, { rough: 0.4 }));
    bill.rotation.z = -Math.PI / 2;
    bill.position.set(1.35, 0.02, 0);
    g.add(bill);
    return g;
  },

  flyingfish(c) {
    const g = fishBase(c, { len: 1.5, sy: 1, sz: 0.5, pect: null });
    // huge glassy wing-fins
    for (const s of [1, -1]) {
      const wp = pivot(s > 0 ? "wingL" : "wingR", 0.25, 0.08, s * 0.15);
      const wing = new THREE.Mesh(flipperGeo(1.15, 0.4), finMat(c.accentColor, 0.55));
      wing.rotation.x = s * 1.35;
      wing.rotation.y = s * 0.5;
      wp.add(wing);
      g.add(wp);
    }
    return g;
  },

  shark(c) {
    return sharkBase(c);
  },

  hammerhead(c) {
    const g = sharkBase(c, 2.5, 0.75);
    // the hammer: a smooth wide bar with an eye at each tip
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 1.15, 6, 10), solidMat(c.color, { rough: 0.5 }));
    bar.rotation.x = Math.PI / 2;
    bar.position.set(1.22, 0.03, 0);
    g.add(bar);
    for (const s of [1, -1]) {
      g.add(eyeAt(1.28, 0.03, s * 0.66, 0.07));
    }
    return g;
  },

  whaleshark(c) {
    const g = sharkBase(c, 3.4, 0.95);
    // wide flat mouth
    const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.62, 4, 8), solidMat("#16202c"));
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(1.66, -0.1, 0);
    g.add(mouth);
    // ridge lines along the back
    for (const s of [0, 1, -1]) {
      const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 1.5, 3, 6), solidMat(c.accentColor, { opacity: 0.5 }));
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(-0.1, 0.32 - Math.abs(s) * 0.09, s * 0.28);
      g.add(ridge);
    }
    return g;
  },

  whale(c) {
    return whaleBase(c, { len: 3.2 });
  },

  spermwhale(c) {
    const g = whaleBase(c, { len: 3.4, profile: PROFILES.sperm });
    // narrow lower jaw
    const jaw = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.0, 6, 8), solidMat("#d6d3d1"));
    jaw.rotation.z = Math.PI / 2;
    jaw.position.set(1.15, -0.42, 0);
    g.add(jaw);
    return g;
  },

  narwhal(c) {
    const g = whaleBase(c, { len: 2.8 });
    // the spiral tusk
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 1.7, 8), solidMat("#f3ead8", { rough: 0.4 }));
    tusk.rotation.z = -Math.PI / 2;
    tusk.position.set(2.25, 0.08, 0);
    g.add(tusk);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045 - i * 0.009, 0.008, 4, 10), solidMat("#d9cdb4"));
      ring.rotation.y = Math.PI / 2;
      ring.position.set(1.62 + i * 0.36, 0.08, 0);
      g.add(ring);
    }
    return g;
  },

  dolphin(c) {
    const g = new THREE.Group();
    const len = 2.2;
    const geo = makeBody(len, PROFILES.dolphin, { sy: 1.02, sz: 0.72 });
    paintVerts(geo, patternPaint(c));
    g.add(new THREE.Mesh(geo, bodyMat({ rough: 0.35 })));

    // rostrum (the "beak") + melon forehead
    const melon = new THREE.Mesh(new THREE.SphereGeometry(len * 0.09, 12, 10), bodyMat({ rough: 0.35 }));
    paintVerts(melon.geometry, countershade(c.color, c.accentColor));
    melon.position.set(len * 0.44, len * 0.02, 0);
    g.add(melon);
    const beak = new THREE.Mesh(new THREE.CapsuleGeometry(len * 0.035, len * 0.14, 6, 8), solidMat(c.color, { rough: 0.35 }));
    beak.rotation.z = Math.PI / 2;
    beak.position.set(len * 0.55, -len * 0.015, 0);
    g.add(beak);
    g.add(mouthArc(len * 0.55, -len * 0.045, len * 0.045, 1.6));

    const flukesP = pivot("flukes", -len * 0.5, 0.01, 0);
    const flukes = new THREE.Mesh(crescentTailGeo(len * 0.24), finMat(c.color));
    flukes.rotation.x = Math.PI / 2;
    flukesP.add(flukes);
    g.add(flukesP);

    const dorsalP = pivot("dorsal", -len * 0.02, len * 0.16, 0);
    dorsalP.add(new THREE.Mesh(dorsalGeo(len * 0.2, len * 0.15), finMat(c.color)));
    g.add(dorsalP);

    for (const s of [1, -1]) {
      const fp = pivot(s > 0 ? "flipperL" : "flipperR", len * 0.2, -len * 0.08, s * len * 0.1);
      const fl = new THREE.Mesh(flipperGeo(len * 0.18, len * 0.08), finMat(c.color));
      fl.rotation.x = s * 1.2;
      fp.add(fl);
      g.add(fp);
    }
    eyePair(g, len * 0.42, len * 0.035, len * 0.075, len * 0.022);
    return g;
  },

  turtle(c) {
    const g = new THREE.Group();
    // shell: dome with painted scutes
    const shellGeo = new THREE.SphereGeometry(0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    shellGeo.scale(1.05, 0.55, 0.85);
    paintVerts(shellGeo, (nx, _ny, nz) => {
      const u = Math.floor((nx + 1) * 2.2);
      const v = Math.floor((nz + 1) * 2.2);
      const base = new THREE.Color(c.color);
      return (u + v) % 2 === 0 ? base : base.clone().lerp(new THREE.Color("#2f4a12"), 0.35);
    });
    const shell = new THREE.Mesh(shellGeo, bodyMat({ rough: 0.5 }));
    g.add(shell);
    // shell rim + belly plate
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.09, 8, 22), solidMat("#8a9a5b", { rough: 0.7 }));
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.02, 0.85, 1);
    g.add(rim);
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 20), solidMat("#e8dcb8"));
    belly.scale.set(1.03, 1, 0.84);
    belly.position.y = -0.08;
    g.add(belly);

    // head with beak + eyes
    const headP = pivot("head", 0.95, 0.08, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), solidMat("#8a9a5b", { rough: 0.6 }));
    head.scale.set(1.25, 0.95, 0.9);
    headP.add(head);
    headP.add(eyeAt(0.2, 0.1, 0.14, 0.055), eyeAt(0.2, 0.1, -0.14, 0.055));
    const beak = mouthArc(0.3, -0.03, 0.06, 1.6);
    headP.add(beak);
    g.add(headP);

    // four paddling flippers (named for animation)
    const flipNames = ["flipperL", "flipperR", "legBL", "legBR"];
    [[0.55, 0.62, -0.5], [0.55, -0.62, 0.5], [-0.55, 0.55, -2.4], [-0.55, -0.55, 2.4]].forEach(([x, z, rot], i) => {
      const fp = pivot(flipNames[i], x, -0.1, z);
      const fl = new THREE.Mesh(flipperGeo(0.62, 0.24), finMat("#8a9a5b"));
      fl.rotation.x = Math.sign(z) * Math.PI / 2;
      fl.rotation.z = rot * 0.35;
      fp.add(fl);
      g.add(fp);
    });
    return g;
  },

  jellyfish(c) {
    const g = new THREE.Group();
    // translucent outer bell + brighter inner core
    const bellMat = new THREE.MeshStandardMaterial({
      color: c.color,
      transparent: true,
      opacity: 0.42,
      roughness: 0.2,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(c.color),
      emissiveIntensity: c.glows ? 0.55 : 0.12,
      depthWrite: false,
    });
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.72, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
    bell.name = "bell";
    g.add(bell);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 14, 10),
      solidMat(c.accentColor, { opacity: 0.5, emissive: c.accentColor, emissiveIntensity: c.glows ? 0.9 : 0.35 })
    );
    core.scale.y = 0.62;
    core.position.y = 0.16;
    g.add(core);
    // ruffled skirt
    const skirt = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.07, 6, 24), solidMat(c.accentColor, { opacity: 0.45 }));
    skirt.rotation.x = Math.PI / 2;
    skirt.position.y = 0.02;
    skirt.name = "skirt";
    g.add(skirt);
    // frilly oral arms + thin tentacles (named for the sway animation)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const armP = pivot(`arm${i}`, Math.cos(a) * 0.22, -0.05, Math.sin(a) * 0.22);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.85, 4, 6), solidMat(c.accentColor, { opacity: 0.55 }));
      arm.position.y = -0.5;
      arm.scale.z = 0.45;
      armP.add(arm);
      g.add(armP);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tp = pivot(`arm${4 + i}`, Math.cos(a) * 0.58, -0.02, Math.sin(a) * 0.58);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.008, 1.25, 5), solidMat(c.color, { opacity: 0.6 }));
      t.position.y = -0.66;
      tp.add(t);
      g.add(tp);
    }
    return g;
  },

  octopus(c) {
    const g = new THREE.Group();
    const isDumbo = c.id === "dumbo";
    // mantle: rounded dome, slightly forward-leaning
    const headGeo = new THREE.SphereGeometry(0.6, 20, 16);
    headGeo.scale(0.95, 1.15, 0.95);
    paintVerts(headGeo, countershade(c.color, c.accentColor));
    const head = new THREE.Mesh(headGeo, bodyMat({ rough: 0.5 }));
    head.position.y = 0.5;
    head.rotation.z = -0.15;
    g.add(head);
    // eye bulges
    for (const s of [1, -1]) {
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), solidMat(c.color, { rough: 0.5 }));
      bulge.position.set(0.32, 0.58, s * 0.3);
      g.add(bulge);
      g.add(eyeAt(0.42, 0.62, s * 0.34, 0.1));
    }
    if (isDumbo) {
      // the famous "elephant ear" fins
      for (const s of [1, -1]) {
        const ep = pivot(s > 0 ? "wingL" : "wingR", 0, 1.05, s * 0.35);
        const ear = new THREE.Mesh(flipperGeo(0.5, 0.34), finMat(c.accentColor));
        ear.rotation.x = s * 1.35;
        ear.rotation.z = 0.5;
        ep.add(ear);
        g.add(ep);
      }
    }
    // 8 curling arms built along bezier curves
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(dir.x * 0.25, 0.05, dir.z * 0.25),
        new THREE.Vector3(dir.x * 0.62, -0.35, dir.z * 0.62),
        new THREE.Vector3(dir.x * 0.95, -0.42, dir.z * 0.95),
        new THREE.Vector3(dir.x * 1.18, -0.18, dir.z * 1.18),
      ]);
      const armP = pivot(`arm${i}`, 0, 0, 0);
      const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.075, 6), solidMat(c.accentColor, { rough: 0.55 }));
      armP.add(arm);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), solidMat(c.accentColor));
      tip.position.copy(curve.getPoint(1));
      armP.add(tip);
      g.add(armP);
    }
    return g;
  },

  squid(c) {
    const g = new THREE.Group();
    // torpedo mantle
    const mantleGeo = makeBody(1.7, [[0, 0.01], [0.25, 0.1], [0.6, 0.16], [0.9, 0.14], [1, 0.1]], { sy: 1, sz: 1 });
    paintVerts(mantleGeo, countershade(c.color, c.accentColor));
    const mantle = new THREE.Mesh(mantleGeo, bodyMat({ rough: 0.5 }));
    mantle.position.x = -0.35;
    g.add(mantle);
    // triangular side fins at the tip (named — they undulate)
    for (const s of [1, -1]) {
      const wp = pivot(s > 0 ? "wingL" : "wingR", -1.0, 0, s * 0.05);
      const fin = new THREE.Mesh(flipperGeo(0.6, 0.32), finMat(c.accentColor, 0.85));
      fin.rotation.x = s * Math.PI / 2;
      fin.rotation.z = 0.5;
      wp.add(fin);
      g.add(wp);
    }
    // head + big eyes
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), solidMat(c.color, { rough: 0.5 }));
    head.position.x = 0.52;
    head.scale.set(1.1, 1, 1);
    g.add(head);
    g.add(eyeAt(0.6, 0.05, 0.2, 0.11), eyeAt(0.6, 0.05, -0.2, 0.11));
    // vampire squid: webbed cloak
    if (c.id === "vampire-squid") {
      const cloak = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.8, 12, 1, true),
        solidMat(c.color, { opacity: 0.7, side: THREE.DoubleSide })
      );
      cloak.rotation.z = Math.PI / 2;
      cloak.position.x = 1.0;
      g.add(cloak);
    }
    // 8 arms + 2 long tentacles
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tp = pivot(`arm${i}`, 0.72, Math.sin(a) * 0.12, Math.cos(a) * 0.12);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.012, 0.8, 5), solidMat(c.accentColor));
      t.rotation.z = Math.PI / 2 - 0.12 * Math.sin(a);
      t.position.x = 0.4;
      tp.add(t);
      g.add(tp);
    }
    for (const s of [1, -1]) {
      const tp = pivot(s > 0 ? "tent0" : "tent1", 0.72, 0.04 * s, s * 0.08);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.01, 1.3, 5), solidMat(c.accentColor));
      t.rotation.z = Math.PI / 2;
      t.position.x = 0.65;
      const club = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 4, 6), solidMat(c.accentColor));
      club.rotation.z = Math.PI / 2;
      club.position.x = 1.3;
      tp.add(t, club);
      g.add(tp);
    }
    return g;
  },

  ray(c) {
    return rayLike(c, false);
  },

  manta(c) {
    return rayLike(c, true);
  },

  eel(c) {
    // A moray peeking out of its rocky lair, jaw slowly opening/closing.
    const g = new THREE.Group();
    // rock pile
    const rockMat = solidMat("#4a5568", { rough: 1, flat: true });
    for (const [x, y, z, r] of [[-0.2, 0.25, 0, 0.55], [0.35, 0.2, 0.3, 0.4], [0.1, 0.15, -0.42, 0.38], [-0.55, 0.2, 0.35, 0.35]] as [number, number, number, number][]) {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rockMat);
      rock.position.set(x, y, z);
      g.add(rock);
    }
    // emerging body: S-curve tube
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.1, 0.3, 0),
      new THREE.Vector3(0.35, 0.5, 0.05),
      new THREE.Vector3(0.75, 0.75, -0.04),
      new THREE.Vector3(1.05, 1.05, 0),
    ]);
    const bodyGeo = new THREE.TubeGeometry(curve, 12, 0.17, 8);
    paintVerts(bodyGeo, (nx, ny, nz) => {
      const base = new THREE.Color(c.color);
      const u = Math.floor((nx + 1) * 4);
      const v = Math.floor((nz + 1) * 3 + (ny + 1) * 2);
      return hash2(u, v) < 0.35 ? base.clone().lerp(new THREE.Color(c.accentColor), 0.5) : base;
    });
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.55 })));
    // head + hinged jaw
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), solidMat(c.color, { rough: 0.55 }));
    head.scale.set(1.35, 0.9, 0.85);
    head.position.set(1.18, 1.12, 0);
    head.rotation.z = 0.5;
    g.add(head);
    g.add(eyeAt(1.22, 1.28, 0.13, 0.05), eyeAt(1.22, 1.28, -0.13, 0.05));
    const jawP = pivot("jaw", 1.08, 1.02, 0);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), solidMat(c.accentColor, { rough: 0.6 }));
    jaw.scale.set(1.5, 0.5, 0.75);
    jaw.position.set(0.16, -0.04, 0);
    jawP.add(jaw);
    for (const s of [1, -1]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 4), solidMat("#f8fafc"));
      tooth.position.set(0.24, 0.02, s * 0.06);
      jawP.add(tooth);
    }
    g.add(jawP);
    return g;
  },

  gulper(c) {
    const g = new THREE.Group();
    // enormous jaw = two cupped half-spheres
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), solidMat(c.color, { rough: 0.6, side: THREE.DoubleSide }));
    top.rotation.z = -0.5;
    top.position.set(0.75, 0.12, 0);
    g.add(top);
    const jawP = pivot("jaw", 0.45, -0.08, 0);
    const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), solidMat(c.accentColor, { rough: 0.65, side: THREE.DoubleSide }));
    bottom.rotation.z = Math.PI + 0.45;
    bottom.position.set(0.3, -0.05, 0);
    jawP.add(bottom);
    g.add(jawP);
    // slim body tapering into a whip tail with a glowing tip
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.35, 0.05, 0),
      new THREE.Vector3(-0.4, 0.0, 0.08),
      new THREE.Vector3(-1.1, 0.12, -0.06),
      new THREE.Vector3(-1.7, -0.05, 0.03),
    ]);
    const bodyGeo = new THREE.TubeGeometry(curve, 14, 0.11, 7);
    paintVerts(bodyGeo, countershade(c.color, c.accentColor));
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.6 })));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), solidMat("#fca5a5", { emissive: "#f87171", emissiveIntensity: 1.4 }));
    tip.position.set(-1.7, -0.05, 0.03);
    tip.name = "lure";
    g.add(tip);
    g.add(eyeAt(0.95, 0.28, 0.16, 0.05), eyeAt(0.95, 0.28, -0.16, 0.05));
    return g;
  },

  seahorse(c) {
    const g = new THREE.Group();
    // S-shaped body from a tube
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02, -0.55, 0),
      new THREE.Vector3(-0.12, -0.25, 0),
      new THREE.Vector3(0.02, 0.15, 0),
      new THREE.Vector3(0.16, 0.5, 0),
      new THREE.Vector3(0.1, 0.72, 0),
    ]);
    const bodyGeo = new THREE.TubeGeometry(curve, 16, 0.14, 8);
    paintVerts(bodyGeo, (_nx, ny) => {
      const base = new THREE.Color(c.color);
      // belly ridge plates
      return Math.sin(ny * 22) > 0.4 ? base.clone().lerp(new THREE.Color(c.accentColor), 0.45) : base;
    });
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.6 })));
    // head, snout, coronet
    const headP = pivot("head", 0.1, 0.78, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), solidMat(c.color, { rough: 0.6 }));
    headP.add(head);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 8), solidMat(c.accentColor, { rough: 0.55 }));
    snout.rotation.z = Math.PI / 2 - 0.35;
    snout.position.set(0.2, -0.03, 0);
    headP.add(snout);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 5), solidMat(c.accentColor));
    crown.position.set(-0.02, 0.17, 0);
    headP.add(crown);
    headP.add(eyeAt(0.08, 0.04, 0.1, 0.045), eyeAt(0.08, 0.04, -0.1, 0.045));
    g.add(headP);
    // fluttering dorsal fin
    const dorsalP = pivot("dorsal", -0.16, 0.05, 0);
    const dfin = new THREE.Mesh(flipperGeo(0.3, 0.24), finMat(c.accentColor, 0.8));
    dfin.rotation.z = 1.35;
    dorsalP.add(dfin);
    g.add(dorsalP);
    // curled tail
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 12, Math.PI * 1.6), solidMat(c.color, { rough: 0.6 }));
    tail.position.set(0.1, -0.62, 0);
    tail.rotation.z = -1.2;
    g.add(tail);
    return g;
  },

  crab(c) {
    const g = new THREE.Group();
    // carapace with bumps
    const shellGeo = new THREE.SphereGeometry(0.62, 18, 12);
    shellGeo.scale(1, 0.5, 0.78);
    paintVerts(shellGeo, countershade(c.color, c.accentColor));
    const shell = new THREE.Mesh(shellGeo, bodyMat({ rough: 0.55 }));
    shell.position.y = 0.32;
    g.add(shell);
    // claws with two-part pincers on named pivots
    for (const s of [1, -1]) {
      const cp = pivot(s > 0 ? "clawL" : "clawR", 0.55, 0.3, s * 0.42);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 6), solidMat(c.color));
      arm.rotation.z = -0.6;
      arm.position.set(0.1, 0, 0);
      cp.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), solidMat(c.accentColor, { rough: 0.5 }));
      hand.scale.set(1.35, 0.9, 0.7);
      hand.position.set(0.3, 0.12, 0);
      cp.add(hand);
      const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), solidMat(c.accentColor));
      pincer.rotation.z = -Math.PI / 2;
      pincer.position.set(0.52, 0.18, 0);
      cp.add(pincer);
      g.add(cp);
    }
    // eight jointed legs
    for (const s of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        const lx = 0.25 - i * 0.24;
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.3, 3, 5), solidMat(c.color));
        upper.position.set(lx, 0.22, s * 0.62);
        upper.rotation.x = s * 1.0;
        g.add(upper);
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.26, 3, 5), solidMat(c.color));
        lower.position.set(lx, 0.05, s * 0.82);
        lower.rotation.x = s * 0.35;
        g.add(lower);
      }
    }
    // eye stalks!
    for (const s of [1, -1]) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 5), solidMat(c.color));
      stalk.position.set(0.55, 0.55, s * 0.16);
      g.add(stalk);
      g.add(eyeAt(0.55, 0.68, s * 0.16, 0.06));
    }
    g.add(mouthArc(0.62, 0.32, 0.05, 1.4));
    return g;
  },

  lobster(c) {
    const g = new THREE.Group();
    // cephalothorax
    const frontGeo = new THREE.SphereGeometry(0.4, 14, 10);
    frontGeo.scale(1.5, 0.75, 0.8);
    paintVerts(frontGeo, countershade(c.color, c.accentColor));
    const front = new THREE.Mesh(frontGeo, bodyMat({ rough: 0.5 }));
    front.position.set(0.3, 0.32, 0);
    g.add(front);
    // segmented abdomen + tail fan
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.26 - i * 0.035, 10, 8), solidMat(c.color, { rough: 0.55 }));
      seg.scale.set(1.2, 0.6, 0.9);
      seg.position.set(-0.28 - i * 0.3, 0.28 - i * 0.02, 0);
      g.add(seg);
    }
    const tailP = pivot("tail", -1.42, 0.2, 0);
    for (let i = -2; i <= 2; i++) {
      const fan = new THREE.Mesh(flipperGeo(0.3, 0.13), finMat(c.accentColor, 0.9));
      fan.rotation.x = Math.PI / 2;
      fan.rotation.z = Math.PI;
      fan.position.set(-0.05, 0, i * 0.09);
      fan.rotation.y = i * 0.35;
      tailP.add(fan);
    }
    g.add(tailP);
    // big claws
    for (const s of [1, -1]) {
      const cp = pivot(s > 0 ? "clawL" : "clawR", 0.85, 0.25, s * 0.28);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 4, 6), solidMat(c.color));
      arm.rotation.z = Math.PI / 2 - 0.3;
      arm.position.set(0.18, 0.02, 0);
      cp.add(arm);
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), solidMat(c.color, { rough: 0.5 }));
      claw.scale.set(1.5, 0.8, 0.65);
      claw.position.set(0.5, 0.05, 0);
      cp.add(claw);
      const pinc = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 5), solidMat(c.accentColor));
      pinc.rotation.z = -Math.PI / 2;
      pinc.position.set(0.78, 0.12, 0);
      cp.add(pinc);
      g.add(cp);
    }
    // legs + long antennae
    for (const s of [1, -1]) {
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.34, 3, 5), solidMat(c.color));
        leg.position.set(0.35 - i * 0.24, 0.12, s * 0.4);
        leg.rotation.x = s * 0.9;
        g.add(leg);
      }
      const ap = pivot(s > 0 ? "antL" : "antR", 0.88, 0.42, s * 0.1);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, 1.0, 4), solidMat(c.accentColor));
      ant.rotation.z = -1.1;
      ant.rotation.y = s * 0.4;
      ant.position.set(0.35, 0.25, s * 0.1);
      ap.add(ant);
      g.add(ap);
    }
    g.add(eyeAt(0.85, 0.45, 0.14, 0.05), eyeAt(0.85, 0.45, -0.14, 0.05));
    return g;
  },

  penguin(c) {
    const g = new THREE.Group();
    // body flying underwater (horizontal), tuxedo painted on
    const bodyGeo = makeBody(1.4, [[0, 0.03], [0.15, 0.13], [0.5, 0.21], [0.8, 0.17], [0.95, 0.1], [1, 0.04]], { sy: 1.05, sz: 0.95 });
    paintVerts(bodyGeo, (nx, ny, nz) => {
      // white front (belly + face patch), black back
      if (ny < -0.15 || (nx > 0.55 && ny < 0.35 && Math.abs(nz) < 0.7)) return new THREE.Color(c.accentColor);
      return new THREE.Color(c.color);
    });
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.55 })));
    // beak + feet
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 6), solidMat("#f59e0b", { rough: 0.5 }));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.82, 0.02, 0);
    g.add(beak);
    for (const s of [1, -1]) {
      const foot = new THREE.Mesh(flipperGeo(0.22, 0.12), finMat("#f59e0b"));
      foot.rotation.x = Math.PI / 2;
      foot.position.set(-0.62, -0.08, s * 0.12);
      g.add(foot);
      const wp = pivot(s > 0 ? "flipperL" : "flipperR", 0.08, 0.05, s * 0.28);
      const wing = new THREE.Mesh(flipperGeo(0.55, 0.2), finMat(c.color));
      wing.rotation.x = s * 1.3;
      wp.add(wing);
      g.add(wp);
    }
    eyePair(g, 0.6, 0.16, 0.16, 0.05);
    return g;
  },

  seal(c) {
    return sealLike(c, false);
  },

  walrus(c) {
    return sealLike(c, true);
  },

  otter(c) {
    // Floats on its back near the surface, snack on the belly!
    const g = new THREE.Group();
    const bodyGeo = makeBody(1.6, [[0, 0.05], [0.15, 0.13], [0.5, 0.19], [0.85, 0.15], [1, 0.06]], { sy: 0.85, sz: 0.95 });
    paintVerts(bodyGeo, (nx, ny) => {
      // floating belly-up: light chest/face UPWARD (ny>0)
      const light = new THREE.Color(c.accentColor);
      const darkF = new THREE.Color(c.color);
      if (nx > 0.55 && ny > -0.1) return light;
      return darkF.clone().lerp(light, smooth(-0.2, 0.8, ny) * 0.5);
    });
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.7 })));
    // face (up!)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), solidMat(c.color, { rough: 0.7 }));
    head.position.set(0.78, 0.16, 0);
    g.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), solidMat(c.accentColor, { rough: 0.7 }));
    muzzle.position.set(0.84, 0.32, 0);
    g.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), solidMat("#1f2937"));
    nose.position.set(0.86, 0.42, 0);
    g.add(nose);
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), solidMat(c.color));
      ear.position.set(0.68, 0.3, s * 0.18);
      g.add(ear);
      g.add(eyeAt(0.8, 0.34, s * 0.11, 0.04));
      // paws holding the clam (named so they wiggle)
      const pp = pivot(s > 0 ? "clawL" : "clawR", 0.42, 0.22, s * 0.14);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), solidMat(c.color));
      pp.add(paw);
      g.add(pp);
    }
    // the clam on the tummy
    const clam = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), solidMat("#c9bfa8", { rough: 0.5 }));
    clam.scale.y = 0.6;
    clam.position.set(0.42, 0.26, 0);
    g.add(clam);
    // flat tail
    const tailP = pivot("tail", -0.8, 0.02, 0);
    const tail = new THREE.Mesh(flipperGeo(0.5, 0.2), finMat(c.color));
    tail.rotation.x = Math.PI / 2;
    tailP.add(tail);
    g.add(tailP);
    return g;
  },

  anglerfish(c) {
    const g = new THREE.Group();
    // huge round head-body
    const bodyGeo = makeBody(1.4, [[0, 0.02], [0.12, 0.1], [0.42, 0.24], [0.75, 0.3], [0.95, 0.22], [1, 0.08]], { sy: 1.05, sz: 0.78 });
    paintVerts(bodyGeo, countershade(c.color, "#3f3a36"));
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.65 })));
    // gaping lower jaw with needle teeth
    const jawP = pivot("jaw", 0.42, -0.18, 0);
    const jaw = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      solidMat(c.color, { rough: 0.65, side: THREE.DoubleSide })
    );
    jaw.rotation.z = Math.PI - 0.4;
    jaw.position.set(0.16, -0.05, 0);
    jawP.add(jaw);
    for (let i = 0; i < 6; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 4), solidMat("#f8fafc"));
      tooth.position.set(0.26 + (i % 3) * 0.07, 0.03, -0.14 + i * 0.056);
      jawP.add(tooth);
    }
    g.add(jawP);
    // upper teeth
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 4), solidMat("#f8fafc"));
      tooth.rotation.x = Math.PI;
      tooth.position.set(0.58, -0.05, -0.1 + i * 0.066);
      g.add(tooth);
    }
    // the glowing lure on a named pivot (sways)
    const lureP = pivot("lure", 0.3, 0.28, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.6, 5), solidMat(c.accentColor));
    rod.position.set(0.08, 0.28, 0);
    rod.rotation.z = -0.5;
    lureP.add(rod);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 10),
      solidMat(c.accentColor, { emissive: c.accentColor, emissiveIntensity: 2.2 })
    );
    bulb.position.set(0.24, 0.55, 0);
    lureP.add(bulb);
    const light = new THREE.PointLight(new THREE.Color(c.accentColor), 3.4, 5.5, 2);
    light.position.set(0.24, 0.55, 0);
    lureP.add(light);
    g.add(lureP);
    // small tail + tiny eyes
    const tailP = pivot("tail", -0.7, 0, 0);
    tailP.add(new THREE.Mesh(paddleTailGeo(0.4), finMat(c.accentColor, 0.75)));
    g.add(tailP);
    eyePair(g, 0.5, 0.14, 0.26, 0.06);
    return g;
  },

  starfish(c) {
    const g = new THREE.Group();
    // puffy 5-pointed star (extruded with bevel)
    const shape = new THREE.Shape();
    const R = 0.72, r = 0.3;
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.08, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2);
    paintVerts(geo, (_nx, ny) => new THREE.Color(c.color).lerp(new THREE.Color(c.accentColor), smooth(-0.4, 1, ny) * 0.5));
    const star = new THREE.Mesh(geo, bodyMat({ rough: 0.75 }));
    star.position.y = 0.12;
    g.add(star);
    // bumps along the arms
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      for (const d of [0.28, 0.48]) {
        const bump = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), solidMat(c.accentColor));
        bump.position.set(Math.cos(a) * d, 0.24, Math.sin(a) * d);
        g.add(bump);
      }
    }
    return g;
  },

  pufferfish(c) {
    const g = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.6, 20, 16);
    paintVerts(bodyGeo, patternPaint({ ...c, pattern: "spots" }));
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.6 })));
    // spikes
    for (let i = 0; i < 18; i++) {
      const u = Math.acos(2 * ((i + 0.5) / 18) - 1);
      const v = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(Math.sin(u) * Math.cos(v), Math.cos(u), Math.sin(u) * Math.sin(v));
      if (dir.x > 0.82) continue; // keep the face clear
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 4), solidMat("#fefae0"));
      spike.position.copy(dir.clone().multiplyScalar(0.62));
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.add(spike);
    }
    // big cartoon eyes + puckered mouth
    g.add(eyeAt(0.42, 0.2, 0.3, 0.1), eyeAt(0.42, 0.2, -0.3, 0.1));
    const lips = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.03, 6, 10), solidMat("#c98a5b"));
    lips.rotation.y = Math.PI / 2;
    lips.position.set(0.6, -0.05, 0);
    g.add(lips);
    // little fluttering fins
    for (const s of [1, -1]) {
      const pp = pivot(s > 0 ? "pectL" : "pectR", 0.15, 0, s * 0.58);
      const fin = new THREE.Mesh(flipperGeo(0.25, 0.14), finMat(c.accentColor, 0.85));
      fin.rotation.x = s * 1.1;
      pp.add(fin);
      g.add(pp);
    }
    const tailP = pivot("tail", -0.62, 0, 0);
    tailP.add(new THREE.Mesh(paddleTailGeo(0.3), finMat(c.accentColor, 0.9)));
    g.add(tailP);
    return g;
  },

  sunfish(c) {
    const g = new THREE.Group();
    // giant flat disc body
    const bodyGeo = new THREE.SphereGeometry(0.85, 20, 16);
    bodyGeo.scale(1.05, 1.15, 0.3);
    paintVerts(bodyGeo, patternPaint({ ...c, pattern: "shimmer" }));
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.45 })));
    // truncated "clavus" back edge
    const clavus = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.15, 4, 8), solidMat(c.accentColor, { rough: 0.5 }));
    clavus.position.set(-0.82, 0, 0);
    g.add(clavus);
    // tall top + bottom fins (they scull — named)
    const topP = pivot("dorsal", -0.25, 0.95, 0);
    const topFin = new THREE.Mesh(dorsalGeo(0.5, 0.85), finMat(c.color));
    topP.add(topFin);
    g.add(topP);
    const botP = pivot("tail", -0.25, -0.95, 0);
    const botFin = new THREE.Mesh(dorsalGeo(0.5, 0.85), finMat(c.color));
    botFin.rotation.x = Math.PI;
    botP.add(botFin);
    g.add(botP);
    g.add(eyeAt(0.55, 0.2, 0.22, 0.07), eyeAt(0.55, 0.2, -0.22, 0.07));
    const lips = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.028, 6, 10), solidMat("#64748b"));
    lips.rotation.y = Math.PI / 2;
    lips.position.set(0.85, -0.05, 0);
    g.add(lips);
    return g;
  },

  blobfish(c) {
    const g = new THREE.Group();
    // saggy blob
    const bodyGeo = makeBody(1.3, PROFILES.blob, { sy: 0.9, sz: 0.85 });
    paintVerts(bodyGeo, (_nx, ny) => new THREE.Color(c.color).lerp(new THREE.Color(c.accentColor), smooth(-0.7, 0.4, -ny) * 0.6));
    const body = new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.8 }));
    body.position.y = 0.35;
    g.add(body);
    // droopy nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), solidMat(c.accentColor, { rough: 0.8 }));
    nose.scale.set(1, 1.4, 0.85);
    nose.position.set(0.6, 0.3, 0);
    g.add(nose);
    // sad mouth (flipped arc)
    const frown = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 5, 10, 1.6), solidMat("#8f5560"));
    frown.rotation.z = (Math.PI - 1.6) / 2;
    frown.position.set(0.55, 0.08, 0);
    g.add(frown);
    g.add(eyeAt(0.48, 0.45, 0.2, 0.06), eyeAt(0.48, 0.45, -0.2, 0.06));
    // tiny useless fins
    for (const s of [1, -1]) {
      const pp = pivot(s > 0 ? "pectL" : "pectR", 0, 0.3, s * 0.5);
      const fin = new THREE.Mesh(flipperGeo(0.2, 0.1), finMat(c.accentColor, 0.8));
      fin.rotation.x = s * 1.1;
      pp.add(fin);
      g.add(pp);
    }
    return g;
  },

  hatchetfish(c) {
    const g = new THREE.Group();
    // hatchet-shaped: deep chest, thin tail — flattened
    const bodyGeo = makeBody(1.1, [[0, 0.01], [0.12, 0.05], [0.3, 0.1], [0.55, 0.3], [0.8, 0.28], [0.95, 0.12], [1, 0.03]], { sy: 1.15, sz: 0.3 });
    paintVerts(bodyGeo, patternPaint({ ...c, pattern: "shimmer" }));
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.25, emissive: c.accentColor, emissiveIntensity: 0.15 })));
    // glowing photophores along the belly
    for (let i = 0; i < 6; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        solidMat(c.accentColor, { emissive: c.accentColor, emissiveIntensity: 2.0 })
      );
      dot.position.set(0.35 - i * 0.14, -0.3 - Math.sin(i * 0.9) * 0.04, 0);
      g.add(dot);
    }
    // upturned face + big eye
    g.add(eyeAt(0.4, 0.12, 0.1, 0.075), eyeAt(0.4, 0.12, -0.1, 0.075));
    const tailP = pivot("tail", -0.55, 0, 0);
    tailP.add(new THREE.Mesh(crescentTailGeo(0.28), finMat(c.accentColor, 0.8)));
    g.add(tailP);
    return g;
  },

  bear(c) {
    const g = new THREE.Group();
    // swimming polar bear: smooth body + head + paddling legs
    const bodyGeo = makeBody(1.9, [[0, 0.05], [0.2, 0.16], [0.55, 0.22], [0.85, 0.18], [1, 0.09]], { sy: 0.95, sz: 0.9 });
    paintVerts(bodyGeo, countershade(c.color, "#ffffff"));
    g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.85 })));
    const headP = pivot("head", 1.0, 0.18, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), solidMat(c.color, { rough: 0.85 }));
    head.scale.set(1.2, 1, 0.95);
    headP.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), solidMat("#e9eef4", { rough: 0.8 }));
    muzzle.position.set(0.28, -0.05, 0);
    headP.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), solidMat("#1f2937"));
    nose.position.set(0.4, -0.02, 0);
    headP.add(nose);
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), solidMat(c.color));
      ear.position.set(-0.05, 0.28, s * 0.18);
      headP.add(ear);
      headP.add(eyeAt(0.2, 0.12, s * 0.14, 0.045));
    }
    g.add(headP);
    // four paddling legs
    const legNames = ["legFL", "legFR", "legBL", "legBR"];
    [[0.5, 1], [0.5, -1], [-0.55, 1], [-0.55, -1]].forEach(([x, s], i) => {
      const lp = pivot(legNames[i], x, -0.3, s * 0.28);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 6), solidMat(c.color, { rough: 0.85 }));
      leg.position.y = -0.2;
      lp.add(leg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), solidMat(c.accentColor, { rough: 0.8 }));
      paw.position.y = -0.42;
      paw.scale.set(1.2, 0.6, 1);
      lp.add(paw);
      g.add(lp);
    });
    // stubby tail
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), solidMat(c.color));
    tail.position.set(-0.95, 0.05, 0);
    g.add(tail);
    return g;
  },
};

// ray + manta share the flapping-wing chassis
function rayLike(c: MarineCreature, isManta: boolean): THREE.Group {
  const g = new THREE.Group();
  const bodyLen = isManta ? 1.4 : 1.15;
  // central body: flattened smooth mound
  const bodyGeo = new THREE.SphereGeometry(bodyLen * 0.42, 18, 12);
  bodyGeo.scale(1.25, 0.32, 0.75);
  paintVerts(bodyGeo, countershade(c.color, c.accentColor));
  g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.5 })));

  // the wings — big rounded triangles on named pivots (they flap)
  for (const s of [1, -1]) {
    const wp = pivot(s > 0 ? "wingL" : "wingR", 0, 0, s * bodyLen * 0.18);
    const shape = new THREE.Shape();
    const W = bodyLen * (isManta ? 1.15 : 0.85);
    const L = bodyLen * 0.62;
    shape.moveTo(L * 0.55, 0);
    shape.quadraticCurveTo(L * 0.4, W * 0.8, -L * 0.35, W);
    shape.quadraticCurveTo(-L * 0.5, W * 0.45, -L * 0.7, 0);
    shape.closePath();
    const wingGeo = new THREE.ShapeGeometry(shape, 8);
    wingGeo.rotateX(-Math.PI / 2); // lay flat; +z span
    if (s < 0) wingGeo.scale(1, 1, -1);
    paintVerts(wingGeo, countershade(c.color, c.accentColor));
    const wing = new THREE.Mesh(wingGeo, bodyMat({ rough: 0.5 }));
    (wing.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    wp.add(wing);
    g.add(wp);
  }

  if (isManta) {
    // cephalic "horns" by the mouth
    for (const s of [1, -1]) {
      const horn = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 6), solidMat(c.color, { rough: 0.5 }));
      horn.rotation.z = Math.PI / 2 - 0.5;
      horn.position.set(bodyLen * 0.58, -0.02, s * bodyLen * 0.16);
      g.add(horn);
    }
    const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 4, 6), solidMat("#16202c"));
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(bodyLen * 0.55, -0.06, 0);
    g.add(mouth);
  } else {
    g.add(mouthArc(bodyLen * 0.5, -bodyLen * 0.08, bodyLen * 0.05, 1.5));
  }

  // long thin tail with a barb
  const tailP = pivot("tail", -bodyLen * 0.52, 0, 0);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.006, bodyLen * 1.1, 5), solidMat(c.accentColor));
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -bodyLen * 0.55;
  tailP.add(tail);
  g.add(tailP);
  eyePair(g, bodyLen * 0.42, bodyLen * 0.1, bodyLen * 0.16, bodyLen * 0.045);
  return g;
}

// seal + walrus share the sleek pinniped chassis
function sealLike(c: MarineCreature, isWalrus: boolean): THREE.Group {
  const g = new THREE.Group();
  const len = isWalrus ? 2.2 : 1.9;
  const bodyGeo = makeBody(len, [[0, 0.02], [0.1, 0.08], [0.4, 0.17], [0.7, 0.19], [0.9, 0.13], [1, 0.07]], { sy: 0.95, sz: 0.95 });
  paintVerts(bodyGeo, c.pattern === "spots" ? patternPaint(c) : countershade(c.color, c.accentColor));
  g.add(new THREE.Mesh(bodyGeo, bodyMat({ rough: 0.7 })));

  // head + muzzle + whiskers
  const headP = pivot("head", len * 0.48, len * 0.05, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(len * 0.11, 12, 10), solidMat(c.color, { rough: 0.7 }));
  headP.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(len * (isWalrus ? 0.075 : 0.055), 10, 8), solidMat(c.accentColor, { rough: 0.7 }));
  muzzle.position.set(len * 0.09, -len * 0.02, 0);
  headP.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(len * 0.022, 6, 6), solidMat("#1f2937"));
  nose.position.set(len * 0.15, len * 0.01, 0);
  headP.add(nose);
  for (const s of [1, -1]) {
    headP.add(eyeAt(len * 0.06, len * 0.06, s * len * 0.06, len * 0.022));
    // whiskers
    for (let i = 0; i < 3; i++) {
      const wsk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, len * 0.14, 3), solidMat("#e7e5e4", { opacity: 0.8 }));
      wsk.rotation.z = Math.PI / 2 + (i - 1) * 0.25;
      wsk.rotation.y = s * 0.5;
      wsk.position.set(len * 0.12, -len * 0.015 + (i - 1) * 0.02, s * len * 0.05);
      headP.add(wsk);
    }
    if (isWalrus) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(len * 0.018, len * 0.18, 6), solidMat("#f3ead8", { rough: 0.4 }));
      tusk.rotation.x = Math.PI;
      tusk.position.set(len * 0.1, -len * 0.1, s * len * 0.035);
      headP.add(tusk);
    }
  }
  g.add(headP);

  // front flippers + tail flippers
  for (const s of [1, -1]) {
    const fp = pivot(s > 0 ? "flipperL" : "flipperR", len * 0.12, -len * 0.08, s * len * 0.12);
    const fl = new THREE.Mesh(flipperGeo(len * 0.2, len * 0.09), finMat(c.color));
    fl.rotation.x = s * 1.25;
    fp.add(fl);
    g.add(fp);
  }
  const tailP = pivot("tail", -len * 0.5, 0, 0);
  for (const s of [1, -1]) {
    const fl = new THREE.Mesh(flipperGeo(len * 0.18, len * 0.08), finMat(c.color));
    fl.rotation.x = Math.PI / 2;
    fl.rotation.y = s * 0.55;
    tailP.add(fl);
  }
  g.add(tailP);
  return g;
}

/** Build a creature mesh group; every child gets userData.creatureId for picking. */
export function buildCreature(c: MarineCreature): THREE.Group {
  const builder = builders[c.style] ?? builders.fish;
  const g = builder(c);
  g.scale.multiplyScalar(c.size);
  g.traverse((obj) => {
    obj.userData.creatureId = c.id;
  });
  return g;
}

/** Collect the named animation rig of a built creature. */
export function collectRig(group: THREE.Group): Record<string, THREE.Object3D> {
  const rig: Record<string, THREE.Object3D> = {};
  group.traverse((obj) => {
    if (obj.name) rig[obj.name] = obj;
  });
  return rig;
}
