// The space-station engine: one room per scene — an open, round module
// platform floating in orbit. Earth turns below, stars and nebulae all
// around, zero-g props drift, and every piece of equipment is tappable
// with its own tap-reaction (levers pull, probes launch, holograms spin).
// Occasionally a comet streaks by, a meteor shower sparkles or a cargo
// ship sails past — the station always feels alive.

import * as THREE from "three";
import type { StationRoomSpec, StationObjectSpec } from "../data/spaceStation";
import { stationObjectsFor } from "../data/spaceStation";
import {
  makeStarField,
  makeGlowTexture,
  makeTextSprite,
  makeCloudTexture,
  addNebulae,
  mulberry32,
} from "./proceduralTextures";

export interface StationPick {
  id: string;
  screenX: number;
  screenY: number;
}

export interface SpaceStationOptions {
  room: StationRoomSpec;
  discovered: Set<string>;
  reducedMotion: boolean;
  onPick: (pick: StationPick | null) => void;
  /** fired when a rare outside event starts (for a small toast) */
  onEvent?: (kind: "comet" | "meteors" | "ship") => void;
}

interface StationNode {
  spec: StationObjectSpec;
  group: THREE.Group;
  rig: Record<string, THREE.Object3D>;
  label: THREE.Sprite;
  mystery: THREE.Sprite;
  labelY: number;
  /** seconds remaining of the tap-reaction animation */
  react: number;
  phase: number;
}

interface Floater {
  mesh: THREE.Object3D;
  base: THREE.Vector3;
  amp: THREE.Vector3;
  freq: THREE.Vector3;
  phase: number;
  spin: number;
}

function mat(color: string | number, opts?: { rough?: number; metal?: number; emissive?: string; emissiveI?: number }) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts?.rough ?? 0.7,
    metalness: opts?.metal ?? 0.15,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts?.emissive ? (opts?.emissiveI ?? 0.8) : 0,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function cyl(rt: number, rb: number, h: number, material: THREE.Material, seg = 12): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
}

function sphere(r: number, material: THREE.Material, seg = 12): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
}

/** A small animated screen texture: dark panel with colorful "data" bars. */
function makeScreenTexture(seed: number, hue: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#071224";
    ctx.fillRect(0, 0, 128, 96);
    const rng = mulberry32(seed);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 3 === 0 ? hue : i % 3 === 1 ? "#2dd4bf" : "#f8fafc";
      ctx.globalAlpha = 0.5 + rng() * 0.5;
      ctx.fillRect(8, 8 + i * 9, 12 + rng() * 100, 5);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CAM_MIN = 9;
const CAM_MAX = 26;

export class SpaceStationScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private stage = new THREE.Group();
  private nodes: StationNode[] = [];
  private nodeById = new Map<string, StationNode>();
  private floaters: Floater[] = [];
  private earth: THREE.Group | null = null;
  private earthClouds: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;

  // outside events
  private comet: THREE.Group | null = null;
  private cometT = -1;
  private meteors: { sprite: THREE.Sprite; vel: THREE.Vector3 }[] = [];
  private meteorT = -1;
  private ship: THREE.Group | null = null;
  private shipT = -1;
  private nextEventIn = 9;

  private onPick: (pick: StationPick | null) => void;
  private onEvent?: (kind: "comet" | "meteors" | "ship") => void;
  private reducedMotion: boolean;
  private discovered: Set<string>;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartCam = 0;
  private moved = 0;
  private downTime = 0;
  private userYaw = 0;
  private autoYaw = 0;
  private camDist = 18;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: SpaceStationOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.onEvent = opts.onEvent;
    this.reducedMotion = opts.reducedMotion;
    this.discovered = new Set(opts.discovered);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#03040c");

    this.camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      2400
    );

    // lights: cool space ambient + warm interior key + room-accent glow
    this.scene.add(new THREE.AmbientLight(0xcfdcff, 1.05));
    const key = new THREE.DirectionalLight(0xfff2df, 1.5);
    key.position.set(6, 12, 7);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7c9bff, 0.6);
    rim.position.set(-8, 3, -6);
    this.scene.add(rim);
    const accent = new THREE.PointLight(new THREE.Color(opts.room.color), 26, 30, 2);
    accent.position.set(0, 5.5, 0);
    this.scene.add(accent);

    this.buildSpaceOutside();
    this.buildModule(opts.room);
    this.buildObjects(opts.room);
    this.buildFloaters(opts.room);
    this.scene.add(this.stage);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerCancel);
    el.addEventListener("wheel", this.onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  // ─── Outside: Earth, stars, nebulae ─────────────────────────────────────────

  private buildSpaceOutside() {
    this.stars = makeStarField(1600, 300, 900, 11);
    this.scene.add(this.stars);
    addNebulae(this.scene, 4, 5, 1000);

    // Earth below the station — big, slowly turning, with clouds + atmosphere glow
    const earth = new THREE.Group();
    const surf = new THREE.Mesh(
      new THREE.SphereGeometry(60, 48, 48),
      new THREE.MeshStandardMaterial({ color: "#1e6fb8", roughness: 0.9 })
    );
    // paint simple continents so it reads as Earth from any angle
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "#9fd4ee");
      g.addColorStop(0.5, "#1d6db5");
      g.addColorStop(1, "#9fd4ee");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 256);
      const rng = mulberry32(23);
      ctx.fillStyle = "#3f9f60";
      for (let i = 0; i < 26; i++) {
        const x = rng() * 512;
        const y = 40 + rng() * 176;
        ctx.beginPath();
        ctx.ellipse(x, y, 16 + rng() * 46, 10 + rng() * 26, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(0, 0, 512, 14);
      ctx.fillRect(0, 242, 512, 14);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      (surf.material as THREE.MeshStandardMaterial).map = tex;
      (surf.material as THREE.MeshStandardMaterial).color = new THREE.Color("#ffffff");
    }
    earth.add(surf);
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(60.8, 48, 48),
      new THREE.MeshStandardMaterial({
        map: makeCloudTexture(19),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    earth.add(clouds);
    this.earthClouds = clouds;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(120,190,255,0.55)", "rgba(120,190,255,0)", 256),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.scale.set(180, 180, 1);
    earth.add(glow);
    earth.position.set(24, -84, -40);
    this.scene.add(earth);
    this.earth = earth;

    // a slow distant satellite drifting in the black
    const sat = new THREE.Group();
    const body = box(1.2, 1.2, 2, mat("#cfd8e6", { metal: 0.6, rough: 0.35 }));
    sat.add(body);
    for (const s of [-1, 1]) {
      const panel = box(4, 0.08, 1.4, mat("#1d3d8f", { metal: 0.4, rough: 0.4, emissive: "#2b57c9", emissiveI: 0.35 }));
      panel.position.x = s * 3;
      sat.add(panel);
    }
    sat.position.set(-70, 26, -120);
    sat.userData.isSatellite = true;
    this.scene.add(sat);
  }

  // ─── The module platform ────────────────────────────────────────────────────

  private buildModule(room: StationRoomSpec) {
    // metal floor disc with painted panel lines
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    let floorMat: THREE.MeshStandardMaterial;
    if (ctx) {
      ctx.fillStyle = "#5c6a85";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "#48546c";
      ctx.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(256, i * 32); ctx.stroke();
      }
      const rng = mulberry32(7);
      ctx.fillStyle = "#707f9c";
      for (let i = 0; i < 40; i++) ctx.fillRect(rng() * 250, rng() * 250, 4, 4);
      const vg = ctx.createRadialGradient(128, 128, 80, 128, 128, 130);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.3)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 });
    } else {
      floorMat = new THREE.MeshStandardMaterial({ color: "#5c6a85", roughness: 0.6, metalness: 0.3 });
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.stage.add(floor);

    // rim wall: low panels with a glowing accent stripe (open above → space view)
    const rimMat = mat("#6b7891", { metal: 0.4, rough: 0.5 });
    const stripeMat = mat(room.color, { emissive: room.color, emissiveI: 1.2, metal: 0.1, rough: 0.4 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      // leave two gaps as "doorways" so the module feels connected to the station
      if (i === 2 || i === 8) continue;
      const panel = box(4.6, 1.5, 0.3, rimMat);
      panel.position.set(Math.cos(a) * 9.2, 0.75, Math.sin(a) * 9.2);
      panel.rotation.y = -a + Math.PI / 2;
      this.stage.add(panel);
      const stripe = box(4.6, 0.12, 0.32, stripeMat);
      stripe.position.set(Math.cos(a) * 9.2, 1.32, Math.sin(a) * 9.2);
      stripe.rotation.y = -a + Math.PI / 2;
      stripe.name = `stripe${i}`;
      this.stage.add(stripe);
    }

    // underside hull so the platform reads like a real module from below
    const hull = cyl(9.5, 7.6, 1.6, mat("#4d5a72", { metal: 0.5, rough: 0.5 }), 48);
    hull.position.y = -0.82;
    this.stage.add(hull);

    // 4 ceiling light-posts around the rim
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const post = cyl(0.09, 0.12, 3.4, mat("#5d6b84", { metal: 0.5 }), 8);
      post.position.set(Math.cos(a) * 8.3, 1.7, Math.sin(a) * 8.3);
      this.stage.add(post);
      const lamp = sphere(0.24, mat("#fff7d8", { emissive: "#ffe9a8", emissiveI: 1.6 }), 10);
      lamp.position.set(Math.cos(a) * 8.3, 3.5, Math.sin(a) * 8.3);
      lamp.name = `lamp${i}`;
      this.stage.add(lamp);
    }

    // big solar wings on the two doorway sides — the station's signature look
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      const boom = cyl(0.12, 0.12, 7, mat("#8d99ad", { metal: 0.55 }), 8);
      boom.rotation.z = Math.PI / 2;
      boom.position.x = s * 3.5;
      wing.add(boom);
      for (let i = 0; i < 3; i++) {
        const panel = box(2.1, 0.06, 3.4, mat("#1d3d8f", { metal: 0.4, rough: 0.35, emissive: "#2b57c9", emissiveI: 0.4 }));
        panel.position.x = s * (1.6 + i * 2.4);
        wing.add(panel);
      }
      wing.position.set(s * 9.6, 2.6, 0);
      wing.name = `wing${s > 0 ? "R" : "L"}`;
      this.stage.add(wing);
    }
  }

  // ─── Equipment builders ─────────────────────────────────────────────────────

  private buildObjectMesh(spec: StationObjectSpec, accent: string): THREE.Group {
    const g = new THREE.Group();
    const metal = mat("#66738a", { metal: 0.55, rough: 0.4 });
    const dark = mat("#37414f", { metal: 0.4, rough: 0.5 });
    const screenMat = (seed: number) =>
      new THREE.MeshStandardMaterial({
        map: makeScreenTexture(seed, accent),
        emissive: new THREE.Color("#8fd8ff"),
        emissiveIntensity: 0.35,
        roughness: 0.4,
      });

    switch (spec.kind) {
      case "console": {
        const body = box(2.4, 1.0, 0.9, metal);
        body.position.y = 0.5;
        g.add(body);
        const face = box(2.2, 0.9, 0.1, dark);
        face.position.set(0, 1.35, 0.28);
        face.rotation.x = -0.35;
        g.add(face);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.68), screenMat(3));
        screen.position.set(0, 1.37, 0.35);
        screen.rotation.x = -0.35;
        screen.name = "screen";
        g.add(screen);
        for (let i = 0; i < 5; i++) {
          const btn = cyl(0.07, 0.07, 0.08, mat(["#f87171", "#4ade80", "#facc15", "#60a5fa", "#f472b6"][i], { emissive: ["#f87171", "#4ade80", "#facc15", "#60a5fa", "#f472b6"][i], emissiveI: 0.9 }), 8);
          btn.position.set(-0.8 + i * 0.4, 1.03, 0.32);
          btn.name = `btn${i}`;
          g.add(btn);
        }
        break;
      }
      case "joystick": {
        const base = cyl(0.55, 0.7, 0.5, metal, 10);
        base.position.y = 0.25;
        g.add(base);
        const stickPivot = new THREE.Group();
        stickPivot.position.y = 0.5;
        const stick = cyl(0.09, 0.11, 1.0, dark, 8);
        stick.position.y = 0.5;
        stickPivot.add(stick);
        const knob = sphere(0.24, mat("#ef4444", { emissive: "#b91c1c", emissiveI: 0.35, rough: 0.35 }), 12);
        knob.position.y = 1.05;
        stickPivot.add(knob);
        stickPivot.name = "stick";
        g.add(stickPivot);
        break;
      }
      case "radar": {
        const body = box(1.5, 1.7, 0.5, metal);
        body.position.y = 0.85;
        g.add(body);
        const screen = new THREE.Mesh(
          new THREE.CircleGeometry(0.55, 24),
          mat("#06281e", { emissive: "#0f9d63", emissiveI: 0.5 })
        );
        screen.position.set(0, 1.15, 0.26);
        g.add(screen);
        const sweep = new THREE.Mesh(
          new THREE.PlaneGeometry(0.52, 0.06),
          new THREE.MeshBasicMaterial({ color: "#4ade80", transparent: true, opacity: 0.9 })
        );
        sweep.position.set(0, 1.15, 0.28);
        sweep.geometry.translate(0.26, 0, 0);
        sweep.name = "sweep";
        g.add(sweep);
        const dish = new THREE.Group();
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#e2e8f0", { metal: 0.3 }));
        d.rotation.x = Math.PI;
        dish.add(d);
        dish.position.y = 2.05;
        dish.name = "dish";
        g.add(dish);
        break;
      }
      case "radio": {
        const body = box(1.6, 1.1, 0.6, dark);
        body.position.y = 0.95;
        g.add(body);
        const legL = cyl(0.06, 0.08, 0.8, metal, 6);
        legL.position.set(-0.5, 0.4, 0);
        g.add(legL);
        const legR = legL.clone();
        legR.position.x = 0.5;
        g.add(legR);
        const micArm = cyl(0.04, 0.04, 0.7, metal, 6);
        micArm.rotation.z = 0.7;
        micArm.position.set(0.75, 1.75, 0);
        g.add(micArm);
        const mic = sphere(0.16, mat("#f8fafc", { rough: 0.3 }), 10);
        mic.position.set(1.0, 2.0, 0);
        mic.name = "mic";
        g.add(mic);
        for (let i = 0; i < 3; i++) {
          const led = sphere(0.06, mat("#4ade80", { emissive: "#22c55e", emissiveI: 1.4 }), 6);
          led.position.set(-0.45 + i * 0.3, 1.25, 0.32);
          led.name = `led${i}`;
          g.add(led);
        }
        break;
      }
      case "telescope": {
        const tripod = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const leg = cyl(0.05, 0.07, 1.6, metal, 6);
          leg.position.set(Math.cos(a) * 0.4, 0.8, Math.sin(a) * 0.4);
          leg.rotation.z = -Math.cos(a) * 0.35;
          leg.rotation.x = Math.sin(a) * 0.35;
          tripod.add(leg);
        }
        g.add(tripod);
        const tube = cyl(0.3, 0.38, 1.9, mat("#f8fafc", { rough: 0.3, metal: 0.2 }), 14);
        tube.rotation.z = -0.9;
        tube.position.set(0.3, 1.9, 0);
        tube.name = "tube";
        g.add(tube);
        const lens = cyl(0.4, 0.4, 0.1, mat("#7dd3fc", { emissive: "#38bdf8", emissiveI: 0.7 }), 14);
        lens.rotation.z = -0.9;
        lens.position.set(0.98, 2.44, 0);
        g.add(lens);
        break;
      }
      case "bigWindow": {
        const frame = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.14, 10, 32), metal);
        frame.position.y = 1.7;
        g.add(frame);
        const glass = new THREE.Mesh(
          new THREE.CircleGeometry(1.25, 32),
          new THREE.MeshStandardMaterial({
            color: "#0d2b4d",
            transparent: true,
            opacity: 0.4,
            roughness: 0.1,
            metalness: 0.4,
            side: THREE.DoubleSide,
          })
        );
        glass.position.y = 1.7;
        g.add(glass);
        const reflection = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(140,200,255,0.5)", "rgba(140,200,255,0)", 128),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }));
        reflection.position.set(0.35, 2.05, 0.05);
        reflection.scale.set(0.9, 0.9, 1);
        g.add(reflection);
        break;
      }
      case "starMap": {
        const body = box(1.7, 2.0, 0.24, dark);
        body.position.y = 1.2;
        g.add(body);
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#0a1330";
          ctx.fillRect(0, 0, 128, 160);
          const rng = mulberry32(41);
          for (let i = 0; i < 70; i++) {
            ctx.fillStyle = i % 6 === 0 ? "#ffd166" : "#e8f1ff";
            const r = rng() < 0.15 ? 2 : 1;
            ctx.fillRect(rng() * 128, rng() * 160, r, r);
          }
          ctx.strokeStyle = "rgba(120,170,255,0.6)";
          ctx.beginPath();
          ctx.moveTo(20, 30); ctx.lineTo(48, 44); ctx.lineTo(70, 26); ctx.lineTo(98, 52);
          ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const map = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 1.8),
          new THREE.MeshStandardMaterial({ map: tex, emissive: "#5577cc", emissiveIntensity: 0.35 })
        );
        map.position.set(0, 1.2, 0.14);
        map.name = "screen";
        g.add(map);
        break;
      }
      case "camera": {
        const arm = cyl(0.07, 0.1, 1.6, metal, 8);
        arm.position.y = 0.8;
        g.add(arm);
        const head = new THREE.Group();
        const body = box(0.7, 0.5, 0.5, mat("#f8fafc", { rough: 0.35 }));
        head.add(body);
        const lens = cyl(0.18, 0.22, 0.3, dark, 12);
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.4;
        head.add(lens);
        const glassLens = cyl(0.14, 0.14, 0.04, mat("#93c5fd", { emissive: "#3b82f6", emissiveI: 0.8 }), 12);
        glassLens.rotation.x = Math.PI / 2;
        glassLens.position.z = 0.56;
        head.add(glassLens);
        head.position.y = 1.75;
        head.name = "head";
        g.add(head);
        break;
      }
      case "microscope": {
        const table = cyl(0.85, 0.95, 0.12, metal, 12);
        table.position.y = 0.9;
        g.add(table);
        const legTube = cyl(0.12, 0.16, 0.9, dark, 8);
        legTube.position.y = 0.45;
        g.add(legTube);
        const armC = cyl(0.08, 0.08, 0.9, mat("#e2e8f0", { rough: 0.3 }), 8);
        armC.rotation.z = 0.5;
        armC.position.set(-0.2, 1.4, 0);
        g.add(armC);
        const eyepiece = cyl(0.09, 0.12, 0.55, mat("#e2e8f0", { rough: 0.3 }), 8);
        eyepiece.rotation.z = -0.35;
        eyepiece.position.set(0.05, 1.8, 0);
        eyepiece.name = "tube";
        g.add(eyepiece);
        const dishS = cyl(0.2, 0.2, 0.04, mat("#a7f3d0", { emissive: "#34d399", emissiveI: 0.5 }), 10);
        dishS.position.set(0.18, 0.99, 0);
        g.add(dishS);
        break;
      }
      case "meteorite": {
        const base = cyl(0.7, 0.85, 0.5, metal, 10);
        base.position.y = 0.25;
        g.add(base);
        const glassCase = cyl(0.6, 0.6, 1.3, new THREE.MeshStandardMaterial({
          color: "#bfe3ff", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.3,
        }), 12);
        glassCase.position.y = 1.15;
        g.add(glassCase);
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.32, 0),
          mat("#4b4034", { rough: 0.95, emissive: "#7a4a20", emissiveI: 0.15 })
        );
        rock.position.y = 1.1;
        rock.name = "rock";
        g.add(rock);
        break;
      }
      case "scanner": {
        const body = box(1.5, 0.6, 1.0, metal);
        body.position.y = 0.3;
        g.add(body);
        const ringO = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 24), mat(accent, { emissive: accent, emissiveI: 1.0 }));
        ringO.position.y = 1.4;
        ringO.name = "ring";
        g.add(ringO);
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.0, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        beam.position.y = 0.95;
        beam.name = "beam";
        g.add(beam);
        break;
      }
      case "hologram": {
        const table = cyl(0.95, 1.1, 0.5, dark, 14);
        table.position.y = 0.25;
        g.add(table);
        const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 28), mat(accent, { emissive: accent, emissiveI: 1.3 }));
        ringT.rotation.x = Math.PI / 2;
        ringT.position.y = 0.53;
        g.add(ringT);
        const holo = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 18, 14),
          new THREE.MeshStandardMaterial({
            color: accent, wireframe: true, transparent: true, opacity: 0.75,
            emissive: new THREE.Color(accent), emissiveIntensity: 0.9,
          })
        );
        holo.position.y = 1.5;
        holo.name = "holo";
        g.add(holo);
        const holoRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.02, 6, 24),
          new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.6 })
        );
        holoRing.position.y = 1.5;
        holoRing.rotation.x = 1.2;
        holoRing.name = "holoRing";
        g.add(holoRing);
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.75, 1.5, 20, 1, true),
          new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        beam.position.y = 1.1;
        beam.rotation.x = Math.PI;
        g.add(beam);
        break;
      }
      case "plantPod": {
        for (let i = 0; i < 3; i++) {
          const pod = cyl(0.3, 0.36, 0.5, mat("#f8fafc", { rough: 0.35 }), 10);
          pod.position.set(-0.75 + i * 0.75, 0.25, 0);
          g.add(pod);
          const soil = cyl(0.26, 0.26, 0.08, mat("#5d4a33"), 10);
          soil.position.set(-0.75 + i * 0.75, 0.52, 0);
          g.add(soil);
          const plant = new THREE.Group();
          for (let j = 0; j < 4; j++) {
            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5 + i * 0.14, 5), mat("#4ade80", { rough: 0.8 }));
            const a = (j / 4) * Math.PI * 2;
            leaf.position.set(Math.cos(a) * 0.1, 0.28, Math.sin(a) * 0.1);
            leaf.rotation.z = -Math.cos(a) * 0.6;
            leaf.rotation.x = Math.sin(a) * 0.6;
            plant.add(leaf);
          }
          plant.position.set(-0.75 + i * 0.75, 0.55, 0);
          plant.name = `plant${i}`;
          g.add(plant);
        }
        break;
      }
      case "waterBubble": {
        const pedestal = cyl(0.4, 0.5, 0.4, mat("#66738a", { metal: 0.5 }), 10);
        pedestal.position.y = 0.2;
        g.add(pedestal);
        const bubble = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 20, 16),
          new THREE.MeshStandardMaterial({
            color: "#7dd3fc", transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.15,
          })
        );
        bubble.position.y = 1.5;
        bubble.name = "bubble";
        g.add(bubble);
        const shine = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(255,255,255,0.9)", "rgba(255,255,255,0)", 64),
          transparent: true, depthWrite: false,
        }));
        shine.position.set(0.18, 1.68, 0.2);
        shine.scale.set(0.3, 0.3, 1);
        g.add(shine);
        break;
      }
      case "tomato": {
        const troughM = box(1.8, 0.4, 0.6, mat("#f8fafc", { rough: 0.35 }));
        troughM.position.y = 0.6;
        g.add(troughM);
        const legs = box(1.6, 0.5, 0.1, metal);
        legs.position.y = 0.2;
        g.add(legs);
        for (let i = 0; i < 3; i++) {
          const stem = cyl(0.03, 0.04, 0.8, mat("#3f9142"), 6);
          stem.position.set(-0.55 + i * 0.55, 1.2, 0);
          g.add(stem);
          const tom = sphere(0.13, mat("#ef4444", { rough: 0.4, emissive: "#b91c1c", emissiveI: 0.2 }), 10);
          tom.position.set(-0.55 + i * 0.55 + 0.12, 1.32, 0.08);
          tom.name = `tomato${i}`;
          g.add(tom);
        }
        break;
      }
      case "sunLamp": {
        const pole = cyl(0.07, 0.1, 2.2, metal, 8);
        pole.position.y = 1.1;
        g.add(pole);
        const headL = box(1.5, 0.16, 0.6, dark);
        headL.position.y = 2.3;
        g.add(headL);
        const tube = box(1.3, 0.08, 0.4, mat("#ff9ad5", { emissive: "#f472b6", emissiveI: 1.8 }));
        tube.position.y = 2.2;
        tube.name = "glowTube";
        g.add(tube);
        const glowSp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(255,150,220,0.55)", "rgba(255,150,220,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        glowSp.position.y = 1.9;
        glowSp.scale.set(2.4, 1.6, 1);
        g.add(glowSp);
        break;
      }
      case "engineCore": {
        const baseC = cyl(1.0, 1.2, 0.5, metal, 14);
        baseC.position.y = 0.25;
        g.add(baseC);
        const core = cyl(0.45, 0.45, 1.8, mat("#ffd166", { emissive: "#fb923c", emissiveI: 1.6, rough: 0.25 }), 14);
        core.position.y = 1.4;
        core.name = "core";
        g.add(core);
        for (let i = 0; i < 3; i++) {
          const ringE = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 24), mat("#8d99ad", { metal: 0.6, rough: 0.35 }));
          ringE.rotation.x = Math.PI / 2;
          ringE.position.y = 0.85 + i * 0.55;
          ringE.name = `coreRing${i}`;
          g.add(ringE);
        }
        const glowE = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(255,170,80,0.6)", "rgba(255,170,80,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        glowE.position.y = 1.4;
        glowE.scale.set(2.8, 3.4, 1);
        glowE.name = "coreGlow";
        g.add(glowE);
        break;
      }
      case "lever": {
        const stand = box(0.9, 1.1, 0.5, metal);
        stand.position.y = 0.55;
        g.add(stand);
        const slot = box(0.14, 0.7, 0.1, mat("#1f2733"));
        slot.position.set(0, 1.0, 0.26);
        g.add(slot);
        const leverPivot = new THREE.Group();
        leverPivot.position.set(0, 0.85, 0.3);
        const armL = cyl(0.05, 0.05, 0.8, mat("#e2e8f0", { metal: 0.5 }), 8);
        armL.position.y = 0.4;
        leverPivot.add(armL);
        const knob = sphere(0.16, mat("#ef4444", { emissive: "#b91c1c", emissiveI: 0.4 }), 10);
        knob.position.y = 0.8;
        leverPivot.add(knob);
        leverPivot.rotation.x = 0.55;
        leverPivot.name = "lever";
        g.add(leverPivot);
        break;
      }
      case "toolbox": {
        const boxM = box(1.0, 0.6, 0.6, mat("#ef4444", { rough: 0.5 }));
        boxM.position.y = 1.4;
        boxM.name = "floatBox";
        g.add(boxM);
        const lid = box(1.0, 0.12, 0.6, mat("#b91c1c", { rough: 0.5 }));
        lid.position.y = 1.76;
        lid.name = "floatLid";
        g.add(lid);
        const tether = cyl(0.02, 0.02, 1.1, mat("#cbd5e1"), 6);
        tether.position.y = 0.55;
        g.add(tether);
        const wrench = box(0.5, 0.08, 0.12, mat("#94a3b8", { metal: 0.7, rough: 0.3 }));
        wrench.position.set(0.5, 2.1, 0.2);
        wrench.name = "floatTool";
        g.add(wrench);
        break;
      }
      case "coolant": {
        for (let i = 0; i < 3; i++) {
          const pipe = new THREE.Mesh(
            new THREE.TorusGeometry(0.9 + i * 0.28, 0.08, 8, 24, Math.PI),
            mat(i === 1 ? "#7dd3fc" : "#66738a", i === 1 ? { emissive: "#38bdf8", emissiveI: 0.9, metal: 0.3 } : { metal: 0.55 })
          );
          pipe.position.y = 0.1;
          pipe.name = i === 1 ? "glowPipe" : `pipe${i}`;
          g.add(pipe);
        }
        const tank = cyl(0.4, 0.4, 1.3, mat("#93c5fd", { metal: 0.4, rough: 0.3, emissive: "#3b82f6", emissiveI: 0.25 }), 12);
        tank.position.set(1.3, 0.65, 0);
        g.add(tank);
        break;
      }
      case "crates": {
        const colors = ["#f59e0b", "#94a3b8", "#facc15"];
        const positions: [number, number, number][] = [[-0.5, 0.4, 0], [0.55, 0.4, 0.15], [0, 1.2, 0.05]];
        positions.forEach((p, i) => {
          const crate = box(0.85, 0.8, 0.85, mat(colors[i], { rough: 0.6 }));
          crate.position.set(...p);
          crate.rotation.y = i * 0.4;
          crate.name = `crate${i}`;
          g.add(crate);
          const strap = box(0.9, 0.1, 0.9, dark);
          strap.position.set(p[0], p[1], p[2]);
          strap.rotation.y = i * 0.4;
          g.add(strap);
        });
        break;
      }
      case "roboticArm": {
        const baseR = cyl(0.5, 0.65, 0.4, metal, 12);
        baseR.position.y = 0.2;
        g.add(baseR);
        const shoulder = new THREE.Group();
        shoulder.position.y = 0.4;
        const seg1 = box(0.22, 1.4, 0.22, mat("#f8fafc", { rough: 0.35 }));
        seg1.position.y = 0.7;
        shoulder.add(seg1);
        const elbow = new THREE.Group();
        elbow.position.y = 1.4;
        const seg2 = box(0.18, 1.1, 0.18, mat("#e2e8f0", { rough: 0.35 }));
        seg2.position.y = 0.55;
        elbow.add(seg2);
        const claw = new THREE.Group();
        claw.position.y = 1.1;
        for (const s of [-1, 1]) {
          const finger = box(0.07, 0.4, 0.1, mat("#facc15", { rough: 0.4 }));
          finger.position.set(s * 0.12, 0.2, 0);
          finger.rotation.z = -s * 0.3;
          claw.add(finger);
        }
        claw.name = "claw";
        elbow.add(claw);
        elbow.name = "elbow";
        elbow.rotation.z = 0.8;
        shoulder.add(elbow);
        shoulder.name = "shoulder";
        shoulder.rotation.z = -0.4;
        g.add(shoulder);
        break;
      }
      case "probe": {
        const rail = box(0.3, 0.15, 2.2, metal);
        rail.position.y = 0.5;
        rail.rotation.x = -0.5;
        g.add(rail);
        const strut = box(0.2, 0.5, 0.2, dark);
        strut.position.set(0, 0.25, 0.7);
        g.add(strut);
        const probe = new THREE.Group();
        const bodyP = cyl(0.16, 0.22, 0.7, mat("#f8fafc", { rough: 0.3 }), 10);
        bodyP.rotation.x = Math.PI / 2;
        probe.add(bodyP);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), mat("#ef4444", { rough: 0.4 }));
        nose.rotation.x = -Math.PI / 2;
        nose.position.z = -0.55;
        probe.add(nose);
        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.5, 8),
          new THREE.MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        flame.rotation.x = Math.PI / 2;
        flame.position.z = 0.6;
        flame.name = "probeFlame";
        probe.add(flame);
        probe.position.set(0, 0.9, -0.3);
        probe.rotation.x = -0.5;
        probe.name = "probeBody";
        g.add(probe);
        break;
      }
      case "spacesuit": {
        const suitMat = mat("#f8fafc", { rough: 0.45 });
        const torso = box(0.8, 0.9, 0.5, suitMat);
        torso.position.y = 1.35;
        g.add(torso);
        const helmet = sphere(0.34, mat("#e2e8f0", { rough: 0.3 }), 14);
        helmet.position.y = 2.1;
        g.add(helmet);
        const visor = sphere(0.27, mat("#f9a825", { metal: 0.7, rough: 0.15, emissive: "#c07a00", emissiveI: 0.4 }), 12);
        visor.position.set(0, 2.1, 0.12);
        visor.scale.z = 0.72;
        g.add(visor);
        for (const s of [-1, 1]) {
          const armS = cyl(0.14, 0.16, 0.8, suitMat, 8);
          armS.position.set(s * 0.55, 1.35, 0);
          armS.rotation.z = s * 0.35;
          g.add(armS);
          const legS = cyl(0.16, 0.18, 0.85, suitMat, 8);
          legS.position.set(s * 0.22, 0.5, 0);
          g.add(legS);
        }
        const pack = box(0.6, 0.7, 0.25, mat("#94a3b8", { metal: 0.4 }));
        pack.position.set(0, 1.4, -0.36);
        g.add(pack);
        break;
      }
      case "sleepPod": {
        const wallPanel = box(1.3, 2.4, 0.2, mat("#525f75", { metal: 0.4 }));
        wallPanel.position.y = 1.2;
        g.add(wallPanel);
        const bag = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.4, 1.2, 4, 10),
          mat("#38bdf8", { rough: 0.7 })
        );
        bag.position.set(0, 1.15, 0.3);
        bag.name = "bag";
        g.add(bag);
        const pillowFace = sphere(0.24, mat("#ffe0bd", { rough: 0.6 }), 12);
        pillowFace.position.set(0, 2.0, 0.32);
        g.add(pillowFace);
        // closed eyes: two little dark lines
        for (const s of [-1, 1]) {
          const eye = box(0.08, 0.02, 0.02, mat("#33261a"));
          eye.position.set(s * 0.09, 2.02, 0.55);
          g.add(eye);
        }
        const zzz = makeTextSprite("💤", { fontSize: 44, stroke: "rgba(0,0,0,0)" });
        zzz.position.set(0.5, 2.5, 0.4);
        zzz.scale.multiplyScalar(0.7);
        zzz.name = "zzz";
        g.add(zzz);
        break;
      }
      case "treadmill": {
        const deck = box(1.7, 0.22, 0.75, dark);
        deck.position.y = 0.25;
        g.add(deck);
        const belt = box(1.5, 0.06, 0.62, mat("#1f2733", { rough: 0.9 }));
        belt.position.y = 0.39;
        belt.name = "belt";
        g.add(belt);
        const rail1 = cyl(0.05, 0.05, 1.1, metal, 8);
        rail1.position.set(-0.7, 0.8, 0.3);
        rail1.rotation.x = 0.15;
        g.add(rail1);
        const rail2 = rail1.clone();
        rail2.position.z = -0.3;
        rail2.rotation.x = -0.15;
        g.add(rail2);
        const bar = cyl(0.045, 0.045, 0.72, metal, 8);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(-0.7, 1.34, 0);
        g.add(bar);
        const harness = box(0.5, 0.08, 0.5, mat("#f59e0b", { rough: 0.6 }));
        harness.position.y = 0.9;
        harness.name = "harness";
        g.add(harness);
        break;
      }
      case "foodPack": {
        const shelf = box(1.6, 0.1, 0.6, metal);
        shelf.position.y = 1.0;
        g.add(shelf);
        const shelfLegL = cyl(0.05, 0.05, 1.0, dark, 6);
        shelfLegL.position.set(-0.7, 0.5, 0);
        g.add(shelfLegL);
        const shelfLegR = shelfLegL.clone();
        shelfLegR.position.x = 0.7;
        g.add(shelfLegR);
        const packColors = ["#f59e0b", "#4ade80", "#f472b6", "#60a5fa"];
        for (let i = 0; i < 4; i++) {
          const pack = box(0.3, 0.42, 0.1, mat(packColors[i], { rough: 0.55 }));
          pack.position.set(-0.58 + i * 0.38, 1.27, 0);
          pack.rotation.z = (i % 2 ? -1 : 1) * 0.08;
          pack.name = `pack${i}`;
          g.add(pack);
        }
        const floatingPack = box(0.28, 0.4, 0.1, mat("#ef4444", { rough: 0.55 }));
        floatingPack.position.set(0.4, 2.0, 0.3);
        floatingPack.name = "floatPack";
        g.add(floatingPack);
        break;
      }
      case "guitar": {
        const stand = cyl(0.05, 0.07, 1.1, dark, 8);
        stand.position.y = 0.55;
        stand.rotation.z = 0.18;
        g.add(stand);
        const bodyG = new THREE.Group();
        const lower = cyl(0.52, 0.52, 0.16, mat("#c2662d", { rough: 0.5 }), 18);
        lower.rotation.x = Math.PI / 2;
        bodyG.add(lower);
        const upper = cyl(0.38, 0.38, 0.16, mat("#c2662d", { rough: 0.5 }), 18);
        upper.rotation.x = Math.PI / 2;
        upper.position.y = 0.62;
        bodyG.add(upper);
        const hole = cyl(0.14, 0.14, 0.18, mat("#3b2412"), 12);
        hole.rotation.x = Math.PI / 2;
        hole.position.y = 0.3;
        bodyG.add(hole);
        const neck = box(0.12, 1.3, 0.08, mat("#7a4a24", { rough: 0.55 }));
        neck.position.y = 1.4;
        bodyG.add(neck);
        const headG = box(0.2, 0.3, 0.09, mat("#3b2412"));
        headG.position.y = 2.1;
        bodyG.add(headG);
        bodyG.position.set(0.15, 0.55, 0.15);
        bodyG.rotation.z = -0.14;
        bodyG.name = "guitarBody";
        g.add(bodyG);
        const note = makeTextSprite("🎵", { fontSize: 40, stroke: "rgba(0,0,0,0)" });
        note.position.set(0.7, 2.2, 0.2);
        note.scale.multiplyScalar(0.6);
        note.name = "note";
        note.material.opacity = 0;
        g.add(note);
        break;
      }
    }
    return g;
  }

  private buildObjects(room: StationRoomSpec) {
    const list = stationObjectsFor(room.id);
    const rng = mulberry32(room.id.charCodeAt(0) * 17 + room.id.length);
    const R = 5.6;

    list.forEach((spec, i) => {
      const group = this.buildObjectMesh(spec, room.color);
      const a = (i / list.length) * Math.PI * 2 + 0.5 + rng() * 0.3;
      group.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      group.lookAt(0, 0, 0);
      group.traverse((o) => { o.userData.objectId = spec.id; });

      // fat-finger hit sphere
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 1.2;
      hit.userData.objectId = spec.id;
      group.add(hit);

      const bounds = new THREE.Box3().setFromObject(group);
      const labelY = Math.min(4.4, bounds.max.y - group.position.y + 0.75);

      const label = makeTextSprite(spec.nameHebrew, { fontSize: 54 });
      label.scale.multiplyScalar(1.9);
      const mystery = makeTextSprite("❓", { fontSize: 56, color: "#ffe9a8", stroke: "rgba(40,40,90,0.9)" });
      mystery.scale.multiplyScalar(1.05);
      const found = this.discovered.has(spec.id);
      label.visible = found;
      mystery.visible = !found;
      label.position.set(group.position.x, labelY, group.position.z);
      mystery.position.copy(label.position);
      this.stage.add(label, mystery);

      const rig: Record<string, THREE.Object3D> = {};
      group.traverse((o) => { if (o.name) rig[o.name] = o; });

      this.stage.add(group);
      const node: StationNode = { spec, group, rig, label, mystery, labelY, react: 0, phase: rng() * Math.PI * 2 };
      this.nodes.push(node);
      this.nodeById.set(spec.id, node);
    });
  }

  /** Zero-g props drifting across the module: a wrench, an apple, a notebook... */
  private buildFloaters(room: StationRoomSpec) {
    const rng = mulberry32(room.id.length * 31 + 5);
    const props: THREE.Object3D[] = [
      box(0.3, 0.06, 0.1, mat("#94a3b8", { metal: 0.7, rough: 0.3 })), // wrench-ish
      sphere(0.12, mat("#ef4444", { rough: 0.5 }), 10),                 // apple
      box(0.24, 0.32, 0.05, mat("#60a5fa", { rough: 0.6 })),            // notebook
      sphere(0.09, mat("#facc15", { rough: 0.5 }), 8),                  // ball
      box(0.16, 0.16, 0.16, mat("#4ade80", { rough: 0.55 })),           // cube toy
    ];
    for (const p of props) {
      const base = new THREE.Vector3((rng() - 0.5) * 8, 2.2 + rng() * 2.2, (rng() - 0.5) * 8);
      p.position.copy(base);
      this.stage.add(p);
      this.floaters.push({
        mesh: p,
        base,
        amp: new THREE.Vector3(0.5 + rng() * 0.8, 0.3 + rng() * 0.5, 0.5 + rng() * 0.8),
        freq: new THREE.Vector3(0.15 + rng() * 0.2, 0.2 + rng() * 0.25, 0.12 + rng() * 0.2),
        phase: rng() * Math.PI * 2,
        spin: (rng() - 0.5) * 0.8,
      });
    }
  }

  // ─── Outside events ─────────────────────────────────────────────────────────

  private startComet() {
    const g = new THREE.Group();
    const head = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(210,240,255,0.95)", "rgba(210,240,255,0)", 128),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    head.scale.set(9, 9, 1);
    g.add(head);
    for (let i = 1; i <= 6; i++) {
      const seg = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(`rgba(150,210,255,${0.55 - i * 0.08})`, "rgba(150,210,255,0)", 64),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      seg.position.set(i * 4.5, i * 1.3, 0);
      const s = 7 - i * 0.8;
      seg.scale.set(s, s, 1);
      g.add(seg);
    }
    g.position.set(-160, 45, -180);
    this.scene.add(g);
    this.comet = g;
    this.cometT = 0;
    this.onEvent?.("comet");
  }

  private startMeteors() {
    for (let i = 0; i < 8; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(255,240,200,0.9)", "rgba(255,240,200,0)", 64),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.position.set(-60 - Math.random() * 80, 60 + Math.random() * 40, -140 - Math.random() * 60);
      sprite.scale.set(2.6, 2.6, 1);
      this.scene.add(sprite);
      this.meteors.push({
        sprite,
        vel: new THREE.Vector3(26 + Math.random() * 14, -16 - Math.random() * 8, 0),
      });
    }
    this.meteorT = 0;
    this.onEvent?.("meteors");
  }

  private startShip() {
    const g = new THREE.Group();
    const hull = cyl(1.6, 1.6, 6, mat("#dfe6f0", { metal: 0.4, rough: 0.4 }), 12);
    hull.rotation.z = Math.PI / 2;
    g.add(hull);
    const noseS = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 12), mat("#c3ceda", { metal: 0.4 }));
    noseS.rotation.z = -Math.PI / 2;
    noseS.position.x = 4.2;
    g.add(noseS);
    for (const s of [-1, 1]) {
      const panel = box(0.1, 0.9, 5, mat("#1d3d8f", { emissive: "#2b57c9", emissiveI: 0.5 }));
      panel.position.set(-1, s * 2.6, 0);
      g.add(panel);
    }
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(255,170,80,0.9)", "rgba(255,170,80,0)", 64),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    flame.position.x = -4;
    flame.scale.set(4, 4, 1);
    flame.name = "shipFlame";
    g.add(flame);
    g.position.set(-190, 14, -150);
    this.scene.add(g);
    this.ship = g;
    this.shipT = 0;
    this.onEvent?.("ship");
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setDiscovered(discovered: Set<string>) {
    this.discovered = new Set(discovered);
    for (const n of this.nodes) {
      const found = this.discovered.has(n.spec.id);
      n.label.visible = found;
      n.mystery.visible = !found;
    }
  }

  /** Trigger the tap-reaction of an object (bounce + kind-specific move). */
  playReaction(id: string) {
    const n = this.nodeById.get(id);
    if (n) n.react = 1.2;
  }

  zoomIn() { this.camDist = Math.max(CAM_MIN, this.camDist / 1.25); }
  zoomOut() { this.camDist = Math.min(CAM_MAX, this.camDist * 1.25); }

  resize() {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animHandle);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointercancel", this.onPointerCancel);
    el.removeEventListener("wheel", this.onWheel);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else if (m) m.dispose();
    });
    this.renderer.dispose();
    el.remove();
  }

  // ─── Picking & interaction ──────────────────────────────────────────────────

  private pickAt(clientX: number, clientY: number): StationPick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.stage.children, true);
    for (const hit of hits) {
      const id = hit.object.userData.objectId as string | undefined;
      if (id) return { id, screenX: clientX, screenY: clientY };
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.moved = 0;
      this.downTime = performance.now();
    } else if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.pinchStartCam = this.camDist;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId)!;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      const dx = e.clientX - prev.x;
      this.moved += Math.abs(dx) + Math.abs(e.clientY - prev.y);
      this.userYaw += dx * 0.006;
    } else if (this.pointers.size === 2 && this.pinchStartDist > 0) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.camDist = Math.min(CAM_MAX, Math.max(CAM_MIN, this.pinchStartCam * (this.pinchStartDist / Math.max(1, dist))));
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    if (wasSingle && this.moved < 9 && performance.now() - this.downTime < 600) {
      this.onPick(this.pickAt(e.clientX, e.clientY));
    }
    if (this.pointers.size < 2) this.pinchStartDist = 0;
  };

  private onPointerCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStartDist = 0;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.camDist = Math.min(CAM_MAX, Math.max(CAM_MIN, this.camDist * (e.deltaY > 0 ? 1.08 : 0.92)));
  };

  // ─── Per-object idle + reaction animation ───────────────────────────────────

  private animateNode(n: StationNode, t: number, dt: number) {
    const r = n.rig;
    const ph = n.phase;

    // idle life per kind
    switch (n.spec.kind) {
      case "radar":
        if (r.sweep) r.sweep.rotation.z = -t * 1.6;
        if (r.dish) r.dish.rotation.y = t * 0.7;
        break;
      case "hologram":
        if (r.holo) { r.holo.rotation.y = t * 0.8; r.holo.position.y = 1.5 + Math.sin(t * 1.4 + ph) * 0.08; }
        if (r.holoRing) r.holoRing.rotation.z = t * 1.1;
        break;
      case "engineCore": {
        const pulse = 0.9 + Math.sin(t * 3 + ph) * 0.5;
        if (r.core) ((r.core as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1 + pulse * 0.7;
        if (r.coreGlow) { const s = 2.6 + pulse * 0.5; r.coreGlow.scale.set(s, s * 1.2, 1); }
        for (let i = 0; i < 3; i++) if (r[`coreRing${i}`]) r[`coreRing${i}`].rotation.z = t * (0.4 + i * 0.3);
        break;
      }
      case "scanner":
        if (r.ring) { r.ring.position.y = 1.1 + ((t * 0.5 + ph) % 1) * 0.9; }
        if (r.beam) ((r.beam as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.1 + (Math.sin(t * 2 + ph) * 0.5 + 0.5) * 0.12;
        break;
      case "waterBubble":
        if (r.bubble) {
          const wob = 1 + Math.sin(t * 2.4 + ph) * 0.07;
          r.bubble.scale.set(wob, 1 / wob, wob);
          r.bubble.position.y = 1.5 + Math.sin(t * 0.9 + ph) * 0.16;
        }
        break;
      case "plantPod":
        for (let i = 0; i < 3; i++) if (r[`plant${i}`]) r[`plant${i}`].rotation.z = Math.sin(t * 1.1 + i + ph) * 0.1;
        break;
      case "toolbox":
        if (r.floatBox) r.floatBox.position.y = 1.4 + Math.sin(t * 0.8 + ph) * 0.12;
        if (r.floatLid) r.floatLid.position.y = 1.76 + Math.sin(t * 0.8 + ph) * 0.12;
        if (r.floatTool) { r.floatTool.position.y = 2.1 + Math.sin(t * 1.1 + ph + 1) * 0.18; r.floatTool.rotation.z = t * 0.5; }
        break;
      case "roboticArm":
        if (r.shoulder) r.shoulder.rotation.y = Math.sin(t * 0.4 + ph) * 0.5;
        if (r.elbow) r.elbow.rotation.z = 0.8 + Math.sin(t * 0.6 + ph) * 0.2;
        break;
      case "sleepPod":
        if (r.bag) { const b = 1 + Math.sin(t * 1.1 + ph) * 0.03; r.bag.scale.set(b, 1, b); }
        if (r.zzz) { r.zzz.position.y = 2.5 + ((t * 0.3 + ph) % 1) * 0.5; (r.zzz as THREE.Sprite).material.opacity = 1 - ((t * 0.3 + ph) % 1); }
        break;
      case "treadmill":
        if (r.harness) r.harness.position.y = 0.9 + Math.sin(t * 2.2 + ph) * 0.05;
        break;
      case "foodPack":
        if (r.floatPack) { r.floatPack.position.y = 2.0 + Math.sin(t * 0.9 + ph) * 0.2; r.floatPack.rotation.z = t * 0.4; }
        break;
      case "meteorite":
        if (r.rock) { r.rock.rotation.y = t * 0.6; r.rock.position.y = 1.1 + Math.sin(t * 1.2 + ph) * 0.08; }
        break;
      case "sunLamp":
        if (r.glowTube) ((r.glowTube as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + Math.sin(t * 5 + ph) * 0.25;
        break;
      case "radio":
        for (let i = 0; i < 3; i++) {
          const led = r[`led${i}`];
          if (led) ((led as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + (Math.sin(t * 3 + i * 2.1) * 0.5 + 0.5) * 1.2;
        }
        break;
      case "console":
        if (r.screen) ((r.screen as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + (Math.sin(t * 7 + ph) * 0.5 + 0.5) * 0.15;
        break;
      case "coolant":
        if (r.glowPipe) ((r.glowPipe as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + Math.sin(t * 2.6 + ph) * 0.35;
        break;
      case "guitar":
        if (r.guitarBody) r.guitarBody.rotation.z = -0.14 + Math.sin(t * 0.8 + ph) * 0.02;
        break;
      default:
        break;
    }

    // tap reaction: a happy bounce + kind-specific action
    if (n.react > 0) {
      n.react = Math.max(0, n.react - dt);
      const p = 1 - n.react / 1.2; // 0..1
      const bump = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.14;
      n.group.scale.setScalar(1 + bump);
      switch (n.spec.kind) {
        case "lever":
          if (r.lever) r.lever.rotation.x = 0.55 - Math.sin(p * Math.PI) * 1.05;
          break;
        case "joystick":
          if (r.stick) r.stick.rotation.z = Math.sin(p * Math.PI * 3) * 0.5;
          break;
        case "probe":
          if (r.probeBody) {
            const fly = Math.min(1, p * 1.3);
            r.probeBody.position.set(0, 0.9 + fly * 9, -0.3 - fly * 9);
            if (r.probeFlame) ((r.probeFlame as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = fly < 0.95 ? 0.9 : 0;
            if (p > 0.98) r.probeBody.position.set(0, 0.9, -0.3);
          }
          break;
        case "roboticArm":
          if (r.claw) r.claw.rotation.z = Math.sin(p * Math.PI * 4) * 0.5;
          break;
        case "telescope":
          if (r.tube) r.tube.rotation.z = -0.9 + Math.sin(p * Math.PI) * 0.35;
          break;
        case "camera":
          if (r.head) r.head.rotation.y = Math.sin(p * Math.PI * 2) * 0.7;
          break;
        case "guitar":
          if (r.note) (r.note as THREE.Sprite).material.opacity = Math.sin(p * Math.PI);
          if (r.note) r.note.position.y = 2.2 + p * 0.8;
          break;
        default:
          break;
      }
      if (n.react === 0) n.group.scale.setScalar(1);
    }
  }

  // ─── Main loop ──────────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = performance.now() / 1000;
    const motion = this.reducedMotion ? 0.15 : 1;

    if (!this.reducedMotion && this.pointers.size === 0) this.autoYaw += dt * 0.06;
    this.stage.rotation.y = this.autoYaw + this.userYaw;

    // Earth turns, clouds drift a touch faster
    if (this.earth) this.earth.rotation.y += dt * 0.02 * motion;
    if (this.earthClouds) this.earthClouds.rotation.y += dt * 0.008 * motion;
    if (this.stars) this.stars.rotation.y += dt * 0.004 * motion;

    // equipment life + reactions
    for (const n of this.nodes) this.animateNode(n, this.reducedMotion ? 0 : t, dt);

    // zero-g drift
    if (!this.reducedMotion) {
      for (const f of this.floaters) {
        f.mesh.position.set(
          f.base.x + Math.sin(t * f.freq.x + f.phase) * f.amp.x,
          f.base.y + Math.sin(t * f.freq.y + f.phase * 2) * f.amp.y,
          f.base.z + Math.cos(t * f.freq.z + f.phase) * f.amp.z
        );
        f.mesh.rotation.x += dt * f.spin;
        f.mesh.rotation.y += dt * f.spin * 0.7;
      }
    }

    // occasional outside events
    if (!this.reducedMotion) {
      this.nextEventIn -= dt;
      if (this.nextEventIn <= 0 && this.cometT < 0 && this.meteorT < 0 && this.shipT < 0) {
        const roll = Math.random();
        if (roll < 0.4) this.startComet();
        else if (roll < 0.7) this.startMeteors();
        else this.startShip();
        this.nextEventIn = 16 + Math.random() * 14;
      }
      if (this.comet && this.cometT >= 0) {
        this.cometT += dt;
        this.comet.position.x += dt * 34;
        this.comet.position.y -= dt * 6;
        if (this.cometT > 10) {
          this.scene.remove(this.comet);
          this.comet = null;
          this.cometT = -1;
        }
      }
      if (this.meteorT >= 0) {
        this.meteorT += dt;
        for (const mtr of this.meteors) {
          mtr.sprite.position.addScaledVector(mtr.vel, dt);
          mtr.sprite.material.opacity = Math.max(0, 1 - this.meteorT / 5);
        }
        if (this.meteorT > 5) {
          for (const mtr of this.meteors) this.scene.remove(mtr.sprite);
          this.meteors = [];
          this.meteorT = -1;
        }
      }
      if (this.ship && this.shipT >= 0) {
        this.shipT += dt;
        this.ship.position.x += dt * 22;
        const flame = this.ship.getObjectByName("shipFlame") as THREE.Sprite | null;
        if (flame) flame.scale.setScalar(3.4 + Math.sin(t * 12) * 0.7);
        if (this.shipT > 18) {
          this.scene.remove(this.ship);
          this.ship = null;
          this.shipT = -1;
        }
      }
    }

    // camera: orbit outside the rim, high enough to see the whole module
    this.camera.position.set(0, 4.6 + this.camDist * 0.34, this.camDist);
    this.camera.lookAt(0, 0.6, 0);

    this.renderer.render(this.scene, this.camera);
  };
}
