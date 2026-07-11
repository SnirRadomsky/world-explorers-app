// פלאי העולם — rich, hand-built 3D sites for the 20 famous landmarks.
// Every site is assembled from primitives + painted details (no assets),
// sized for a round stage of radius ~9, ground at y=0. Animatable parts get
// names ("aurora0", "penguin0", "spinner"...) that LandmarkScene drives.

import * as THREE from "three";
import { buildAnimal } from "./dioramaKit";

function m(color: string | number, opts?: {
  rough?: number; metal?: number; emissive?: string; emissiveIntensity?: number;
  opacity?: number; side?: THREE.Side; flat?: boolean;
}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: opts?.flat ?? true,
    roughness: opts?.rough ?? 0.85,
    metalness: opts?.metal ?? 0,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts?.emissive ? (opts?.emissiveIntensity ?? 0.7) : 0,
    transparent: opts?.opacity !== undefined,
    opacity: opts?.opacity ?? 1,
    side: opts?.side ?? THREE.FrontSide,
  });
}

const box = (w: number, h: number, d: number, mat: THREE.Material) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, seg = 12) =>
  new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
const cone = (r: number, h: number, mat: THREE.Material, seg = 8) =>
  new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
const sph = (r: number, mat: THREE.Material, seg = 12) =>
  new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);

function ell(rx: number, ry: number, rz: number, mat: THREE.Material, seg = 12): THREE.Mesh {
  const e = sph(1, mat, seg);
  e.scale.set(rx, ry, rz);
  return e;
}

/** Deterministic tiny rng per site so layouts never shuffle. */
function rngFor(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Small shared props ───────────────────────────────────────────────────────

function palmTree(h = 2.2): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.07, 0.12, h, m("#8a6a45"), 6);
  trunk.position.y = h / 2;
  trunk.rotation.z = 0.08;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const frond = ell(0.65, 0.07, 0.2, m("#3fa060"));
    frond.position.set(Math.cos(a) * 0.5 + 0.12, h + 0.05, Math.sin(a) * 0.5);
    frond.rotation.y = -a;
    frond.rotation.z = 0.4;
    g.add(frond);
  }
  return g;
}

function roundTree(crown: string, h = 1.1, r = 0.55): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.08, 0.11, h, m("#6e4a2b"), 6);
  trunk.position.y = h / 2;
  g.add(trunk);
  const ball = sph(r, m(crown), 9);
  ball.position.y = h + r * 0.7;
  g.add(ball);
  return g;
}

/** A tiny white dove (for the Kotel & harbor gulls). */
function dove(color = "#f8fafc"): THREE.Group {
  const g = new THREE.Group();
  const body = ell(0.16, 0.11, 0.1, m(color, { flat: false }));
  body.position.y = 0.1;
  g.add(body);
  const head = sph(0.07, m(color, { flat: false }), 8);
  head.position.set(0.14, 0.19, 0);
  g.add(head);
  const beak = cone(0.02, 0.06, m("#f59e0b"), 4);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.22, 0.19, 0);
  g.add(beak);
  const tail = ell(0.12, 0.03, 0.06, m(color, { flat: false }));
  tail.position.set(-0.16, 0.12, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  for (const s of [1, -1]) {
    const wing = ell(0.1, 0.025, 0.07, m("#e2e8f0", { flat: false }));
    wing.position.set(0, 0.15, s * 0.09);
    g.add(wing);
  }
  return g;
}

/** Standing penguin (Antarctica) — body, white front, beak, flippers, feet. */
function standingPenguin(size = 1): THREE.Group {
  const g = new THREE.Group();
  const body = ell(0.32 * size, 0.5 * size, 0.3 * size, m("#111827", { flat: false }));
  body.position.y = 0.52 * size;
  g.add(body);
  const belly = ell(0.24 * size, 0.4 * size, 0.24 * size, m("#f9fafb", { flat: false }));
  belly.position.set(0.09 * size, 0.48 * size, 0);
  g.add(belly);
  const head = sph(0.2 * size, m("#111827", { flat: false }), 10);
  head.position.y = 1.05 * size;
  g.add(head);
  const beak = cone(0.05 * size, 0.16 * size, m("#f59e0b"), 5);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.22 * size, 1.03 * size, 0);
  g.add(beak);
  for (const s of [1, -1]) {
    const eye = sph(0.032 * size, m("#f8fafc", { flat: false }), 6);
    eye.position.set(0.14 * size, 1.1 * size, s * 0.09 * size);
    g.add(eye);
    const pupil = sph(0.016 * size, m("#0b1220"), 6);
    pupil.position.set(0.17 * size, 1.1 * size, s * 0.095 * size);
    g.add(pupil);
    const wing = ell(0.07 * size, 0.26 * size, 0.04 * size, m("#111827", { flat: false }));
    wing.position.set(0, 0.6 * size, s * 0.32 * size);
    wing.rotation.x = s * 0.25;
    g.add(wing);
    const foot = ell(0.12 * size, 0.03 * size, 0.08 * size, m("#f59e0b"));
    foot.position.set(0.06 * size, 0.03 * size, s * 0.12 * size);
    g.add(foot);
  }
  return g;
}

/** Giraffe — the savanna star that dioramaKit doesn't have. */
function giraffe(): THREE.Group {
  const g = new THREE.Group();
  const fur = m("#e2b04a", { flat: false });
  const body = ell(0.75, 0.45, 0.4, fur);
  body.position.y = 1.35;
  g.add(body);
  for (const [x, z] of [[0.45, 0.2], [0.45, -0.2], [-0.45, 0.2], [-0.45, -0.2]]) {
    const leg = cyl(0.08, 0.07, 1.15, fur, 6);
    leg.position.set(x, 0.58, z);
    g.add(leg);
  }
  const neck = cyl(0.13, 0.18, 1.5, fur, 8);
  neck.position.set(0.68, 2.25, 0);
  neck.rotation.z = -0.25;
  g.add(neck);
  const head = ell(0.26, 0.2, 0.18, fur);
  head.position.set(1.1, 3.0, 0);
  g.add(head);
  for (const s of [1, -1]) {
    const ossicone = cyl(0.02, 0.02, 0.18, m("#8c6a2f"), 5);
    ossicone.position.set(1.02, 3.2, s * 0.08);
    g.add(ossicone);
    const knob = sph(0.035, m("#6e4a2b"), 6);
    knob.position.set(1.02, 3.3, s * 0.08);
    g.add(knob);
    const ear = ell(0.08, 0.04, 0.05, fur);
    ear.position.set(0.98, 3.08, s * 0.16);
    g.add(ear);
    const eye = sph(0.03, m("#111111"), 6);
    eye.position.set(1.22, 3.06, s * 0.09);
    g.add(eye);
  }
  // patches
  const rnd = rngFor(31);
  for (let i = 0; i < 14; i++) {
    const patch = ell(0.09, 0.07, 0.02, m("#a8722e", { flat: false }));
    const a = rnd() * Math.PI * 2;
    patch.position.set(-0.5 + rnd() * 1.1, 1.15 + rnd() * 0.45, Math.sin(a) > 0 ? 0.41 : -0.41);
    g.add(patch);
  }
  const tail = cyl(0.025, 0.01, 0.6, fur, 5);
  tail.position.set(-0.75, 1.15, 0);
  tail.rotation.z = 0.3;
  g.add(tail);
  return g;
}

/** Reindeer for Lapland — quadruped + branching antlers. */
function reindeer(): THREE.Group {
  const g = new THREE.Group();
  const fur = m("#8d6c4c", { flat: false });
  const body = ell(0.62, 0.36, 0.3, fur);
  body.position.y = 0.85;
  g.add(body);
  for (const [x, z] of [[0.38, 0.16], [0.38, -0.16], [-0.38, 0.16], [-0.38, -0.16]]) {
    const leg = cyl(0.05, 0.045, 0.7, fur, 5);
    leg.position.set(x, 0.35, z);
    g.add(leg);
  }
  const neck = cyl(0.1, 0.13, 0.5, fur, 6);
  neck.position.set(0.6, 1.2, 0);
  neck.rotation.z = -0.5;
  g.add(neck);
  const head = ell(0.2, 0.15, 0.13, fur);
  head.position.set(0.82, 1.42, 0);
  g.add(head);
  const nose = sph(0.05, m("#b91c1c", { emissive: "#dc2626", emissiveIntensity: 0.5 }), 6);
  nose.position.set(1.0, 1.4, 0);
  g.add(nose);
  for (const s of [1, -1]) {
    const eye = sph(0.025, m("#111111"), 5);
    eye.position.set(0.88, 1.5, s * 0.08);
    g.add(eye);
    // antlers: main beam + two tines
    const beam = cyl(0.02, 0.03, 0.55, m("#d9c7ab"), 5);
    beam.position.set(0.72, 1.72, s * 0.09);
    beam.rotation.z = 0.35;
    beam.rotation.x = s * 0.35;
    g.add(beam);
    for (const [ty, tz] of [[0.14, 0.14], [0.3, 0.05]]) {
      const tine = cyl(0.013, 0.018, 0.26, m("#d9c7ab"), 4);
      tine.position.set(0.64, 1.72 + ty, s * (0.09 + tz));
      tine.rotation.z = -0.5;
      tine.rotation.x = s * 0.5;
      g.add(tine);
    }
  }
  return g;
}

// ─── The site builders (one per landmark) ─────────────────────────────────────

type SiteBuilder = () => THREE.Group;

const sites: Record<string, SiteBuilder> = {
  kotel() {
    const g = new THREE.Group();
    const rnd = rngFor(376);
    // the great wall of huge stones — lower courses bigger, top weathered
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const big = r < 2;
      const h = big ? 0.95 : 0.68;
      const y = r < 2 ? r * 0.95 + h / 2 : 1.9 + (r - 2) * 0.68 + h / 2;
      const cols = 8;
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        const w = 1.45 + rnd() * 0.25;
        const shade = 0.9 + rnd() * 0.2;
        const stone = box(w, h - 0.05, 0.8,
          m(new THREE.Color("#dbc9a3").multiplyScalar(shade).getHex(), { rough: 0.95 }));
        stone.position.set(-5.2 + cIdx * 1.52 + (r % 2) * 0.5, y, -3.2);
        g.add(stone);
      }
    }
    // caper bushes growing out of the crevices
    for (let i = 0; i < 6; i++) {
      const bush = ell(0.28 + rnd() * 0.15, 0.2, 0.2, m("#4d7c0f"));
      bush.position.set(-4.5 + rnd() * 9, 1.6 + rnd() * 3.4, -2.72);
      g.add(bush);
    }
    // stone plaza tiles in front
    for (let i = 0; i < 14; i++) {
      const tile = box(1.15, 0.05, 1.15, m(i % 2 ? "#d5c7a9" : "#cbbc9c", { rough: 1 }));
      tile.position.set(-4.2 + (i % 7) * 1.25, 0.03, -0.6 + Math.floor(i / 7) * 1.25);
      g.add(tile);
    }
    // doves on the wall and the plaza
    const d1 = dove(); d1.position.set(-2.2, 5.05, -3.1); d1.name = "dove0"; g.add(d1);
    const d2 = dove(); d2.position.set(2.8, 5.05, -3.0); d2.rotation.y = 2.4; d2.name = "dove1"; g.add(d2);
    const d3 = dove(); d3.position.set(1.2, 0.06, 0.8); d3.rotation.y = -0.8; d3.name = "dove2"; g.add(d3);
    // the wall is a big flat slab — scale the whole site down so it fits the
    // stage nicely from every rotation angle
    g.scale.multiplyScalar(0.74);
    return g;
  },

  pyramids() {
    const g = new THREE.Group();
    // three pyramids, staggered like Giza
    const stones = ["#dbb877", "#e3c078", "#d2ad6b"];
    [[0, -3.4, 2.6, 4.4], [-4.4, -1.8, 1.7, 2.9], [4.0, -1.2, 1.25, 2.1]].forEach(([x, z, r, h], i) => {
      const p = new THREE.Mesh(new THREE.ConeGeometry(r * 1.42, h, 4), m(stones[i], { rough: 0.9 }));
      p.position.set(x, h / 2, z);
      p.rotation.y = Math.PI / 4;
      g.add(p);
    });
    // the Sphinx: lion body + pharaoh head with a nemes headdress
    const sphinx = new THREE.Group();
    const sand = m("#d9b26a", { rough: 0.9 });
    const bodyM = ell(1.3, 0.5, 0.5, sand);
    bodyM.position.y = 0.6;
    sphinx.add(bodyM);
    for (const s of [1, -1]) {
      const paw = box(1.1, 0.28, 0.28, sand);
      paw.position.set(1.15, 0.16, s * 0.35);
      sphinx.add(paw);
    }
    const headB = box(0.55, 0.62, 0.5, sand);
    headB.position.set(1.35, 1.25, 0);
    sphinx.add(headB);
    const nemes = box(0.66, 0.5, 0.72, m("#c9a24f"));
    nemes.position.set(1.3, 1.32, 0);
    sphinx.add(nemes);
    const nemesTop = box(0.5, 0.2, 0.55, m("#c9a24f"));
    nemesTop.position.set(1.33, 1.66, 0);
    sphinx.add(nemesTop);
    sphinx.position.set(0.6, 0, 2.2);
    sphinx.rotation.y = 0.35;
    g.add(sphinx);
    // palms by the "nile" edge
    const p1 = palmTree(2.0); p1.position.set(-3.4, 0, 3.4); g.add(p1);
    const p2 = palmTree(1.6); p2.position.set(-4.4, 0, 2.4); g.add(p2);
    return g;
  },

  savanna() {
    const g = new THREE.Group();
    // flat-top acacia trees
    for (const [x, z, s] of [[-3.4, -1.8, 1.25], [3.6, -2.6, 1.0]] as [number, number, number][]) {
      const t = new THREE.Group();
      const trunk = cyl(0.09 * s, 0.16 * s, 1.7 * s, m("#6e4a2b"), 6);
      trunk.position.y = 0.85 * s;
      trunk.rotation.z = 0.12;
      t.add(trunk);
      const branch = cyl(0.05 * s, 0.08 * s, 0.9 * s, m("#6e4a2b"), 5);
      branch.position.set(0.4 * s, 1.5 * s, 0);
      branch.rotation.z = -0.9;
      t.add(branch);
      const crown = ell(1.5 * s, 0.28 * s, 1.5 * s, m("#5c8a3d"));
      crown.position.y = 2.0 * s;
      t.add(crown);
      t.position.set(x, 0, z);
      g.add(t);
    }
    // baobab
    const baobab = new THREE.Group();
    const fatTrunk = cyl(0.55, 0.75, 2.2, m("#8a6a4a"), 9);
    fatTrunk.position.y = 1.1;
    baobab.add(fatTrunk);
    const crown2 = ell(1.1, 0.35, 1.1, m("#71963f"));
    crown2.position.y = 2.5;
    baobab.add(crown2);
    baobab.position.set(-0.6, 0, -4.0);
    g.add(baobab);
    // distant Kilimanjaro
    const kili = cone(3.2, 3.4, m("#8a7355"), 8);
    kili.position.set(5.4, 1.2, -6.4);
    g.add(kili);
    const snow = cone(1.15, 1.1, m("#f6f8fb", { rough: 0.4 }), 8);
    snow.position.set(5.4, 3.35, -6.4);
    g.add(snow);
    // the animals
    const lion = buildAnimal("lion");
    lion.scale.multiplyScalar(0.85);
    lion.position.set(1.8, 0, 1.6);
    lion.rotation.y = -0.6;
    g.add(lion);
    const elephant = buildAnimal("elephant");
    elephant.scale.multiplyScalar(0.8);
    elephant.position.set(-3.2, 0, 1.2);
    elephant.rotation.y = 0.7;
    g.add(elephant);
    const gir = giraffe();
    gir.scale.multiplyScalar(0.95);
    gir.position.set(3.8, 0, -0.9);
    gir.rotation.y = 2.6;
    g.add(gir);
    // grass tufts
    const rnd = rngFor(404);
    for (let i = 0; i < 22; i++) {
      const tuft = cone(0.06, 0.3 + rnd() * 0.2, m("#b8a34f"), 4);
      tuft.position.set((rnd() - 0.5) * 13, 0.15, (rnd() - 0.5) * 11);
      g.add(tuft);
    }
    return g;
  },

  eiffel() {
    const g = new THREE.Group();
    const iron = m("#9a734c", { metal: 0.22, rough: 0.55, flat: false });
    // four curved legs
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 1.7, 0, sz * 1.7),
        new THREE.Vector3(sx * 1.25, 1.4, sz * 1.25),
        new THREE.Vector3(sx * 0.72, 2.6, sz * 0.72),
        new THREE.Vector3(sx * 0.5, 3.4, sz * 0.5),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.13, 6), iron));
      // lattice cross-braces on the lower legs
      for (let i = 0; i < 3; i++) {
        const t0 = 0.12 + i * 0.22;
        const p0 = curve.getPoint(t0);
        const brace = cyl(0.025, 0.025, 1.35 - i * 0.3, iron, 4);
        brace.position.set(p0.x * 0.72, p0.y + 0.15, p0.z * 0.72);
        brace.rotation.z = sx * 0.85;
        brace.rotation.y = sz * 0.5;
        g.add(brace);
      }
    }
    // the arch between the front legs
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.07, 6, 16, Math.PI), iron);
    arch.position.set(0, 1.15, 1.42);
    g.add(arch);
    const arch2 = arch.clone();
    arch2.position.z = -1.42;
    g.add(arch2);
    // decks
    const deck1 = box(2.5, 0.18, 2.5, iron);
    deck1.position.y = 2.05;
    g.add(deck1);
    const deck2 = box(1.35, 0.14, 1.35, iron);
    deck2.position.y = 3.5;
    g.add(deck2);
    // upper tower
    const upper = cyl(0.16, 0.5, 2.3, iron, 6);
    upper.position.y = 4.65;
    g.add(upper);
    const cap = box(0.42, 0.14, 0.42, iron);
    cap.position.y = 5.85;
    g.add(cap);
    const antenna = cyl(0.02, 0.045, 0.85, iron, 5);
    antenna.position.y = 6.35;
    g.add(antenna);
    const beacon = sph(0.06, m("#fde68a", { emissive: "#fbbf24", emissiveIntensity: 1.6 }), 6);
    beacon.position.y = 6.8;
    beacon.name = "beacon";
    g.add(beacon);
    // Champ-de-Mars gardens
    for (const z of [3.2, 4.4]) {
      const lawn = box(2.6, 0.06, 0.9, m("#69a85c"));
      lawn.position.set(0, 0.03, z);
      g.add(lawn);
    }
    for (const [x, z] of [[-2.6, 2.6], [2.6, 2.6], [-2.9, 0.4], [2.9, 0.4]]) {
      const t = roundTree("#3f7d46", 0.9, 0.5);
      t.position.set(x, 0, z);
      g.add(t);
    }
    return g;
  },

  greatwall() {
    const g = new THREE.Group();
    // rolling hills
    for (const [x, z, r] of [[-3.6, -2.2, 3.1], [1.4, -3.4, 4.0], [4.6, -0.6, 2.4]] as [number, number, number][]) {
      const hill = ell(r, r * 0.42, r * 0.8, m("#5e7d4a"));
      hill.position.set(x, 0, z);
      g.add(hill);
    }
    const hillY = (x: number) => 1.15 + Math.sin(x * 0.55 + 1.2) * 0.55;
    const stone = m("#9b8f78", { rough: 0.9 });
    // the wall snakes over the hills
    for (let i = 0; i < 11; i++) {
      const x = -5 + i * 1.0;
      const z = -1.6 + Math.cos(x * 0.5) * 1.1;
      const y = hillY(x);
      const seg = box(1.05, 0.6, 0.72, stone);
      seg.position.set(x, y, z);
      seg.rotation.y = Math.sin(x * 0.5) * 0.45;
      g.add(seg);
      // crenellations
      for (const dx of [-0.32, 0, 0.32]) {
        const cren = box(0.16, 0.14, 0.72, stone);
        cren.position.set(x + dx, y + 0.37, z);
        cren.rotation.y = seg.rotation.y;
        g.add(cren);
      }
    }
    // watch towers with red roofs
    for (const tx of [-4.2, 0, 4.2]) {
      const z = -1.6 + Math.cos(tx * 0.5) * 1.1;
      const y = hillY(tx);
      const tower = box(0.95, 1.15, 0.95, stone);
      tower.position.set(tx, y + 0.5, z);
      g.add(tower);
      const roof = cone(0.8, 0.55, m("#a03d2e"), 4);
      roof.position.set(tx, y + 1.35, z);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
    }
    // a panda snacking at the foot of the wall
    const panda = buildAnimal("panda");
    panda.scale.multiplyScalar(0.85);
    panda.position.set(2.2, 0, 2.4);
    panda.rotation.y = -0.7;
    g.add(panda);
    // bamboo
    for (const [x, z] of [[3.2, 2.9], [3.5, 2.2], [2.9, 3.3]]) {
      const bam = cyl(0.045, 0.05, 1.5, m("#3fa060"), 5);
      bam.position.set(x, 0.75, z);
      g.add(bam);
    }
    return g;
  },

  colosseum() {
    const g = new THREE.Group();
    const sandStone = m("#e0cfa8", { rough: 0.9, side: THREE.DoubleSide });
    // full lower ring
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.2, 1.9, 26, 1, true), sandStone);
    lower.position.y = 0.95;
    g.add(lower);
    // the famous broken upper ring (2/3 of the circle)
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(3.05, 3.1, 1.25, 26, 1, true, 0, Math.PI * 1.35),
      m("#d9c69c", { rough: 0.9, side: THREE.DoubleSide })
    );
    upper.position.y = 2.5;
    upper.rotation.y = 1.1;
    g.add(upper);
    // two rows of dark arches
    for (let row = 0; row < 2; row++) {
      const count = 18;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        if (row === 1) {
          // top row only where the upper ring survives
          const rel = ((a - 1.1) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          if (rel > Math.PI * 1.35) continue;
        }
        const arch = box(0.3, row === 0 ? 0.7 : 0.55, 0.06, m("#5f5240"));
        arch.position.set(Math.cos(a) * 3.17, 0.85 + row * 1.55, Math.sin(a) * 3.17);
        arch.rotation.y = -a + Math.PI / 2;
        g.add(arch);
      }
    }
    // inner wall + arena floor
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.9, 20, 1, true), m("#cbb894", { rough: 1, side: THREE.DoubleSide }));
    inner.position.y = 0.45;
    g.add(inner);
    const arena = new THREE.Mesh(new THREE.CircleGeometry(2.0, 22), m("#e3cd94", { rough: 1 }));
    arena.rotation.x = -Math.PI / 2;
    arena.position.y = 0.06;
    g.add(arena);
    // cypress trees around
    for (const [x, z] of [[-4.6, 1.6], [4.6, 1.9], [-3.9, -2.8]]) {
      const t = new THREE.Group();
      const trunk = cyl(0.06, 0.08, 0.4, m("#6e4a2b"), 5);
      trunk.position.y = 0.2;
      t.add(trunk);
      const crown = ell(0.28, 1.05, 0.28, m("#2d6a3f"));
      crown.position.y = 1.3;
      t.add(crown);
      t.position.set(x, 0, z);
      g.add(t);
    }
    return g;
  },

  liberty() {
    const g = new THREE.Group();
    // the harbor water + island
    const water = new THREE.Mesh(new THREE.CircleGeometry(8.6, 30), m("#3a7cb8", { rough: 0.25, metal: 0.15 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.02;
    g.add(water);
    const island = cyl(2.9, 3.3, 0.5, m("#8aa06b"), 10);
    island.position.y = 0.25;
    g.add(island);
    // star-fort pedestal
    const fort1 = box(2.6, 0.5, 2.6, m("#c9bfa8"));
    fort1.position.y = 0.72;
    g.add(fort1);
    const fort2 = box(2.6, 0.5, 2.6, m("#c9bfa8"));
    fort2.position.y = 0.72;
    fort2.rotation.y = Math.PI / 4;
    g.add(fort2);
    const pedestal = box(1.35, 1.5, 1.35, m("#b9ad94"));
    pedestal.position.y = 1.7;
    g.add(pedestal);
    const pedTop = box(1.0, 0.3, 1.0, m("#c9bfa8"));
    pedTop.position.y = 2.6;
    g.add(pedTop);
    // the statue in weathered copper
    const copper = m("#4fa08b", { rough: 0.55, flat: false });
    const robe = cyl(0.42, 0.66, 2.3, copper, 10);
    robe.position.y = 3.9;
    g.add(robe);
    // torch arm raised high
    const armUp = cyl(0.1, 0.12, 1.3, copper, 6);
    armUp.position.set(0.5, 5.45, 0);
    armUp.rotation.z = -0.45;
    g.add(armUp);
    const torchCup = cyl(0.16, 0.1, 0.22, m("#d4af37", { metal: 0.7, rough: 0.35 }), 8);
    torchCup.position.set(0.82, 6.1, 0);
    g.add(torchCup);
    const flame = cone(0.14, 0.34, m("#ffb347", { emissive: "#ff9020", emissiveIntensity: 1.4 }), 6);
    flame.position.set(0.82, 6.38, 0);
    flame.name = "flame";
    g.add(flame);
    // tablet arm
    const tablet = box(0.34, 0.5, 0.1, copper);
    tablet.position.set(-0.55, 4.3, 0.2);
    tablet.rotation.z = 0.35;
    g.add(tablet);
    // head + the seven-ray crown
    const head = sph(0.3, copper, 12);
    head.position.y = 5.35;
    g.add(head);
    for (let i = -3; i <= 3; i++) {
      const ray = cone(0.05, 0.36, copper, 4);
      ray.position.set(i * 0.1, 5.68 + (3 - Math.abs(i)) * 0.02, 0);
      ray.rotation.z = -i * 0.3;
      g.add(ray);
    }
    // gulls over the harbor
    for (const [x, y, z] of [[-2.6, 3.2, 1.8], [2.4, 4.1, -1.4]]) {
      const gull = dove("#eef2f7");
      gull.scale.multiplyScalar(0.9);
      gull.position.set(x, y, z);
      gull.name = `dove${x > 0 ? 1 : 0}`;
      g.add(gull);
    }
    // a tiny ferry boat
    const boat = new THREE.Group();
    const hull = box(0.9, 0.18, 0.34, m("#c53030"));
    hull.position.y = 0.12;
    boat.add(hull);
    const cabin = box(0.45, 0.2, 0.26, m("#f4f6fb"));
    cabin.position.y = 0.3;
    boat.add(cabin);
    boat.position.set(3.4, 0.02, 3.2);
    boat.rotation.y = 0.6;
    boat.name = "boat";
    g.add(boat);
    return g;
  },

  tajmahal() {
    const g = new THREE.Group();
    const marble = m("#f6f1e7", { rough: 0.35, flat: false });
    // platform
    const plat = box(6.4, 0.45, 4.4, m("#efe7d6", { rough: 0.5 }));
    plat.position.set(0, 0.23, -1.6);
    g.add(plat);
    // main mausoleum with the arched iwan
    const bodyM = box(2.5, 1.9, 2.3, marble);
    bodyM.position.set(0, 1.4, -1.6);
    g.add(bodyM);
    const iwan = box(0.9, 1.35, 0.12, m("#8a7a5f"));
    iwan.position.set(0, 1.25, -0.43);
    g.add(iwan);
    // the great onion dome
    const dome = sph(1.05, marble, 18);
    dome.scale.y = 1.22;
    dome.position.set(0, 3.15, -1.6);
    g.add(dome);
    const tip = cone(0.09, 0.55, m("#d4af37", { metal: 0.7, rough: 0.3 }), 6);
    tip.position.set(0, 4.6, -1.6);
    g.add(tip);
    // four chhatri pavilions
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const pav = cyl(0.28, 0.28, 0.5, marble, 8);
      pav.position.set(sx * 1.05, 2.6, -1.6 + sz * 0.9);
      g.add(pav);
      const pavDome = sph(0.32, marble, 10);
      pavDome.scale.y = 1.1;
      pavDome.position.set(sx * 1.05, 3.0, -1.6 + sz * 0.9);
      g.add(pavDome);
    }
    // four minarets
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const mina = cyl(0.13, 0.18, 2.9, marble, 8);
      mina.position.set(sx * 2.85, 1.9, -1.6 + sz * 1.85);
      g.add(mina);
      const capM = sph(0.2, marble, 8);
      capM.position.set(sx * 2.85, 3.45, -1.6 + sz * 1.85);
      g.add(capM);
    }
    // the long reflecting pool + cypress rows
    const pool = box(0.9, 0.07, 5.2, m("#4a9fd8", { rough: 0.15, metal: 0.2 }));
    pool.position.set(0, 0.05, 3.2);
    g.add(pool);
    for (const s of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        const cy = ell(0.17, 0.55, 0.17, m("#2d6a3f"));
        cy.position.set(s * 1.1, 0.6, 1.4 + i * 1.25);
        g.add(cy);
      }
    }
    return g;
  },

  opera() {
    const g = new THREE.Group();
    // harbor water
    const water = new THREE.Mesh(new THREE.CircleGeometry(8.6, 30), m("#2e7cb8", { rough: 0.2, metal: 0.15 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.02;
    g.add(water);
    // podium
    const podium = box(6.2, 0.55, 3.4, m("#d9d2bd", { rough: 0.7 }));
    podium.position.y = 0.3;
    g.add(podium);
    // the sail shells: two nested rows + a small one
    const shellMat = m("#f7f4ea", { rough: 0.3, flat: false, side: THREE.DoubleSide });
    const sail = (r: number, x: number, z: number, rotY: number, tilt: number) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 0.95, 0, Math.PI / 2), shellMat);
      s.position.set(x, 0.58, z);
      s.rotation.y = rotY;
      s.rotation.x = tilt;
      g.add(s);
    };
    sail(1.5, -1.6, 0.2, Math.PI / 2, -0.4);
    sail(1.25, -0.35, 0.2, Math.PI / 2, -0.45);
    sail(1.0, 0.7, 0.2, Math.PI / 2, -0.5);
    sail(1.15, 2.0, 0.6, Math.PI / 2, -0.42);
    sail(0.9, 2.95, 0.6, Math.PI / 2, -0.48);
    // dark glass beneath the sails
    for (const [x, w] of [[-0.7, 2.6], [2.4, 1.7]]) {
      const glass = box(w, 0.5, 0.1, m("#3a4352", { rough: 0.2, metal: 0.5 }));
      glass.position.set(x, 0.82, 1.15);
      g.add(glass);
    }
    // a kangaroo visitor on the plaza
    const roo = buildAnimal("kangaroo");
    roo.scale.multiplyScalar(0.7);
    roo.position.set(-3.6, 0.55, 1.9);
    roo.rotation.y = 0.6;
    g.add(roo);
    // little sailboat in the harbor
    const sailboat = new THREE.Group();
    const hull = box(0.75, 0.14, 0.28, m("#8a5a2b"));
    hull.position.y = 0.1;
    sailboat.add(hull);
    const mast = cyl(0.02, 0.02, 0.7, m("#6e4a2b"), 4);
    mast.position.y = 0.5;
    sailboat.add(mast);
    const sailTri = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 3), m("#f7f4ea", { side: THREE.DoubleSide }));
    sailTri.position.set(0.05, 0.55, 0);
    sailTri.rotation.z = -0.1;
    sailboat.add(sailTri);
    sailboat.position.set(3.6, 0.02, -2.8);
    sailboat.name = "boat";
    g.add(sailboat);
    return g;
  },

  machu() {
    const g = new THREE.Group();
    // Huayna Picchu peak behind the city
    const peak = cone(2.0, 5.6, m("#4f7a44"), 9);
    peak.position.set(0.4, 2.8, -4.6);
    g.add(peak);
    const peak2 = cone(1.4, 3.4, m("#587a45"), 8);
    peak2.position.set(-2.8, 1.7, -4.0);
    g.add(peak2);
    // drifting mist
    for (const [x, y, z, s] of [[-1.5, 3.4, -3.8, 1.4], [1.8, 4.3, -4.4, 1.1]] as [number, number, number, number][]) {
      const mist = ell(s, s * 0.28, s * 0.5, m("#ffffff", { opacity: 0.55, flat: false }));
      mist.position.set(x, y, z);
      mist.name = `mist${x > 0 ? 1 : 0}`;
      g.add(mist);
    }
    // green terraces
    for (let i = 0; i < 5; i++) {
      const terr = cyl(3.3 - i * 0.5, 3.5 - i * 0.5, 0.42, m(i % 2 ? "#69954f" : "#7ba25e", { rough: 1 }), 14);
      terr.position.y = 0.21 + i * 0.42;
      g.add(terr);
    }
    // stone houses with thatched gable roofs
    const stone = m("#a8a08c", { rough: 0.95 });
    for (const [x, z, ry] of [[-0.9, 0.4, 0.3], [0.6, -0.5, -0.4], [0.9, 0.8, 0.9], [-0.2, -1.0, 0]] as [number, number, number][]) {
      const house = box(0.62, 0.42, 0.46, stone);
      house.position.set(x, 2.4, z);
      house.rotation.y = ry;
      g.add(house);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.62, 3), m("#c9a94f"));
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = ry;
      roof.position.set(x, 2.75, z);
      g.add(roof);
    }
    // llama on the terraces
    const llama = buildAnimal("llama");
    llama.scale.multiplyScalar(0.55);
    llama.position.set(1.9, 1.7, 1.3);
    llama.rotation.y = -1.0;
    g.add(llama);
    return g;
  },

  moai() {
    const g = new THREE.Group();
    // the ocean behind the ahu
    const sea = new THREE.Mesh(new THREE.CircleGeometry(8.6, 30), m("#2a6b9e", { rough: 0.25, metal: 0.1 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.015, 0);
    g.add(sea);
    const islandG = new THREE.Mesh(new THREE.CircleGeometry(6.2, 24), m("#6f9450", { rough: 1 }));
    islandG.rotation.x = -Math.PI / 2;
    islandG.position.y = 0.03;
    g.add(islandG);
    // stone ahu platform
    const ahu = box(7.0, 0.55, 1.4, m("#7d7468", { rough: 0.95 }));
    ahu.position.set(0, 0.3, -2.2);
    g.add(ahu);
    // five moai, two wearing red pukao hats
    const rock = m("#8d8478", { rough: 0.95 });
    const darker = m("#7d7468", { rough: 0.95 });
    [[-2.6, 0.9], [-1.3, 1.05], [0, 1.2], [1.3, 1.0], [2.6, 0.88]].forEach(([x, s], i) => {
      const one = new THREE.Group();
      const bodyM = cyl(0.42 * s, 0.5 * s, 1.5 * s, rock, 8);
      bodyM.position.y = 0.75 * s;
      one.add(bodyM);
      const head = box(0.62 * s, 1.05 * s, 0.55 * s, rock);
      head.position.y = 1.95 * s;
      one.add(head);
      const brow = box(0.56 * s, 0.14 * s, 0.14 * s, darker);
      brow.position.set(0, 2.3 * s, 0.24 * s);
      one.add(brow);
      const noseM = box(0.16 * s, 0.55 * s, 0.18 * s, darker);
      noseM.position.set(0, 2.0 * s, 0.26 * s);
      one.add(noseM);
      const chin = box(0.4 * s, 0.2 * s, 0.12 * s, darker);
      chin.position.set(0, 1.5 * s, 0.25 * s);
      one.add(chin);
      if (i === 1 || i === 3) {
        const pukao = cyl(0.34 * s, 0.4 * s, 0.34 * s, m("#a03d2e", { rough: 0.9 }), 8);
        pukao.position.y = 2.62 * s;
        one.add(pukao);
      }
      one.position.set(x, 0.55, -2.2);
      g.add(one);
    });
    // grass tufts
    const rnd = rngFor(152);
    for (let i = 0; i < 12; i++) {
      const tuft = cone(0.06, 0.28, m("#86a55a"), 4);
      tuft.position.set((rnd() - 0.5) * 9, 0.16, 0.5 + rnd() * 3);
      g.add(tuft);
    }
    return g;
  },

  fuji() {
    const g = new THREE.Group();
    // the perfect volcano cone with its snow cap
    const mount = cone(4.6, 5.2, m("#5a6b8c", { rough: 0.85 }), 24);
    mount.position.set(0, 2.6, -3.6);
    g.add(mount);
    const snow = cone(1.7, 1.95, m("#f6f8fb", { rough: 0.4 }), 24);
    snow.position.set(0, 4.25, -3.6);
    g.add(snow);
    // cloud ring around the waist
    const cloudRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.42, 8, 22),
      m("#ffffff", { opacity: 0.5, flat: false })
    );
    cloudRing.rotation.x = Math.PI / 2;
    cloudRing.position.set(0, 2.7, -3.6);
    cloudRing.name = "cloudring";
    g.add(cloudRing);
    // red torii gate at the front
    const red = m("#d13c2e", { rough: 0.6 });
    for (const s of [-1, 1]) {
      const pillar = cyl(0.13, 0.16, 2.3, red, 8);
      pillar.position.set(s * 1.0, 1.15, 2.2);
      g.add(pillar);
    }
    const beamTop = box(3.0, 0.22, 0.28, red);
    beamTop.position.set(0, 2.42, 2.2);
    g.add(beamTop);
    const roofC = box(3.35, 0.13, 0.38, m("#2f2f2f"));
    roofC.position.set(0, 2.6, 2.2);
    roofC.rotation.z = 0.0;
    g.add(roofC);
    const beamMid = box(2.3, 0.17, 0.22, red);
    beamMid.position.set(0, 1.88, 2.2);
    g.add(beamMid);
    // cherry trees + drifting petals
    for (const [x, z] of [[-3.2, 1.4], [3.4, 1.0], [-2.2, 3.2]]) {
      const t = roundTree("#f5a8c7", 0.85, 0.62);
      t.position.set(x, 0, z);
      g.add(t);
    }
    const rnd = rngFor(392);
    for (let i = 0; i < 10; i++) {
      const petal = sph(0.035, m("#fbcfe8", { flat: false }), 5);
      petal.position.set((rnd() - 0.5) * 8, 0.4 + rnd() * 2.2, (rnd() - 0.5) * 6);
      petal.name = `petal${i}`;
      g.add(petal);
    }
    return g;
  },

  bigben() {
    const g = new THREE.Group();
    const stone = m("#c9b37e", { rough: 0.8 });
    // the Thames + Westminster bridge
    const thames = box(9.5, 0.05, 2.4, m("#4a7fa8", { rough: 0.2, metal: 0.15 }));
    thames.position.set(0, 0.03, 3.1);
    g.add(thames);
    const bridge = box(9.0, 0.18, 0.9, m("#8a9078"));
    bridge.position.set(0, 0.34, 3.1);
    g.add(bridge);
    for (let i = 0; i < 4; i++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 10, Math.PI), m("#7d8368"));
      arch.position.set(-3.2 + i * 2.1, 0.28, 3.1);
      g.add(arch);
    }
    // the red double-decker bus crossing the bridge!
    const bus = new THREE.Group();
    const busBody = box(1.1, 0.62, 0.42, m("#c53030", { rough: 0.5 }));
    busBody.position.y = 0.5;
    bus.add(busBody);
    const windows = box(1.02, 0.13, 0.44, m("#dbeafe", { rough: 0.3 }));
    windows.position.y = 0.66;
    bus.add(windows);
    const windows2 = box(1.02, 0.13, 0.44, m("#dbeafe", { rough: 0.3 }));
    windows2.position.y = 0.4;
    bus.add(windows2);
    for (const wx of [-0.35, 0.35]) {
      const wheel = cyl(0.11, 0.11, 0.48, m("#1f2937"), 10);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.13, 0);
      bus.add(wheel);
    }
    bus.position.set(1.2, 0.42, 3.1);
    bus.name = "bus";
    g.add(bus);
    // clock tower
    const tower = box(0.95, 3.9, 0.95, stone);
    tower.position.set(-2.6, 1.95, -0.8);
    g.add(tower);
    const clockBox = box(1.15, 1.05, 1.15, m("#b09a62"));
    clockBox.position.set(-2.6, 4.35, -0.8);
    g.add(clockBox);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const face = cyl(0.4, 0.4, 0.06, m("#f7f1dc", { rough: 0.4 }), 18);
      face.rotation.x = Math.PI / 2;
      face.position.set(-2.6 + Math.sin(a) * 0.61, 4.35, -0.8 + Math.cos(a) * 0.61);
      face.rotation.y = a;
      g.add(face);
      const hand = box(0.03, 0.28, 0.02, m("#222222"));
      hand.position.set(-2.6 + Math.sin(a) * 0.65, 4.42, -0.8 + Math.cos(a) * 0.65);
      hand.rotation.y = a;
      g.add(hand);
      const hand2 = box(0.03, 0.18, 0.02, m("#222222"));
      hand2.position.set(-2.6 + Math.sin(a) * 0.65, 4.35, -0.8 + Math.cos(a) * 0.65);
      hand2.rotation.z = 1.1;
      hand2.rotation.y = a;
      g.add(hand2);
    }
    const spire = cone(0.75, 1.15, m("#3f6c4f"), 4);
    spire.position.set(-2.6, 5.45, -0.8);
    spire.rotation.y = Math.PI / 4;
    g.add(spire);
    const spike = cyl(0.02, 0.05, 0.6, m("#d4af37", { metal: 0.6 }), 5);
    spike.position.set(-2.6, 6.3, -0.8);
    g.add(spike);
    // parliament block with ribs
    const block = box(3.6, 1.35, 1.1, stone);
    block.position.set(0.6, 0.68, -0.8);
    g.add(block);
    for (let i = 0; i < 7; i++) {
      const rib = box(0.09, 1.5, 0.09, m("#b9a26a"));
      rib.position.set(-0.8 + i * 0.55, 0.75, -0.22);
      g.add(rib);
    }
    const towerS = box(0.6, 2.1, 0.6, stone);
    towerS.position.set(2.5, 1.05, -0.8);
    g.add(towerS);
    const roofS = cone(0.45, 0.6, m("#3f6c4f"), 4);
    roofS.position.set(2.5, 2.4, -0.8);
    roofS.rotation.y = Math.PI / 4;
    g.add(roofS);
    // street lamps
    for (const x of [-4.0, 4.0]) {
      const pole = cyl(0.035, 0.045, 1.2, m("#2f2f2f"), 5);
      pole.position.set(x, 0.6, 1.7);
      g.add(pole);
      const lamp = sph(0.09, m("#fde68a", { emissive: "#fbbf24", emissiveIntensity: 1.2 }), 8);
      lamp.position.set(x, 1.28, 1.7);
      g.add(lamp);
    }
    return g;
  },

  redeemer() {
    const g = new THREE.Group();
    // the bay + city sprinkle at the mountain's feet
    const bay = new THREE.Mesh(new THREE.CircleGeometry(8.6, 30), m("#2e7cb8", { rough: 0.25, metal: 0.1 }));
    bay.rotation.x = -Math.PI / 2;
    bay.position.y = 0.015;
    g.add(bay);
    const shore = new THREE.Mesh(new THREE.CircleGeometry(5.4, 24), m("#7ba25e", { rough: 1 }));
    shore.rotation.x = -Math.PI / 2;
    shore.position.y = 0.03;
    g.add(shore);
    const rnd = rngFor(76);
    for (let i = 0; i < 16; i++) {
      const bld = box(0.22, 0.2 + rnd() * 0.3, 0.22, m(i % 2 ? "#e8e4da" : "#d9d2c4"));
      const a = rnd() * Math.PI * 2;
      const r = 3.4 + rnd() * 1.4;
      bld.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r * 0.7 + 1.2);
      g.add(bld);
    }
    // Corcovado mountain covered in rainforest
    const mount = cone(2.4, 5.6, m("#57744a", { rough: 0.95 }), 9);
    mount.position.set(0, 2.8, -1.8);
    g.add(mount);
    for (let i = 0; i < 10; i++) {
      const bush = sph(0.35 + rnd() * 0.3, m(i % 2 ? "#3f7d46" : "#4f8a50"), 7);
      const a = rnd() * Math.PI * 2;
      const hgt = rnd() * 3.2;
      const rr = 2.3 * (1 - hgt / 5.6);
      bush.position.set(Math.cos(a) * rr, 0.6 + hgt, -1.8 + Math.sin(a) * rr);
      g.add(bush);
    }
    // the statue with open arms
    const white = m("#eef2f7", { rough: 0.4, flat: false });
    const base = box(0.5, 0.4, 0.5, m("#d9d2c4"));
    base.position.set(0, 5.75, -1.8);
    g.add(base);
    const robe = cyl(0.16, 0.3, 1.15, white, 8);
    robe.position.set(0, 6.5, -1.8);
    g.add(robe);
    const arms = box(1.7, 0.13, 0.18, white);
    arms.position.set(0, 6.9, -1.8);
    g.add(arms);
    const head = sph(0.14, white, 10);
    head.position.set(0, 7.2, -1.8);
    g.add(head);
    // toucans in the forest
    const toucan = buildAnimal("toucan");
    toucan.scale.multiplyScalar(0.5);
    toucan.position.set(2.0, 0.03, -0.4);
    toucan.rotation.y = -0.8;
    g.add(toucan);
    return g;
  },

  aurora() {
    const g = new THREE.Group();
    // aurora curtains — vertical gradient planes that sway (named)
    for (let i = 0; i < 3; i++) {
      const w = 7 - i * 1.4;
      const h = 4.2 - i * 0.5;
      const geo = new THREE.PlaneGeometry(w, h, 18, 1);
      let mat: THREE.Material;
      const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
      if (canvas) {
        canvas.width = 64;
        canvas.height = 128;
      }
      const cx = canvas?.getContext("2d");
      if (cx) {
        const grad = cx.createLinearGradient(0, 0, 0, 128);
        grad.addColorStop(0, "rgba(120,80,220,0)");
        grad.addColorStop(0.3, i === 1 ? "rgba(120,90,230,0.55)" : "rgba(60,230,160,0.6)");
        grad.addColorStop(0.75, "rgba(60,230,160,0.35)");
        grad.addColorStop(1, "rgba(60,230,160,0)");
        cx.fillStyle = grad;
        cx.fillRect(0, 0, 64, 128);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
      } else {
        mat = m("#3ce6a0", { opacity: 0.35, side: THREE.DoubleSide, flat: false });
      }
      const curtain = new THREE.Mesh(geo, mat);
      curtain.position.set(-1 + i * 1.4, 4.6 + i * 0.5, -4.6 - i * 0.7);
      curtain.rotation.y = -0.2 + i * 0.25;
      curtain.name = `aurora${i}`;
      g.add(curtain);
    }
    // igloo with a glowing entrance
    const igloo = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      m("#eef4fa", { rough: 0.5 })
    );
    igloo.position.set(2.6, 0, 1.2);
    g.add(igloo);
    const door = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.7, 10, 1, false, 0, Math.PI),
      m("#dde8f2", { rough: 0.5, side: THREE.DoubleSide })
    );
    door.rotation.z = Math.PI / 2;
    door.rotation.y = Math.PI / 2;
    door.position.set(2.6, 0.21, 2.25);
    g.add(door);
    const doorGlow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), m("#ffd9a0", { emissive: "#ffb347", emissiveIntensity: 1.2 }));
    doorGlow.position.set(2.6, 0.3, 2.62);
    g.add(doorGlow);
    // snowy trees
    for (const [x, z, s] of [[-3.2, 0.4, 1.1], [-4.2, -1.2, 0.85], [4.6, -1.0, 0.95]] as [number, number, number][]) {
      const tr = new THREE.Group();
      for (let l = 0; l < 3; l++) {
        const layer = cone(0.55 * s - l * 0.13 * s, 0.6 * s, m("#2d5a44"), 7);
        layer.position.y = 0.5 * s + l * 0.4 * s;
        tr.add(layer);
        const snowCap = cone(0.5 * s - l * 0.13 * s, 0.18 * s, m("#f2f7fc", { rough: 0.4 }), 7);
        snowCap.position.y = 0.68 * s + l * 0.4 * s;
        tr.add(snowCap);
      }
      tr.position.set(x, 0, z);
      g.add(tr);
    }
    // reindeer + sled
    const deer = reindeer();
    deer.position.set(-1.6, 0, 1.8);
    deer.rotation.y = 0.5;
    g.add(deer);
    const sled = new THREE.Group();
    const seat = box(0.8, 0.16, 0.45, m("#a03d2e"));
    seat.position.y = 0.3;
    sled.add(seat);
    const back = box(0.16, 0.4, 0.45, m("#a03d2e"));
    back.position.set(-0.32, 0.55, 0);
    sled.add(back);
    for (const s of [1, -1]) {
      const runner = box(1.1, 0.05, 0.06, m("#6e4a2b"));
      runner.position.set(0, 0.08, s * 0.2);
      sled.add(runner);
    }
    sled.position.set(-3.0, 0, 2.4);
    sled.rotation.y = 0.4;
    g.add(sled);
    // snow drifts
    for (const [x, z, s] of [[0.6, 3.2, 0.8], [-4.6, 2.2, 1.1], [4.2, 2.6, 0.9]] as [number, number, number][]) {
      const drift = ell(s, s * 0.25, s * 0.7, m("#f2f7fc", { rough: 0.5, flat: false }));
      drift.position.set(x, 0.05, z);
      g.add(drift);
    }
    return g;
  },

  penguins() {
    const g = new THREE.Group();
    // dark polar sea + big ice sheet
    const sea = new THREE.Mesh(new THREE.CircleGeometry(8.6, 30), m("#1d4e73", { rough: 0.3, metal: 0.1 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = 0.015;
    g.add(sea);
    const sheet = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 0.5, 22), m("#eef5fa", { rough: 0.55 }));
    sheet.position.y = 0.25;
    g.add(sheet);
    // iceberg backdrop
    const berg = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), m("#dceffa", { rough: 0.35 }));
    berg.position.set(-3.2, 1.6, -4.6);
    berg.rotation.y = 0.6;
    g.add(berg);
    const berg2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0), m("#e6f4fc", { rough: 0.35 }));
    berg2.position.set(3.9, 1.0, -4.2);
    g.add(berg2);
    // melt pool
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), m("#3aa0d8", { rough: 0.15, metal: 0.2 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(2.2, 0.51, 1.6);
    g.add(pool);
    // the colony! standing penguins (named → they waddle-rock)
    const spots: [number, number, number, number][] = [
      [-2.2, 0.5, 0.4, 1.0], [-1.2, 0.5, 1.4, 0.85], [-0.2, 0.5, 0.2, 1.1],
      [0.9, 0.5, 1.1, 0.9], [-2.9, 0.5, 1.8, 0.8], [0.2, 0.5, 2.3, 0.75],
    ];
    spots.forEach(([x, y, z, s], i) => {
      const p = standingPenguin(s);
      p.position.set(x, y, z);
      p.rotation.y = (i * 1.3) % (Math.PI * 2);
      p.name = `penguin${i}`;
      g.add(p);
    });
    // a chick
    const chick = standingPenguin(0.5);
    chick.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.color.getHexString() === "111827") mat.color.set("#9aa6b5");
      }
    });
    chick.position.set(-0.7, 0.5, 1.1);
    chick.rotation.y = 0.9;
    chick.name = "penguin6";
    g.add(chick);
    // one sliding on its belly!
    const slider = standingPenguin(0.95);
    slider.rotation.x = -Math.PI / 2 + 0.1;
    slider.position.set(2.9, 0.62, -0.9);
    slider.rotation.y = -0.7;
    slider.name = "penguin7";
    g.add(slider);
    return g;
  },

  petra() {
    const g = new THREE.Group();
    const rose = m("#c47a6a", { rough: 0.9 });
    const roseDark = m("#a05a4c", { rough: 0.95 });
    // the Siq: two towering canyon walls framing the treasury
    for (const s of [1, -1]) {
      const cliff = box(2.6, 7.2, 3.4, roseDark);
      cliff.position.set(s * 4.1, 3.6, -3.4);
      cliff.rotation.y = s * -0.18;
      g.add(cliff);
      const cliffTop = ell(1.5, 0.7, 1.7, roseDark);
      cliffTop.position.set(s * 4.0, 7.3, -3.4);
      g.add(cliffTop);
    }
    // Al-Khazneh facade carved into the rock
    const slab = box(4.6, 5.6, 0.7, rose);
    slab.position.set(0, 2.8, -3.9);
    g.add(slab);
    // dark doorway
    const door = box(1.0, 1.7, 0.15, m("#3f2a24"));
    door.position.set(0, 0.85, -3.5);
    g.add(door);
    // six columns
    for (let i = 0; i < 6; i++) {
      const col = cyl(0.17, 0.2, 2.6, m("#d18d7c", { rough: 0.8 }), 8);
      col.position.set(-1.9 + i * 0.76, 1.3, -3.45);
      g.add(col);
    }
    // pediment + the famous urn on top
    const pediment = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 4.4, 3), m("#d18d7c"));
    pediment.rotation.z = Math.PI / 2;
    pediment.rotation.y = Math.PI / 2;
    pediment.position.set(0, 3.1, -3.5);
    g.add(pediment);
    const tholos = cyl(0.5, 0.5, 1.2, m("#d18d7c"), 10);
    tholos.position.set(0, 4.35, -3.55);
    g.add(tholos);
    const urn = sph(0.32, m("#b96b5b"), 8);
    urn.scale.y = 1.35;
    urn.position.set(0, 5.25, -3.55);
    g.add(urn);
    // a camel caravan resting on the sand
    const camel = buildAnimal("camel");
    camel.scale.multiplyScalar(0.8);
    camel.position.set(2.6, 0, 1.6);
    camel.rotation.y = -0.9;
    g.add(camel);
    const camel2 = buildAnimal("camel");
    camel2.scale.multiplyScalar(0.65);
    camel2.position.set(3.6, 0, 0.5);
    camel2.rotation.y = -1.3;
    g.add(camel2);
    // scattered desert rocks
    const rnd = rngFor(88);
    for (let i = 0; i < 8; i++) {
      const rock = ell(0.3 + rnd() * 0.3, 0.2 + rnd() * 0.15, 0.25, roseDark, 7);
      rock.position.set((rnd() - 0.5) * 10, 0.12, 1 + rnd() * 3.4);
      g.add(rock);
    }
    return g;
  },

  neuschwanstein() {
    const g = new THREE.Group();
    // alpine peaks behind
    for (const [x, z, r, h] of [[-3.6, -5.4, 2.4, 4.6], [3.4, -6.0, 3.0, 5.6]] as [number, number, number, number][]) {
      const peak = cone(r, h, m("#7d8aa0"), 8);
      peak.position.set(x, h / 2, z);
      g.add(peak);
      const cap = cone(r * 0.36, h * 0.24, m("#f6f8fb", { rough: 0.4 }), 8);
      cap.position.set(x, h * 0.86, z);
      g.add(cap);
    }
    // the castle hill
    const hill = cyl(2.6, 3.6, 1.9, m("#5e7d4a"), 12);
    hill.position.y = 0.95;
    g.add(hill);
    const white = m("#f3f2ec", { rough: 0.55, flat: false });
    const blue = m("#3b5b8c", { rough: 0.6 });
    // main hall
    const hall = box(2.5, 1.9, 1.2, white);
    hall.position.set(0, 2.85, -0.2);
    g.add(hall);
    const hallRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.6, 3), blue);
    hallRoof.rotation.z = Math.PI / 2;
    hallRoof.position.set(0, 4.1, -0.2);
    g.add(hallRoof);
    // towers with steep blue cone roofs
    const tower = (x: number, z: number, h: number, r: number) => {
      const t = cyl(r, r * 1.08, h, white, 10);
      t.position.set(x, 1.9 + h / 2, z);
      g.add(t);
      const roof = cone(r * 1.35, h * 0.62, blue, 10);
      roof.position.set(x, 1.9 + h + h * 0.3, z);
      g.add(roof);
      // little windows
      for (let wy = 0; wy < 2; wy++) {
        const win = box(0.09, 0.16, 0.02, m("#2b3a52"));
        win.position.set(x, 2.5 + wy * 0.7, z + r + 0.01);
        g.add(win);
      }
    };
    tower(-1.35, 0.35, 2.5, 0.34);
    tower(1.35, 0.35, 2.5, 0.34);
    tower(-0.75, -0.9, 3.3, 0.28);
    tower(0.75, -0.9, 3.3, 0.28);
    tower(0, 0.75, 1.9, 0.3); // gatehouse turret
    // gatehouse
    const gate = box(1.1, 1.0, 0.7, m("#c9553e", { rough: 0.7 }));
    gate.position.set(0, 2.4, 0.75);
    g.add(gate);
    const gateDoor = box(0.4, 0.55, 0.1, m("#3f2a24"));
    gateDoor.position.set(0, 2.2, 1.12);
    g.add(gateDoor);
    // pine forest on the slopes
    const rnd = rngFor(214);
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = 3.6 + rnd() * 1.6;
      const s = 0.7 + rnd() * 0.5;
      const tr = new THREE.Group();
      for (let l = 0; l < 3; l++) {
        const layer = cone(0.5 * s - l * 0.12 * s, 0.55 * s, m("#2d5a44"), 7);
        layer.position.y = 0.45 * s + l * 0.38 * s;
        tr.add(layer);
      }
      tr.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr * 0.7 + 0.8);
      g.add(tr);
    }
    // the swan lake
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1.5, 18), m("#4a9fd8", { rough: 0.15, metal: 0.2 }));
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(3.4, 0.04, 2.6);
    g.add(lake);
    const swan = dove("#fdfdfb");
    swan.scale.multiplyScalar(1.4);
    swan.position.set(3.3, 0.06, 2.5);
    swan.name = "boat"; // reuse the gentle bobbing animation
    g.add(swan);
    return g;
  },

  burj() {
    const g = new THREE.Group();
    const glass = m("#9fb6ce", { rough: 0.22, metal: 0.6, flat: false });
    // tiered spire — each tier a slimmer cylinder
    const tiers: [number, number][] = [
      [1.05, 1.6], [0.88, 1.5], [0.72, 1.4], [0.56, 1.3], [0.42, 1.2], [0.3, 1.0], [0.19, 0.9],
    ];
    let y = 0;
    for (const [r, h] of tiers) {
      const tier = cyl(r * 0.92, r, h, glass, 12);
      tier.position.y = y + h / 2;
      g.add(tier);
      y += h;
    }
    const needle = cyl(0.025, 0.07, 1.5, m("#dfe8f2", { metal: 0.7, rough: 0.3 }), 6);
    needle.position.y = y + 0.75;
    g.add(needle);
    const beacon = sph(0.09, m("#fde68a", { emissive: "#fbbf24", emissiveIntensity: 1.6 }), 6);
    beacon.position.y = y + 1.55;
    beacon.name = "beacon";
    g.add(beacon);
    // lit window bands
    for (let i = 0; i < 12; i++) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.95 - i * 0.065, 0.015, 5, 24),
        m("#ffd9a0", { emissive: "#ffb347", emissiveIntensity: 0.8 })
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.6 + i * 0.72;
      g.add(band);
    }
    // the dancing fountain pool
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), m("#3a7cb8", { rough: 0.15, metal: 0.2 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.03, 3.6);
    g.add(pool);
    for (let i = 0; i < 5; i++) {
      const jet = cyl(0.035, 0.05, 0.9 + (i % 3) * 0.35, m("#cfe8fa", { opacity: 0.75, flat: false }), 6);
      jet.position.set(-1.4 + i * 0.7, 0.5 + (i % 3) * 0.18, 3.6);
      g.add(jet);
    }
    // downtown skyline
    const rnd = rngFor(555);
    for (let i = 0; i < 9; i++) {
      const h = 0.7 + rnd() * 1.4;
      const bld = box(0.5 + rnd() * 0.3, h, 0.5, m(i % 2 ? "#8fa3ba" : "#a8bccf", { rough: 0.4, metal: 0.3 }));
      const a = rnd() * Math.PI * 2;
      const rr = 3.4 + rnd() * 1.8;
      bld.position.set(Math.cos(a) * rr, h / 2, Math.sin(a) * rr * 0.8 - 1.2);
      g.add(bld);
    }
    // palms along the plaza
    for (const [x, z] of [[-2.9, 2.6], [2.9, 2.6], [-3.6, 0.6], [3.6, 0.6]]) {
      const p = palmTree(1.5);
      p.position.set(x, 0, z);
      g.add(p);
    }
    return g;
  },

  niagara() {
    const g = new THREE.Group();
    // the river above the falls
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.6, 0.35, 26, 1, false, Math.PI * 0.15, Math.PI * 0.7),
      m("#3a86c8", { rough: 0.2, metal: 0.15, side: THREE.DoubleSide })
    );
    upper.position.set(0, 2.4, -4.2);
    g.add(upper);
    // horseshoe cliff
    const cliff = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.6, 2.6, 26, 1, true, Math.PI * 0.15, Math.PI * 0.7),
      m("#6b6455", { rough: 0.95, side: THREE.DoubleSide })
    );
    cliff.position.set(0, 1.3, -4.2);
    g.add(cliff);
    // the falling water curtain — bright blue with white streaks
    const curtain = new THREE.Mesh(
      new THREE.CylinderGeometry(4.55, 4.72, 2.55, 26, 1, true, Math.PI * 0.18, Math.PI * 0.64),
      m("#7cc4ec", { rough: 0.25, opacity: 0.92, side: THREE.DoubleSide, flat: false })
    );
    curtain.position.set(0, 1.3, -4.2);
    g.add(curtain);
    const rnd = rngFor(303);
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (0.22 + rnd() * 0.56);
      const streak = box(0.09, 2.3, 0.03, m("#eaf6fd", { opacity: 0.85, flat: false }));
      streak.position.set(Math.sin(a) * 4.66, 1.35, -4.2 + Math.cos(a) * 4.66);
      streak.rotation.y = -a;
      g.add(streak);
    }
    // the plunge pool + rising mist (named → drifts)
    const poolN = new THREE.Mesh(new THREE.CircleGeometry(5.2, 28), m("#2e6ea6", { rough: 0.2, metal: 0.15 }));
    poolN.rotation.x = -Math.PI / 2;
    poolN.position.set(0, 0.02, 0.6);
    g.add(poolN);
    for (const [x, y2, z, s] of [[-1.6, 1.1, -2.6, 1.2], [1.4, 1.7, -3.0, 1.0], [0, 0.7, -2.0, 1.5]] as [number, number, number, number][]) {
      const mist = ell(s, s * 0.4, s * 0.6, m("#ffffff", { opacity: 0.5, flat: false }));
      mist.position.set(x, y2, z);
      mist.name = `mist${x > 0 ? 1 : 0}`;
      g.add(mist);
    }
    // rainbow over the gorge — three nested arcs
    const rainbowCols = ["#ef4444", "#facc15", "#22c55e"];
    rainbowCols.forEach((c, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(2.5 - i * 0.14, 0.06, 6, 24, Math.PI),
        m(c, { opacity: 0.65, flat: false })
      );
      arc.position.set(0.4, 0.6, -1.2);
      arc.rotation.y = 0.25;
      g.add(arc);
    });
    // the little mist boat (named → bobs)
    const boat = new THREE.Group();
    const hull = box(0.95, 0.2, 0.4, m("#dc2626"));
    hull.position.y = 0.14;
    boat.add(hull);
    const deck = box(0.6, 0.22, 0.3, m("#f4f6fb"));
    deck.position.y = 0.35;
    boat.add(deck);
    const funnel = cyl(0.05, 0.06, 0.2, m("#334155"), 6);
    funnel.position.set(-0.1, 0.55, 0);
    boat.add(funnel);
    boat.position.set(1.8, 0.02, 1.6);
    boat.rotation.y = 2.4;
    boat.name = "boat";
    g.add(boat);
    // forested banks
    for (const [x, z, s] of [[-4.2, 1.6, 1.0], [-3.4, 2.8, 0.8], [4.3, 1.8, 0.95], [3.5, 3.0, 0.75]] as [number, number, number][]) {
      const t = roundTree("#3f7d46", 0.9 * s, 0.5 * s);
      t.position.set(x, 0, z);
      g.add(t);
    }
    return g;
  },
};

export type LandmarkSiteId = keyof typeof sites;
export const SITE_IDS = Object.keys(sites);

export function buildLandmarkSite(id: string): THREE.Group {
  const builder = sites[id];
  return builder ? builder() : new THREE.Group();
}
