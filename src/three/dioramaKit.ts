// The diorama construction kit: famous landmarks, land animals and nature
// pieces — all low-poly, assembled from primitives, zero model files.
// Nature props prefer painted billboard sprites when a theme pack is active.

import * as THREE from "three";
import { hasNatureSprite, natureBillboard } from "./natureAssets";
import { hasAnimalSprite, hasLandmarkSprite, paintedAnimal, paintedLandmark } from "./entityAssets";

export type LandmarkId =
  | "eiffel" | "pyramid" | "colosseum" | "bigben" | "liberty" | "operaHouse"
  | "greatWall" | "tajMahal" | "kremlin" | "torii" | "windmill" | "moai"
  | "christRedeemer" | "machuPicchu" | "kilimanjaro" | "azrieli" | "pisa";

export type AnimalId =
  | "camel" | "kangaroo" | "panda" | "lion" | "elephant" | "bear" | "llama"
  | "toucan" | "eagle" | "rooster" | "ibex" | "wolf" | "sheep" | "cow" | "crane";

export type NatureId =
  | "mountain" | "forest" | "palms" | "cactus" | "cherry" | "savannaTree"
  | "icebergs" | "tulips" | "cypress";

export type BiomeId = "grass" | "sand" | "snow" | "savanna" | "rock";
export type SkyId = "day" | "sunset" | "dusk";

function m(color: string | number, opts?: { rough?: number; metal?: number; emissive?: string }) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts?.rough ?? 0.85,
    metalness: opts?.metal ?? 0,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts?.emissive ? 0.7 : 0,
  });
}

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function cyl(rt: number, rb: number, h: number, mat: THREE.Material, seg = 10): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

function cone(r: number, h: number, mat: THREE.Material, seg = 8): THREE.Mesh {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
}

function sphere(r: number, mat: THREE.Material, seg = 10): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
}

function ell(rx: number, ry: number, rz: number, mat: THREE.Material): THREE.Mesh {
  const mesh = sphere(1, mat);
  mesh.scale.set(rx, ry, rz);
  return mesh;
}

// ─── Landmarks ────────────────────────────────────────────────────────────────

const landmarks: Record<LandmarkId, () => THREE.Group> = {
  eiffel() {
    const g = new THREE.Group();
    const iron = m("#8a6d4a", { metal: 0.35, rough: 0.6 });
    // four curving legs → two stacked tapering sections + spire
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const leg = cyl(0.09, 0.16, 2.2, iron, 6);
      leg.position.set(sx * 0.75, 1.1, sz * 0.75);
      leg.rotation.z = -sx * 0.32;
      leg.rotation.x = sz * 0.32;
      g.add(leg);
    }
    const deck1 = box(1.7, 0.16, 1.7, iron);
    deck1.position.y = 2.1;
    g.add(deck1);
    const mid = cyl(0.32, 0.62, 1.8, iron, 6);
    mid.position.y = 3.0;
    g.add(mid);
    const deck2 = box(0.9, 0.13, 0.9, iron);
    deck2.position.y = 3.95;
    g.add(deck2);
    const top = cyl(0.1, 0.3, 1.6, iron, 6);
    top.position.y = 4.8;
    g.add(top);
    const spire = cyl(0.02, 0.05, 0.7, iron, 5);
    spire.position.y = 5.9;
    g.add(spire);
    return g;
  },

  pyramid() {
    const g = new THREE.Group();
    const stone = m("#d9b26a");
    const big = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.6, 4), stone);
    big.position.y = 1.3;
    big.rotation.y = Math.PI / 4;
    g.add(big);
    const small = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.5, 4), m("#e3c078"));
    small.position.set(-2.6, 0.75, 1.2);
    small.rotation.y = Math.PI / 4;
    g.add(small);
    return g;
  },

  colosseum() {
    const g = new THREE.Group();
    const stone = m("#e0cfa8");
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.1, 1.7, 18, 1, true),
      new THREE.MeshStandardMaterial({ color: "#e0cfa8", side: THREE.DoubleSide, flatShading: true })
    );
    outer.position.y = 0.85;
    g.add(outer);
    // broken rim (the famous ruined top)
    for (let i = 0; i < 12; i++) {
      const a = (i / 18) * Math.PI * 2;
      const seg = box(0.55, 0.5, 0.22, stone);
      seg.position.set(Math.cos(a) * 2.02, 1.9, Math.sin(a) * 2.02);
      seg.rotation.y = -a;
      g.add(seg);
    }
    // arches: dark insets
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const arch = box(0.24, 0.5, 0.06, m("#5f5240"));
      arch.position.set(Math.cos(a) * 2.06, 0.8, Math.sin(a) * 2.06);
      arch.rotation.y = -a + Math.PI / 2;
      g.add(arch);
    }
    return g;
  },

  bigben() {
    const g = new THREE.Group();
    const stone = m("#c9b37e");
    const tower = box(0.9, 3.6, 0.9, stone);
    tower.position.y = 1.8;
    g.add(tower);
    const clockBox = box(1.05, 1.0, 1.05, m("#b09a62"));
    clockBox.position.y = 3.9;
    g.add(clockBox);
    for (let i = 0; i < 4; i++) {
      const face = cyl(0.36, 0.36, 0.06, m("#f5f0dc"), 16);
      face.rotation.x = Math.PI / 2;
      const a = (i * Math.PI) / 2;
      face.position.set(Math.sin(a) * 0.55, 3.9, Math.cos(a) * 0.55);
      face.rotation.y = a;
      g.add(face);
      const hand = box(0.02, 0.22, 0.02, m("#222222"));
      hand.position.set(Math.sin(a) * 0.59, 3.98, Math.cos(a) * 0.59);
      g.add(hand);
    }
    const roof = cone(0.75, 1.1, m("#3f6c4f"), 4);
    roof.position.y = 4.95;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    return g;
  },

  liberty() {
    const g = new THREE.Group();
    const copper = m("#4fa08b");
    const base = cyl(0.8, 1.1, 1.2, m("#c9bfa8"), 8);
    base.position.y = 0.6;
    g.add(base);
    const robe = cyl(0.35, 0.62, 2.0, copper, 8);
    robe.position.y = 2.2;
    g.add(robe);
    const head = sphere(0.26, copper);
    head.position.y = 3.45;
    g.add(head);
    // crown spikes
    for (let i = -3; i <= 3; i++) {
      const spike = cone(0.045, 0.3, copper, 4);
      spike.position.set(i * 0.09, 3.72, 0);
      spike.rotation.z = -i * 0.28;
      g.add(spike);
    }
    // torch arm up
    const arm = cyl(0.09, 0.09, 1.15, copper, 6);
    arm.position.set(0.42, 3.5, 0);
    arm.rotation.z = -0.5;
    g.add(arm);
    const flame = cone(0.14, 0.3, m("#ffb347", { emissive: "#ff8c00" }), 6);
    flame.position.set(0.72, 4.25, 0);
    g.add(flame);
    return g;
  },

  operaHouse() {
    const g = new THREE.Group();
    const shellMat = new THREE.MeshStandardMaterial({
      color: "#f5f2e8", flatShading: true, roughness: 0.5, side: THREE.DoubleSide,
    });
    const base = box(4.0, 0.4, 2.0, m("#d9d2bd"));
    base.position.y = 0.2;
    g.add(base);
    // the sails: sphere slices leaning in a row
    for (let i = 0; i < 4; i++) {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.9 - i * 0.06, 12, 8, 0, Math.PI, 0, Math.PI / 2),
        shellMat
      );
      shell.position.set(-1.2 + i * 0.85, 0.4, 0);
      shell.rotation.y = Math.PI / 2;
      shell.rotation.x = -0.35;
      g.add(shell);
    }
    return g;
  },

  greatWall() {
    const g = new THREE.Group();
    const stone = m("#9b8f78");
    // wall snaking over a hill
    const hill = ell(3.2, 1.1, 1.6, m("#5e7d4a"));
    hill.position.y = 0.4;
    g.add(hill);
    for (let i = 0; i < 7; i++) {
      const t = (i / 6) * 2 - 1;
      const seg = box(0.72, 0.5, 0.5, stone);
      seg.position.set(t * 2.6, 1.35 + Math.sin(t * 1.8) * 0.35 + 0.25, Math.cos(t * 2.2) * 0.4);
      seg.rotation.y = Math.sin(t * 2) * 0.4;
      g.add(seg);
    }
    for (const t of [-1, 0, 1]) {
      const tower = box(0.55, 0.9, 0.55, stone);
      tower.position.set(t * 2.6, 1.75 + Math.sin(t * 1.8) * 0.35, Math.cos(t * 2.2) * 0.4);
      g.add(tower);
      const roof = cone(0.45, 0.35, m("#8c3b2e"), 4);
      roof.position.set(t * 2.6, 2.35 + Math.sin(t * 1.8) * 0.35, Math.cos(t * 2.2) * 0.4);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }
    return g;
  },

  tajMahal() {
    const g = new THREE.Group();
    const marble = m("#f6f1e7", { rough: 0.4 });
    const base = box(3.4, 0.35, 2.2, marble);
    base.position.y = 0.18;
    g.add(base);
    const body = box(1.7, 1.2, 1.5, marble);
    body.position.y = 1.0;
    g.add(body);
    const dome = sphere(0.75, marble, 12);
    dome.position.y = 2.15;
    dome.scale.y = 1.15;
    g.add(dome);
    const tip = cone(0.08, 0.4, m("#d4af37", { metal: 0.6 }), 6);
    tip.position.y = 3.15;
    g.add(tip);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const minaret = cyl(0.09, 0.12, 1.9, marble, 8);
      minaret.position.set(sx * 1.5, 1.15, sz * 0.95);
      g.add(minaret);
      const cap = sphere(0.13, marble);
      cap.position.set(sx * 1.5, 2.15, sz * 0.95);
      g.add(cap);
    }
    return g;
  },

  kremlin() {
    const g = new THREE.Group();
    const brick = m("#b8433a");
    const tower = cyl(0.5, 0.62, 2.4, brick, 10);
    tower.position.y = 1.2;
    g.add(tower);
    // the onion dome!
    const onion = sphere(0.62, m("#3d7ec9", { rough: 0.35 }), 12);
    onion.position.y = 2.9;
    onion.scale.y = 1.25;
    g.add(onion);
    const point = cone(0.12, 0.65, m("#d4af37", { metal: 0.6 }), 8);
    point.position.y = 3.9;
    g.add(point);
    const small = cyl(0.3, 0.36, 1.5, brick, 8);
    small.position.set(-1.3, 0.75, 0.4);
    g.add(small);
    const smallOnion = sphere(0.4, m("#3fa060", { rough: 0.35 }), 10);
    smallOnion.position.set(-1.3, 1.8, 0.4);
    smallOnion.scale.y = 1.25;
    g.add(smallOnion);
    return g;
  },

  torii() {
    const g = new THREE.Group();
    const red = m("#d13c2e");
    for (const s of [-1, 1]) {
      const pillar = cyl(0.14, 0.17, 2.4, red, 8);
      pillar.position.set(s * 1.0, 1.2, 0);
      g.add(pillar);
    }
    const beamTop = box(3.1, 0.24, 0.3, red);
    beamTop.position.y = 2.5;
    g.add(beamTop);
    const roofCurve = box(3.4, 0.14, 0.4, m("#3a3a3a"));
    roofCurve.position.y = 2.68;
    g.add(roofCurve);
    const beamMid = box(2.4, 0.18, 0.24, red);
    beamMid.position.y = 1.95;
    g.add(beamMid);
    return g;
  },

  windmill() {
    const g = new THREE.Group();
    const body = cyl(0.55, 0.85, 2.2, m("#b5651d"), 8);
    body.position.y = 1.1;
    g.add(body);
    const roof = cone(0.62, 0.8, m("#6e4218"), 8);
    roof.position.y = 2.6;
    g.add(roof);
    const hub = new THREE.Group();
    hub.name = "spinner";
    for (let i = 0; i < 4; i++) {
      const blade = box(0.18, 1.5, 0.05, m("#f2e8d5"));
      blade.position.y = 0.8;
      const arm = new THREE.Group();
      arm.add(blade);
      arm.rotation.z = (i * Math.PI) / 2;
      hub.add(arm);
    }
    hub.position.set(0, 2.35, 0.7);
    g.add(hub);
    return g;
  },

  moai() {
    const g = new THREE.Group();
    for (const [x, s] of [[-1.1, 0.8], [0, 1.0], [1.1, 0.85]] as [number, number][]) {
      const stone = m("#7d7468");
      const head = box(0.6 * s, 1.5 * s, 0.5 * s, stone);
      head.position.set(x, 0.75 * s + 0.3, 0);
      g.add(head);
      const nose = box(0.14 * s, 0.5 * s, 0.18 * s, m("#6b6257"));
      nose.position.set(x, 0.8 * s + 0.3, 0.3 * s);
      g.add(nose);
      const brow = box(0.5 * s, 0.12 * s, 0.14 * s, m("#6b6257"));
      brow.position.set(x, 1.25 * s + 0.3, 0.26 * s);
      g.add(brow);
    }
    return g;
  },

  christRedeemer() {
    const g = new THREE.Group();
    const stone = m("#e8e4da", { rough: 0.5 });
    const mount = cone(1.6, 1.6, m("#5e7d4a"), 7);
    mount.position.y = 0.8;
    g.add(mount);
    const body = cyl(0.2, 0.34, 1.5, stone, 8);
    body.position.y = 2.3;
    g.add(body);
    const arms = box(2.0, 0.16, 0.22, stone);
    arms.position.y = 2.75;
    g.add(arms);
    const head = sphere(0.17, stone);
    head.position.y = 3.15;
    g.add(head);
    return g;
  },

  machuPicchu() {
    const g = new THREE.Group();
    const grass = m("#69954f");
    const stone = m("#a8a08c");
    const peak = cone(1.3, 2.6, m("#587a45"), 6);
    peak.position.set(-1.6, 1.3, -0.6);
    g.add(peak);
    // terraces
    for (let i = 0; i < 4; i++) {
      const terrace = cyl(1.5 - i * 0.28, 1.62 - i * 0.28, 0.34, i % 2 ? grass : m("#7ba25e"), 8);
      terrace.position.set(0.7, 0.2 + i * 0.34, 0.3);
      g.add(terrace);
    }
    // little stone houses
    for (const [x, z] of [[0.4, 0.3], [1.0, 0.5], [0.7, -0.2]]) {
      const house = box(0.34, 0.26, 0.26, stone);
      house.position.set(x, 1.7, z);
      g.add(house);
      const roof = cone(0.24, 0.2, m("#c9a227"), 4);
      roof.position.set(x, 1.93, z);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }
    return g;
  },

  kilimanjaro() {
    const g = new THREE.Group();
    const mount = cone(2.6, 3.0, m("#8a7355"), 8);
    mount.position.y = 1.5;
    g.add(mount);
    const snow = cone(0.95, 1.05, m("#f6f8fb", { rough: 0.4 }), 8);
    snow.position.y = 2.95;
    g.add(snow);
    return g;
  },

  azrieli() {
    const g = new THREE.Group();
    const glass = m("#9fc9e8", { rough: 0.25, metal: 0.4 });
    // round tower
    const round = cyl(0.5, 0.5, 3.2, glass, 16);
    round.position.set(-1.2, 1.6, 0);
    g.add(round);
    // square tower
    const square = box(0.95, 3.6, 0.95, glass);
    square.position.set(0.2, 1.8, -0.4);
    g.add(square);
    // triangular tower
    const tri = cyl(0.62, 0.62, 3.0, glass, 3);
    tri.position.set(1.5, 1.5, 0.3);
    g.add(tri);
    return g;
  },

  pisa() {
    const g = new THREE.Group();
    const marble = m("#f2ecdd", { rough: 0.45 });
    const tower = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const ring = cyl(0.5, 0.52, 0.5, marble, 14);
      ring.position.y = 0.25 + i * 0.52;
      tower.add(ring);
      const trim = cyl(0.56, 0.56, 0.08, m("#ddd3ba"), 14);
      trim.position.y = 0.52 + i * 0.52;
      tower.add(trim);
    }
    const top = cyl(0.36, 0.4, 0.45, marble, 12);
    top.position.y = 3.3;
    tower.add(top);
    tower.rotation.z = 0.14; // the famous lean!
    g.add(tower);
    return g;
  },
};

// ─── Animals ──────────────────────────────────────────────────────────────────

interface QuadrupedOpts {
  body: string;
  belly?: string;
  size?: number;
  neck?: number;       // neck length (0 = none)
  legLen?: number;
  earSize?: number;
  tailLen?: number;
}

function quadruped(o: QuadrupedOpts): THREE.Group {
  const g = new THREE.Group();
  const s = o.size ?? 1;
  const legLen = (o.legLen ?? 0.55) * s;
  const bodyMat = m(o.body);
  const body = ell(0.75 * s, 0.42 * s, 0.38 * s, bodyMat);
  body.position.y = legLen + 0.3 * s;
  g.add(body);
  for (const [x, z] of [[0.45, 0.22], [0.45, -0.22], [-0.45, 0.22], [-0.45, -0.22]]) {
    const leg = cyl(0.08 * s, 0.07 * s, legLen, bodyMat, 6);
    leg.position.set(x * s, legLen / 2, z * s);
    g.add(leg);
  }
  const neckLen = (o.neck ?? 0) * s;
  const headY = legLen + 0.55 * s + neckLen;
  if (neckLen > 0.01) {
    const neck = cyl(0.12 * s, 0.16 * s, neckLen + 0.3 * s, bodyMat, 6);
    neck.position.set(0.68 * s, legLen + 0.42 * s + neckLen / 2, 0);
    neck.rotation.z = -0.25;
    g.add(neck);
  }
  const head = ell(0.28 * s, 0.24 * s, 0.22 * s, bodyMat);
  head.name = "head";
  head.position.set(0.82 * s + neckLen * 0.35, headY, 0);
  g.add(head);
  const earSize = (o.earSize ?? 0.09) * s;
  for (const sz of [1, -1]) {
    const earMesh = cone(earSize, earSize * 2, bodyMat, 4);
    earMesh.position.set(0.75 * s + neckLen * 0.35, headY + 0.24 * s, sz * 0.12 * s);
    g.add(earMesh);
    const eyeW = sphere(0.045 * s, m("#111111"));
    eyeW.position.set(1.02 * s + neckLen * 0.35, headY + 0.05 * s, sz * 0.1 * s);
    g.add(eyeW);
  }
  const tail = cyl(0.03 * s, 0.015 * s, (o.tailLen ?? 0.45) * s, bodyMat, 5);
  tail.position.set(-0.8 * s, legLen + 0.4 * s, 0);
  tail.rotation.z = 0.7;
  g.add(tail);
  if (o.belly) {
    const belly = ell(0.6 * s, 0.3 * s, 0.32 * s, m(o.belly));
    belly.position.y = legLen + 0.2 * s;
    g.add(belly);
  }
  return g;
}

function bird(body: string, accent: string, opts?: { size?: number; neck?: number; beak?: string }): THREE.Group {
  const g = new THREE.Group();
  const s = opts?.size ?? 1;
  const bodyMat = m(body);
  const b = ell(0.4 * s, 0.45 * s, 0.32 * s, bodyMat);
  b.position.y = 0.75 * s;
  g.add(b);
  const neckLen = (opts?.neck ?? 0) * s;
  const head = sphere(0.2 * s, bodyMat);
  head.position.set(0.22 * s, 1.25 * s + neckLen, 0);
  g.add(head);
  if (neckLen > 0.01) {
    const neck = cyl(0.07 * s, 0.09 * s, neckLen + 0.2 * s, bodyMat, 6);
    neck.position.set(0.14 * s, 1.0 * s + neckLen / 2, 0);
    g.add(neck);
  }
  const beak = cone(0.07 * s, 0.28 * s, m(opts?.beak ?? "#f59e0b"), 5);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.5 * s, 1.23 * s + neckLen, 0);
  g.add(beak);
  for (const sz of [1, -1]) {
    const wing = ell(0.32 * s, 0.14 * s, 0.06 * s, m(accent));
    wing.position.set(-0.05 * s, 0.85 * s, sz * 0.32 * s);
    wing.rotation.x = sz * 0.35;
    g.add(wing);
    const eye = sphere(0.035 * s, m("#111111"));
    eye.position.set(0.34 * s, 1.32 * s + neckLen, sz * 0.09 * s);
    g.add(eye);
  }
  for (const sz of [0.08, -0.08]) {
    const leg = cyl(0.025 * s, 0.025 * s, 0.5 * s, m("#f59e0b"), 5);
    leg.position.set(0, 0.3 * s, sz * s);
    g.add(leg);
  }
  const tail = ell(0.25 * s, 0.1 * s, 0.05 * s, m(accent));
  tail.position.set(-0.42 * s, 0.85 * s, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  return g;
}

const animals: Record<AnimalId, () => THREE.Group> = {
  camel() {
    const g = quadruped({ body: "#c9995c", legLen: 0.8, neck: 0.5, size: 1.05 });
    for (const x of [0.15, -0.35]) {
      const hump = sphere(0.26, m("#b8874d"));
      hump.position.set(x, 1.55, 0);
      g.add(hump);
    }
    return g;
  },
  kangaroo() {
    const g = new THREE.Group();
    const fur = m("#b0713a");
    const body = ell(0.42, 0.62, 0.36, fur);
    body.position.y = 0.95;
    body.rotation.z = 0.3;
    g.add(body);
    const head = ell(0.22, 0.26, 0.18, fur);
    head.position.set(0.35, 1.72, 0);
    g.add(head);
    for (const s of [1, -1]) {
      const ear = cone(0.07, 0.3, fur, 4);
      ear.position.set(0.28, 2.0, s * 0.1);
      g.add(ear);
      const eyeM = sphere(0.04, m("#111111"));
      eyeM.position.set(0.5, 1.78, s * 0.08);
      g.add(eyeM);
      // giant hopping legs
      const thigh = ell(0.3, 0.4, 0.14, fur);
      thigh.position.set(-0.1, 0.55, s * 0.3);
      g.add(thigh);
      const foot = box(0.55, 0.1, 0.16, fur);
      foot.position.set(0.05, 0.06, s * 0.32);
      g.add(foot);
      const arm = cyl(0.05, 0.04, 0.35, fur, 5);
      arm.position.set(0.3, 1.25, s * 0.18);
      arm.rotation.z = 0.5;
      g.add(arm);
    }
    // the thick tail
    const tail = cyl(0.16, 0.05, 1.1, fur, 6);
    tail.position.set(-0.62, 0.35, 0);
    tail.rotation.z = 1.1;
    g.add(tail);
    return g;
  },
  panda() {
    const g = quadruped({ body: "#f5f5f5", legLen: 0.4, size: 1.0, earSize: 0.11 });
    // black limbs/ears/eye patches
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry instanceof THREE.CylinderGeometry || mesh.geometry instanceof THREE.ConeGeometry) {
        mesh.material = m("#1f1f1f");
      }
    });
    for (const s of [1, -1]) {
      const patch = sphere(0.075, m("#1f1f1f"));
      patch.position.set(1.05, 1.02, s * 0.1);
      g.add(patch);
    }
    const bamboo = cyl(0.03, 0.03, 0.9, m("#3fa060"), 5);
    bamboo.position.set(1.15, 0.75, 0.25);
    bamboo.rotation.z = 0.3;
    g.add(bamboo);
    return g;
  },
  lion() {
    const g = quadruped({ body: "#d9a05b", legLen: 0.55, size: 1.05, tailLen: 0.7 });
    const mane = sphere(0.42, m("#8c5425"));
    mane.position.set(0.82, 1.15, 0);
    g.add(mane);
    const face = ell(0.24, 0.22, 0.2, m("#d9a05b"));
    face.position.set(1.0, 1.15, 0);
    g.add(face);
    for (const s of [1, -1]) {
      const eyeM = sphere(0.04, m("#111111"));
      eyeM.position.set(1.2, 1.2, s * 0.09);
      g.add(eyeM);
    }
    return g;
  },
  elephant() {
    const g = quadruped({ body: "#9aa2ab", legLen: 0.75, size: 1.35, earSize: 0.02 });
    // big flappy ears
    for (const s of [1, -1]) {
      const ear = ell(0.3, 0.4, 0.05, m("#8a929b"));
      ear.position.set(1.0, 1.75, s * 0.38);
      ear.rotation.y = s * 0.4;
      g.add(ear);
    }
    // trunk: three descending segments
    let px = 1.45, py = 1.55;
    for (let i = 0; i < 3; i++) {
      const seg = cyl(0.1 - i * 0.02, 0.08 - i * 0.02, 0.45, m("#9aa2ab"), 6);
      seg.position.set(px, py, 0);
      seg.rotation.z = 0.5 + i * 0.5;
      g.add(seg);
      px += 0.16;
      py -= 0.38;
    }
    for (const s of [1, -1]) {
      const tusk = cone(0.045, 0.4, m("#f5f0e6"), 5);
      tusk.position.set(1.4, 1.15, s * 0.16);
      tusk.rotation.z = Math.PI - 0.5;
      g.add(tusk);
    }
    return g;
  },
  bear() {
    const g = quadruped({ body: "#6b4a2e", legLen: 0.5, size: 1.2, earSize: 0.1, tailLen: 0.15 });
    return g;
  },
  llama() {
    const g = quadruped({ body: "#e8dcc8", legLen: 0.85, neck: 0.75, size: 0.95, earSize: 0.08 });
    return g;
  },
  wolf() {
    const g = quadruped({ body: "#7d8a94", belly: "#c3ccd3", legLen: 0.6, size: 0.95, earSize: 0.1, tailLen: 0.6 });
    return g;
  },
  sheep() {
    const g = quadruped({ body: "#f2ede2", legLen: 0.4, size: 0.85, earSize: 0.07 });
    // woolly poofs
    for (let i = 0; i < 6; i++) {
      const poof = sphere(0.22, m("#faf6ec"));
      poof.position.set(-0.5 + (i % 3) * 0.4, 0.95 + Math.floor(i / 3) * 0.18, (i % 2 ? 0.18 : -0.18));
      g.add(poof);
    }
    return g;
  },
  cow() {
    const g = quadruped({ body: "#f5f2ec", legLen: 0.55, size: 1.1, earSize: 0.07 });
    for (const [x, z, r] of [[0.2, 0.2, 0.22], [-0.3, -0.15, 0.28], [0.5, -0.2, 0.16]] as [number, number, number][]) {
      const spot = sphere(r, m("#2b2b2b"));
      spot.position.set(x, 1.05, z * 1.2);
      spot.scale.z = 0.35;
      g.add(spot);
    }
    return g;
  },
  ibex() {
    const g = quadruped({ body: "#a68a64", belly: "#d9c7ab", legLen: 0.65, size: 0.95 });
    // the majestic curved horns
    for (const s of [1, -1]) {
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 12, Math.PI * 1.2), m("#5e4a32"));
      horn.position.set(0.72, 1.42, s * 0.1);
      horn.rotation.y = s * 0.25;
      horn.rotation.z = 0.6;
      g.add(horn);
    }
    return g;
  },
  toucan() {
    const g = bird("#1f2937", "#111827", { size: 0.9, beak: "#f97316" });
    // oversize the famous beak
    const bigBeak = cone(0.12, 0.65, m("#fb923c"), 6);
    bigBeak.rotation.z = -Math.PI / 2;
    bigBeak.position.set(0.62, 1.1, 0);
    g.add(bigBeak);
    const chest = ell(0.22, 0.26, 0.2, m("#fde047"));
    chest.position.set(0.22, 0.72, 0);
    g.add(chest);
    return g;
  },
  eagle() {
    const g = bird("#5b4632", "#3e2f22", { size: 1.05 });
    const headWhite = sphere(0.21, m("#f5f2ec"));
    headWhite.position.set(0.23, 1.32, 0);
    g.add(headWhite);
    return g;
  },
  rooster() {
    const g = bird("#c0392b", "#8e44ad", { size: 0.85 });
    const comb = box(0.08, 0.16, 0.02, m("#e74c3c"));
    comb.position.set(0.19, 1.32, 0);
    g.add(comb);
    const tailFeather = ell(0.3, 0.4, 0.05, m("#27ae60"));
    tailFeather.position.set(-0.45, 1.0, 0);
    tailFeather.rotation.z = 0.7;
    g.add(tailFeather);
    return g;
  },
  crane() {
    const g = bird("#f5f2ec", "#1f2937", { size: 0.9, neck: 0.55, beak: "#57534e" });
    const crown = sphere(0.05, m("#dc2626"));
    crown.position.set(0.22, 2.0, 0);
    g.add(crown);
    return g;
  },
};

// ─── Nature pieces ────────────────────────────────────────────────────────────

function tree(trunkH: number, crown: string, crownShape: "cone" | "sphere" = "cone"): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.08, 0.12, trunkH, m("#6e4a2b"), 6);
  trunk.position.y = trunkH / 2;
  g.add(trunk);
  if (crownShape === "cone") {
    for (let i = 0; i < 3; i++) {
      const layer = cone(0.55 - i * 0.13, 0.6, m(crown), 7);
      layer.position.y = trunkH + 0.2 + i * 0.38;
      g.add(layer);
    }
  } else {
    const ball = sphere(0.5, m(crown), 8);
    ball.position.y = trunkH + 0.35;
    g.add(ball);
  }
  return g;
}

function addBillboardOr(
  g: THREE.Group,
  kind: Parameters<typeof natureBillboard>[0],
  size: number,
  x: number,
  z: number,
  fallback: () => THREE.Object3D,
  opts?: Parameters<typeof natureBillboard>[2]
) {
  if (hasNatureSprite(kind)) {
    const bb = natureBillboard(kind, size, opts);
    if (bb) {
      bb.position.set(x, 0, z);
      g.add(bb);
      return;
    }
  }
  const f = fallback();
  f.position.set(x, 0, z);
  g.add(f);
}

const nature: Record<NatureId, () => THREE.Group> = {
  mountain() {
    const g = new THREE.Group();
    const mount = cone(1.5, 2.2, m("#7d8a94"), 7);
    mount.position.y = 1.1;
    g.add(mount);
    const cap = cone(0.55, 0.75, m("#f6f8fb", { rough: 0.4 }), 7);
    cap.position.y = 2.35;
    g.add(cap);
    if (hasNatureSprite("rock")) {
      for (const [x, z, s] of [[-1.1, 0.6, 0.7], [1.0, -0.5, 0.55]] as [number, number, number][]) {
        const r = natureBillboard("rock", s);
        if (r) {
          r.position.set(x, 0, z);
          g.add(r);
        }
      }
    }
    return g;
  },
  forest() {
    const g = new THREE.Group();
    for (const [x, z, h] of [[-0.6, 0.3, 0.7], [0.2, -0.4, 0.9], [0.8, 0.4, 0.6], [0, 0.6, 0.8]] as [number, number, number][]) {
      addBillboardOr(g, "tree", 1.4 + h, x, z, () => tree(h, "#2f7d46"), { sway: 0.025 });
    }
    return g;
  },
  palms() {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.4, 0.2], [0.6, -0.3]] as [number, number][]) {
      addBillboardOr(g, "palm", 2.2, x, z, () => {
        const p = new THREE.Group();
        const trunk = cyl(0.06, 0.1, 1.6, m("#8a6a45"), 6);
        trunk.position.y = 0.8;
        p.add(trunk);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const frond = ell(0.55, 0.06, 0.16, m("#3fa060"));
          frond.position.set(Math.cos(a) * 0.4, 1.68, Math.sin(a) * 0.4);
          frond.rotation.y = -a;
          frond.rotation.z = 0.35;
          p.add(frond);
        }
        return p;
      }, { sway: 0.03, widthScale: 0.7 });
    }
    return g;
  },
  cactus() {
    const g = new THREE.Group();
    addBillboardOr(g, "cactus", 1.8, 0, 0, () => {
      const p = new THREE.Group();
      const green = m("#3d8b57");
      const main = cyl(0.16, 0.18, 1.5, green, 8);
      main.position.y = 0.75;
      p.add(main);
      for (const s of [1, -1]) {
        const arm = cyl(0.1, 0.1, 0.6, green, 6);
        arm.position.set(s * 0.32, 0.9, 0);
        arm.rotation.z = s * -0.9;
        p.add(arm);
        const armUp = cyl(0.09, 0.09, 0.45, green, 6);
        armUp.position.set(s * 0.52, 1.3, 0);
        p.add(armUp);
      }
      return p;
    }, { widthScale: 0.65 });
    return g;
  },
  cherry() {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.4, 0.2], [0.55, -0.25]]) {
      addBillboardOr(g, "cherry", 2.0, x, z, () => tree(0.9, "#f5a8c7", "sphere"), { sway: 0.02 });
    }
    return g;
  },
  savannaTree() {
    const g = new THREE.Group();
    addBillboardOr(g, "acacia", 2.2, 0, 0, () => {
      const p = new THREE.Group();
      const trunk = cyl(0.09, 0.14, 1.3, m("#6e4a2b"), 6);
      trunk.position.y = 0.65;
      p.add(trunk);
      const crown = ell(1.0, 0.22, 1.0, m("#5c8a3d"));
      crown.position.y = 1.5;
      p.add(crown);
      return p;
    }, { widthScale: 0.95 });
    return g;
  },
  icebergs() {
    const g = new THREE.Group();
    for (const [x, z, s] of [[-0.7, 0.3, 0.8], [0.5, -0.3, 1.1], [1.1, 0.5, 0.55]] as [number, number, number][]) {
      if (hasNatureSprite("rock")) {
        const r = natureBillboard("rock", 0.9 * s, { tint: 0xdcf0fa });
        if (r) {
          r.position.set(x, 0, z);
          g.add(r);
          continue;
        }
      }
      const berg = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 0), m("#dcf0fa", { rough: 0.3 }));
      berg.position.set(x, 0.3 * s, z);
      g.add(berg);
    }
    return g;
  },
  tulips() {
    const g = new THREE.Group();
    if (hasNatureSprite("flowers")) {
      for (const [x, z] of [[-0.5, 0], [0.2, 0.3], [0.7, -0.2]]) {
        const f = natureBillboard("flowers", 0.7, { widthScale: 1.1 });
        if (f) {
          f.position.set(x, 0, z);
          g.add(f);
        }
      }
      return g;
    }
    const colors = ["#e74c3c", "#f1c40f", "#e91e8c", "#9b59b6"];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        const stem = cyl(0.02, 0.02, 0.35, m("#2f7d46"), 4);
        const x = -0.8 + i * 0.4;
        const z = -0.3 + row * 0.35;
        stem.position.set(x, 0.18, z);
        g.add(stem);
        const bud = sphere(0.08, m(colors[(i + row) % colors.length]), 6);
        bud.position.set(x, 0.42, z);
        bud.scale.y = 1.3;
        g.add(bud);
      }
    }
    return g;
  },
  cypress() {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.5, 0.2], [0.1, -0.3], [0.7, 0.25]]) {
      addBillboardOr(g, "cypress", 2.0, x, z, () => {
        const t = new THREE.Group();
        const trunk = cyl(0.05, 0.07, 0.3, m("#6e4a2b"), 5);
        trunk.position.y = 0.15;
        t.add(trunk);
        const crown = ell(0.2, 0.85, 0.2, m("#2d6a3f"));
        crown.position.y = 1.05;
        t.add(crown);
        return t;
      }, { widthScale: 0.45 });
    }
    return g;
  },
};

// ─── Public builders ──────────────────────────────────────────────────────────

const LANDMARK_PAINT_SIZE: Partial<Record<LandmarkId, number>> = {
  eiffel: 4.2,
  pyramid: 3.2,
  colosseum: 3.4,
  bigben: 4.0,
  liberty: 3.8,
  operaHouse: 3.0,
  greatWall: 3.2,
  tajMahal: 3.4,
  kremlin: 3.4,
  torii: 3.0,
  windmill: 3.4,
  moai: 3.2,
  christRedeemer: 3.8,
  machuPicchu: 3.2,
  kilimanjaro: 3.2,
  azrieli: 4.0,
  pisa: 3.8,
};

const ANIMAL_PAINT_SIZE: Partial<Record<AnimalId, number>> = {
  camel: 2.4,
  kangaroo: 2.2,
  panda: 2.0,
  lion: 2.2,
  elephant: 2.6,
  bear: 2.2,
  llama: 2.3,
  toucan: 1.6,
  eagle: 1.8,
  rooster: 1.5,
  ibex: 2.0,
  wolf: 2.0,
  sheep: 1.8,
  cow: 2.2,
  crane: 2.2,
};

export function buildLandmark(id: LandmarkId): THREE.Group {
  // Keep windmill procedural so the named "spinner" blades still animate.
  if (id !== "windmill" && hasLandmarkSprite(id)) {
    const painted = paintedLandmark(id, LANDMARK_PAINT_SIZE[id] ?? 3.4);
    if (painted) return painted;
  }
  return landmarks[id]();
}

export function buildAnimal(id: AnimalId): THREE.Group {
  if (hasAnimalSprite(id)) {
    const painted = paintedAnimal(id, ANIMAL_PAINT_SIZE[id] ?? 2.2);
    if (painted) return painted;
  }
  return animals[id]();
}

export function buildNature(id: NatureId): THREE.Group {
  return nature[id]();
}

export const LANDMARK_IDS = Object.keys(landmarks) as LandmarkId[];
export const ANIMAL_IDS = Object.keys(animals) as AnimalId[];
export const NATURE_IDS = Object.keys(nature) as NatureId[];

export const BIOME_COLORS: Record<BiomeId, { ground: string; detail: string }> = {
  grass:   { ground: "#79a860", detail: "#5c8a3d" },
  sand:    { ground: "#e3cd94", detail: "#cdb476" },
  snow:    { ground: "#eef4f8", detail: "#d5e4ee" },
  savanna: { ground: "#c9b36a", detail: "#a8934f" },
  rock:    { ground: "#a29a8c", detail: "#7d766b" },
};

export const SKY_GRADIENTS: Record<SkyId, [string, string, string]> = {
  day:    ["#5db4e8", "#a8d8f0", "#e8f4fa"],
  sunset: ["#4a5fa8", "#e88a5d", "#f7c873"],
  dusk:   ["#1e2a5e", "#4a5fa8", "#8a7fb8"],
};
