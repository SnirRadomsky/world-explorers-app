// The land-journey engine: a scenic circular route through a living low-poly
// world. The chosen vehicle (car / train / plane) drives itself along the
// loop — wheels spin, suspension bobs, smoke puffs, the propeller whirls —
// past tappable sights: waterfalls, castles, volcanoes, balloon fleets...
// Drag orbits the chase camera, pinch zooms, and a tap on a sight discovers
// it. Clouds drift, birds circle, trees sway: alive even when standing still.

import * as THREE from "three";
import type { VehicleSpec, LandSightSpec } from "../data/landJourney";
import { sightsFor } from "../data/landJourney";
import { makeTextSprite, makeGlowTexture, mulberry32 } from "./proceduralTextures";

export interface LandPick {
  id: string;
  screenX: number;
  screenY: number;
}

export interface LandJourneyOptions {
  vehicle: VehicleSpec;
  discovered: Set<string>;
  reducedMotion: boolean;
  onPick: (pick: LandPick | null) => void;
  /** fired when the vehicle passes right next to an undiscovered sight */
  onNearSight?: (id: string) => void;
}

interface SightNode {
  spec: LandSightSpec;
  group: THREE.Group;
  rig: Record<string, THREE.Object3D>;
  label: THREE.Sprite;
  mystery: THREE.Sprite;
  labelY: number;
  angle: number;
  react: number;
  phase: number;
  announced: boolean;
}

function mat(color: string | number, opts?: { rough?: number; metal?: number; emissive?: string; emissiveI?: number }) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts?.rough ?? 0.85,
    metalness: opts?.metal ?? 0,
    emissive: opts?.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts?.emissive ? (opts?.emissiveI ?? 0.8) : 0,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function cyl(rt: number, rb: number, h: number, material: THREE.Material, seg = 10): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
}

function cone(r: number, h: number, material: THREE.Material, seg = 8): THREE.Mesh {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), material);
}

function sphere(r: number, material: THREE.Material, seg = 10): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
}

function tree(trunkH: number, crown: string, kind: "round" | "pine" = "round"): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.09, 0.14, trunkH, mat("#7a5230"), 6);
  trunk.position.y = trunkH / 2;
  g.add(trunk);
  if (kind === "pine") {
    for (let i = 0; i < 3; i++) {
      const c = cone(0.75 - i * 0.18, 0.9, mat(crown), 7);
      c.position.y = trunkH + 0.3 + i * 0.55;
      g.add(c);
    }
  } else {
    const c = sphere(0.75, mat(crown), 8);
    c.position.y = trunkH + 0.55;
    c.scale.y = 1.12;
    c.name = "crown";
    g.add(c);
  }
  return g;
}

const TRACK_R = 24;
const CAM_MIN = 5;
const CAM_MAX = 15;

/** Sky + ground palette per vehicle. */
const WORLDS = {
  car:   { skyTop: "#2f8fd8", skyMid: "#8ecbee", skyBottom: "#dff2fb", ground: "#77a95c", far: "#5c8a3d",
           sunColor: 0xfff4dc, sunI: 1.5, ambient: 0.95, haze: "#cfe8f7" },
  train: { skyTop: "#3d7fc4", skyMid: "#a7d3ec", skyBottom: "#eef8fd", ground: "#7fa96a", far: "#b9d4e6",
           sunColor: 0xfff8ea, sunI: 1.4, ambient: 1.0, haze: "#dceefa" },
  plane: { skyTop: "#3a63c4", skyMid: "#7fb2e8", skyBottom: "#ffd9a3", ground: "#6f9e58", far: "#8fb87a",
           sunColor: 0xffe0b0, sunI: 1.45, ambient: 0.92, haze: "#ffe6c4" },
} as const;

export class LandJourneyScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private world = new THREE.Group();
  private vehicle = new THREE.Group();
  private vehicleRig: Record<string, THREE.Object3D> = {};
  private sights: SightNode[] = [];
  private sightById = new Map<string, SightNode>();
  private clouds: THREE.Sprite[] = [];
  private birds: THREE.Group[] = [];
  private trees: THREE.Group[] = [];
  private smoke: { sprite: THREE.Sprite; age: number }[] = [];
  private smokeTimer = 0;

  private kind: "car" | "train" | "plane";
  private angle = 0;
  private speedMult = 1;
  private baseSpeed: number;
  private flyH: number;

  private onPick: (pick: LandPick | null) => void;
  private onNearSight?: (id: string) => void;
  private reducedMotion: boolean;
  private discovered: Set<string>;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartCam = 0;
  private moved = 0;
  private downTime = 0;
  private userYaw = 0;
  private userPitch = 0;
  private camDist = 9;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: LandJourneyOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.onNearSight = opts.onNearSight;
    this.reducedMotion = opts.reducedMotion;
    this.discovered = new Set(opts.discovered);
    this.kind = opts.vehicle.id;
    this.baseSpeed = this.kind === "plane" ? 0.085 : this.kind === "train" ? 0.07 : 0.06;
    this.flyH = this.kind === "plane" ? 11.5 : 0;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    const W = WORLDS[this.kind];
    this.scene = new THREE.Scene();

    // gradient sky
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 4;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext("2d");
    if (skyCtx) {
      const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, W.skyTop);
      grad.addColorStop(0.62, W.skyMid);
      grad.addColorStop(1, W.skyBottom);
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(0, 0, 4, 256);
      const tex = new THREE.CanvasTexture(skyCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = tex;
    } else {
      this.scene.background = new THREE.Color(W.skyMid);
    }
    this.scene.fog = new THREE.Fog(new THREE.Color(W.haze), 55, 150);

    this.camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      500
    );

    this.scene.add(new THREE.AmbientLight(0xffffff, W.ambient));
    const sun = new THREE.DirectionalLight(W.sunColor, W.sunI);
    sun.position.set(14, 26, 10);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd0e8, 0.35);
    fill.position.set(-10, 8, -8);
    this.scene.add(fill);
    // sun disc glow
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(255,240,190,0.95)", "rgba(255,240,190,0)", 128),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sunGlow.position.set(70, 60, 40);
    sunGlow.scale.set(34, 34, 1);
    this.scene.add(sunGlow);

    this.buildTerrain();
    this.buildTrack();
    this.buildScatter();
    this.buildCloudsAndBirds();
    this.buildVehicle(opts.vehicle);
    this.buildSights();
    this.scene.add(this.world);
    this.scene.add(this.vehicle);

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

  // ─── World ──────────────────────────────────────────────────────────────────

  private buildTerrain() {
    const W = WORLDS[this.kind];
    // painted ground disc: fields, meadow speckles, a blue river for the plane
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    let groundMat: THREE.MeshStandardMaterial;
    if (ctx) {
      ctx.fillStyle = W.ground;
      ctx.fillRect(0, 0, 512, 512);
      const rng = mulberry32(this.kind.length * 13 + 7);
      // patchwork fields
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = ["#86b86a", "#9ac97b", "#6f9e58", "#c9b36a", "#7fae5e"][Math.floor(rng() * 5)];
        ctx.globalAlpha = 0.5 + rng() * 0.4;
        const x = rng() * 512;
        const y = rng() * 512;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rng() * Math.PI);
        ctx.fillRect(-30 - rng() * 40, -20 - rng() * 26, 60 + rng() * 80, 40 + rng() * 52);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // meandering river
      ctx.strokeStyle = "#4aa3d8";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(30, 420);
      ctx.bezierCurveTo(160, 380, 120, 240, 260, 210);
      ctx.bezierCurveTo(390, 185, 380, 90, 480, 60);
      ctx.stroke();
      // speckles
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = i % 2 ? "#5c8a3d" : "#a7d18a";
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(rng() * 512, rng() * 512, 1 + rng() * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    } else {
      groundMat = new THREE.MeshStandardMaterial({ color: W.ground, roughness: 1 });
    }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 56), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.world.add(ground);

    // far mountain ring (parallax backdrop)
    const rng = mulberry32(31);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rng() * 0.2;
      const h = 12 + rng() * 16;
      const snowy = this.kind === "train" ? rng() > 0.35 : rng() > 0.72;
      const mtn = cone(9 + rng() * 7, h, mat(snowy ? "#9fb6c9" : "#7d9974"), 6);
      const d = 105 + rng() * 22;
      mtn.position.set(Math.cos(a) * d, h / 2 - 0.5, Math.sin(a) * d);
      this.world.add(mtn);
      if (snowy) {
        const cap = cone(3.2 + rng() * 2, h * 0.3, mat("#f4fafd"), 6);
        cap.position.set(Math.cos(a) * d, h - h * 0.15, Math.sin(a) * d);
        this.world.add(cap);
      }
    }
  }

  private buildTrack() {
    if (this.kind === "car") {
      // asphalt ring + dashed centerline
      const road = new THREE.Mesh(
        new THREE.RingGeometry(TRACK_R - 1.7, TRACK_R + 1.7, 96),
        new THREE.MeshStandardMaterial({ color: "#4b5563", roughness: 0.95 })
      );
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.02;
      this.world.add(road);
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2;
        const dash = box(0.14, 0.02, 1.1, mat("#f8fafc", { rough: 0.7 }));
        dash.position.set(Math.cos(a) * TRACK_R, 0.04, Math.sin(a) * TRACK_R);
        dash.rotation.y = -a + Math.PI / 2;
        this.world.add(dash);
      }
    } else if (this.kind === "train") {
      // gravel bed + two rails + sleepers
      const bed = new THREE.Mesh(
        new THREE.RingGeometry(TRACK_R - 1.6, TRACK_R + 1.6, 96),
        new THREE.MeshStandardMaterial({ color: "#9d9584", roughness: 1 })
      );
      bed.rotation.x = -Math.PI / 2;
      bed.position.y = 0.02;
      this.world.add(bed);
      for (const dr of [-0.55, 0.55]) {
        const rail = new THREE.Mesh(
          new THREE.TorusGeometry(TRACK_R + dr, 0.07, 6, 120),
          mat("#7c8794", { metal: 0.7, rough: 0.35 })
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 0.14;
        this.world.add(rail);
      }
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const sleeper = box(1.7, 0.08, 0.32, mat("#6b4f33"));
        sleeper.position.set(Math.cos(a) * TRACK_R, 0.06, Math.sin(a) * TRACK_R);
        sleeper.rotation.y = -a;
        this.world.add(sleeper);
      }
    }
    // plane: no track — open sky
  }

  private buildScatter() {
    const rng = mulberry32(this.kind.charCodeAt(0) * 7 + 3);
    const treeCount = this.kind === "plane" ? 26 : 44;
    for (let i = 0; i < treeCount; i++) {
      const pine = this.kind === "train" ? rng() > 0.35 : rng() > 0.75;
      const t = tree(0.9 + rng() * 0.7, pine ? "#2f6e46" : ["#3f9142", "#57a35a", "#2f8a4f"][Math.floor(rng() * 3)], pine ? "pine" : "round");
      // keep clear of the track band
      let r = 4 + rng() * 110;
      while (Math.abs(r - TRACK_R) < 3.4) r = 4 + rng() * 110;
      const a = rng() * Math.PI * 2;
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const s = 0.8 + rng() * (r > 60 ? 2.6 : 1.2);
      t.scale.setScalar(s);
      this.world.add(t);
      if (r < 70) this.trees.push(t);
    }
    // flower dots near the track (car), snow patches (train)
    if (this.kind !== "plane") {
      for (let i = 0; i < 40; i++) {
        const a = rng() * Math.PI * 2;
        const r = TRACK_R + (rng() > 0.5 ? 2.6 : -2.6) - 1 + rng() * 2;
        if (this.kind === "car") {
          const f = sphere(0.09, mat(["#f472b6", "#facc15", "#f87171", "#c084fc"][Math.floor(rng() * 4)], { emissive: "#fff", emissiveI: 0.06 }), 6);
          f.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r);
          this.world.add(f);
        } else {
          const p = sphere(0.4 + rng() * 0.5, mat("#eef4f8"), 7);
          p.scale.y = 0.25;
          p.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
          this.world.add(p);
        }
      }
    }
  }

  private buildCloudsAndBirds() {
    const rng = mulberry32(97);
    const cloudCount = this.kind === "plane" ? 18 : 10;
    for (let i = 0; i < cloudCount; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(255,255,255,0.92)", "rgba(255,255,255,0)", 128),
        transparent: true, depthWrite: false,
      }));
      const a = rng() * Math.PI * 2;
      const r = this.kind === "plane" ? 16 + rng() * 90 : 30 + rng() * 80;
      const h = this.kind === "plane" ? 4 + rng() * 12 : 16 + rng() * 14;
      c.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      const s = 7 + rng() * 12;
      c.scale.set(s, s * 0.5, 1);
      this.scene.add(c);
      this.clouds.push(c);
    }
    // little birds circling
    for (let i = 0; i < 3; i++) {
      const bird = new THREE.Group();
      for (const s of [-1, 1]) {
        const wing = box(0.5, 0.03, 0.16, mat("#374151"));
        wing.position.x = s * 0.25;
        wing.name = s > 0 ? "wingR" : "wingL";
        bird.add(wing);
      }
      bird.userData = { r: 12 + i * 7, h: 7 + i * 2.4, ph: i * 2.2, sp: 0.22 + i * 0.05 };
      this.scene.add(bird);
      this.birds.push(bird);
    }
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────────

  private buildVehicle(spec: VehicleSpec) {
    const g = this.vehicle;
    if (this.kind === "car") {
      const body = box(1.9, 0.55, 1.0, mat(spec.color, { rough: 0.45, metal: 0.2 }));
      body.position.y = 0.62;
      body.name = "body";
      g.add(body);
      const cabin = box(1.0, 0.5, 0.9, mat("#fca5a5", { rough: 0.4 }));
      cabin.position.set(-0.15, 1.12, 0);
      cabin.name = "cabin";
      g.add(cabin);
      const windshield = box(0.06, 0.36, 0.8, mat("#bae6fd", { rough: 0.1, metal: 0.3 }));
      windshield.position.set(0.42, 1.1, 0);
      windshield.rotation.z = -0.25;
      g.add(windshield);
      for (const [dx, dz] of [[0.62, 0.52], [0.62, -0.52], [-0.62, 0.52], [-0.62, -0.52]]) {
        const wheel = cyl(0.28, 0.28, 0.18, mat("#1f2937", { rough: 0.8 }), 12);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(dx, 0.28, dz);
        wheel.name = `wheel${dx > 0 ? "F" : "B"}${dz > 0 ? "L" : "R"}`;
        g.add(wheel);
        const hub = cyl(0.1, 0.1, 0.2, mat("#e5e7eb", { metal: 0.6, rough: 0.3 }), 8);
        hub.rotation.x = Math.PI / 2;
        hub.position.set(dx, 0.28, dz);
        g.add(hub);
      }
      for (const s of [-1, 1]) {
        const light = sphere(0.09, mat("#fef3c7", { emissive: "#fde68a", emissiveI: 1.3 }), 8);
        light.position.set(0.96, 0.62, s * 0.32);
        g.add(light);
      }
    } else if (this.kind === "train") {
      // locomotive
      const boiler = cyl(0.55, 0.55, 1.9, mat(spec.color, { rough: 0.4, metal: 0.25 }), 14);
      boiler.rotation.z = Math.PI / 2;
      boiler.position.set(0.3, 0.95, 0);
      boiler.name = "body";
      g.add(boiler);
      const cab = box(1.0, 1.1, 1.1, mat("#0f766e", { rough: 0.5 }));
      cab.position.set(-0.85, 1.0, 0);
      g.add(cab);
      const roof = box(1.2, 0.12, 1.3, mat("#134e4a"));
      roof.position.set(-0.85, 1.62, 0);
      g.add(roof);
      const chimney = cyl(0.14, 0.2, 0.55, mat("#1f2937"), 8);
      chimney.position.set(0.95, 1.7, 0);
      chimney.name = "chimney";
      g.add(chimney);
      const front = cyl(0.56, 0.56, 0.12, mat("#facc15", { rough: 0.4 }), 14);
      front.rotation.z = Math.PI / 2;
      front.position.set(1.32, 0.95, 0);
      g.add(front);
      const cow = box(0.5, 0.4, 1.0, mat("#b91c1c"));
      cow.position.set(1.45, 0.35, 0);
      cow.rotation.z = 0.6;
      g.add(cow);
      for (let i = 0; i < 3; i++) {
        for (const s of [-1, 1]) {
          const wheel = cyl(0.3, 0.3, 0.1, mat("#111827"), 12);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(0.9 - i * 0.85, 0.3, s * 0.52);
          wheel.name = `wheel${i}${s > 0 ? "L" : "R"}`;
          g.add(wheel);
        }
      }
      // two coaches trailing behind (attached in the same group; slight offset)
      for (let c = 0; c < 2; c++) {
        const coach = new THREE.Group();
        const bodyC = box(2.0, 0.95, 1.05, mat(c === 0 ? "#3b82f6" : "#f59e0b", { rough: 0.5 }));
        bodyC.position.y = 1.0;
        coach.add(bodyC);
        const roofC = box(2.15, 0.1, 1.2, mat("#e5e7eb"));
        roofC.position.y = 1.55;
        coach.add(roofC);
        for (let i = 0; i < 3; i++) {
          const win = box(0.34, 0.3, 1.1, mat("#bae6fd", { emissive: "#7dd3fc", emissiveI: 0.25 }));
          win.position.set(-0.6 + i * 0.6, 1.12, 0);
          coach.add(win);
        }
        for (let i = 0; i < 2; i++) {
          for (const s of [-1, 1]) {
            const wheel = cyl(0.22, 0.22, 0.09, mat("#111827"), 10);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(-0.55 + i * 1.1, 0.22, s * 0.5);
            coach.add(wheel);
          }
        }
        coach.position.x = -3.0 - c * 2.6;
        coach.name = `coach${c}`;
        g.add(coach);
      }
    } else {
      // plane
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.8, 6, 10), mat(spec.color, { rough: 0.4, metal: 0.15 }));
      body.rotation.z = Math.PI / 2;
      body.position.y = 0;
      body.name = "body";
      g.add(body);
      const cockpit = sphere(0.3, mat("#bae6fd", { rough: 0.1, metal: 0.3 }), 10);
      cockpit.position.set(0.35, 0.32, 0);
      cockpit.scale.set(1.2, 0.8, 0.9);
      g.add(cockpit);
      const wings = box(0.75, 0.08, 4.4, mat("#f8fafc", { rough: 0.45 }));
      wings.position.set(0.15, 0.05, 0);
      wings.name = "wings";
      g.add(wings);
      for (const s of [-1, 1]) {
        const tip = box(0.5, 0.06, 0.3, mat("#facc15"));
        tip.position.set(0.15, 0.12, s * 2.2);
        g.add(tip);
      }
      const tailV = box(0.5, 0.75, 0.08, mat("#facc15", { rough: 0.45 }));
      tailV.position.set(-1.25, 0.42, 0);
      g.add(tailV);
      const tailH = box(0.45, 0.06, 1.4, mat("#f8fafc"));
      tailH.position.set(-1.25, 0.18, 0);
      g.add(tailH);
      const nose = cone(0.18, 0.4, mat("#1f2937"), 10);
      nose.rotation.z = -Math.PI / 2;
      nose.position.set(1.45, 0, 0);
      g.add(nose);
      const prop = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const blade = box(0.06, 1.3, 0.14, mat("#4b5563"));
        blade.rotation.x = i * Math.PI / 2;
        prop.add(blade);
      }
      prop.position.set(1.62, 0, 0);
      prop.name = "prop";
      g.add(prop);
      for (const s of [-1, 1]) {
        const strut = cyl(0.04, 0.04, 0.5, mat("#6b7280"), 6);
        strut.position.set(0.3, -0.4, s * 0.4);
        g.add(strut);
        const wheel = cyl(0.14, 0.14, 0.1, mat("#111827"), 10);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(0.3, -0.66, s * 0.4);
        g.add(wheel);
      }
    }
    this.vehicleRig = {};
    g.traverse((o) => { if (o.name) this.vehicleRig[o.name] = o; });
  }

  // ─── Sights ─────────────────────────────────────────────────────────────────

  private buildSightMesh(spec: LandSightSpec): THREE.Group {
    const g = new THREE.Group();
    const rng = mulberry32(spec.id.length * 11 + spec.id.charCodeAt(3));
    switch (spec.kind) {
      case "deer": {
        const bodyD = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 8), mat("#a5713f"));
        bodyD.rotation.z = Math.PI / 2;
        bodyD.position.y = 0.85;
        g.add(bodyD);
        for (const [dx, dz] of [[0.35, 0.2], [0.35, -0.2], [-0.35, 0.2], [-0.35, -0.2]]) {
          const leg = cyl(0.06, 0.05, 0.7, mat("#8a5a30"), 6);
          leg.position.set(dx, 0.35, dz);
          g.add(leg);
        }
        const head = sphere(0.24, mat("#a5713f"), 8);
        head.position.set(0.65, 1.35, 0);
        head.name = "head";
        g.add(head);
        for (const s of [-1, 1]) {
          const antler = cyl(0.025, 0.025, 0.45, mat("#e7d3b3"), 5);
          antler.position.set(0.62, 1.7, s * 0.12);
          antler.rotation.z = s * 0.3;
          g.add(antler);
        }
        break;
      }
      case "waterfall": {
        const cliff = box(2.6, 3.2, 1.6, mat("#8a8577"));
        cliff.position.y = 1.6;
        g.add(cliff);
        const fall = box(1.2, 3.0, 0.18, mat("#9fd8f0", { rough: 0.2, emissive: "#bfe9fa", emissiveI: 0.25 }));
        fall.position.set(0, 1.5, 0.9);
        fall.name = "fall";
        g.add(fall);
        const pool = cyl(1.5, 1.5, 0.12, mat("#4aa3d8", { rough: 0.2 }), 16);
        pool.position.set(0, 0.06, 1.4);
        g.add(pool);
        for (let i = 0; i < 3; i++) {
          const foam = sphere(0.16, mat("#ffffff", { rough: 0.4 }), 7);
          foam.position.set(-0.4 + i * 0.4, 0.16, 1.15);
          foam.name = `foam${i}`;
          g.add(foam);
        }
        break;
      }
      case "windmill": {
        const towerW = cyl(0.4, 0.7, 2.8, mat("#f1e5cf"), 8);
        towerW.position.y = 1.4;
        g.add(towerW);
        const capW = cone(0.55, 0.6, mat("#b45309"), 8);
        capW.position.y = 3.1;
        g.add(capW);
        const blades = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const blade = box(0.16, 1.5, 0.05, mat("#f8fafc"));
          blade.position.y = 0.75;
          const holder = new THREE.Group();
          holder.rotation.z = (i / 4) * Math.PI * 2;
          holder.add(blade);
          blades.add(holder);
        }
        blades.position.set(0, 2.85, 0.62);
        blades.name = "spinner";
        g.add(blades);
        break;
      }
      case "castle": {
        const keep = box(1.6, 2.2, 1.6, mat("#b8b0a0"));
        keep.position.y = 1.1;
        g.add(keep);
        for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
          const towerC = cyl(0.42, 0.46, 2.8, mat("#c9c2b2"), 8);
          towerC.position.set(dx, 1.4, dz);
          g.add(towerC);
          const roofC = cone(0.5, 0.8, mat("#b91c1c"), 8);
          roofC.position.set(dx, 3.2, dz);
          g.add(roofC);
        }
        const flag = box(0.5, 0.3, 0.02, mat("#3b82f6"));
        flag.position.set(0.25, 3.1, 0);
        flag.name = "flag";
        g.add(flag);
        const pole = cyl(0.03, 0.03, 1.2, mat("#6b7280"), 6);
        pole.position.set(0, 2.8, 0);
        g.add(pole);
        break;
      }
      case "farm": {
        const barn = box(1.8, 1.2, 1.4, mat("#c2410c"));
        barn.position.y = 0.6;
        g.add(barn);
        const roofB = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.8, 3), mat("#7c2d12"));
        roofB.rotation.z = Math.PI / 2;
        roofB.rotation.x = Math.PI;
        roofB.position.y = 1.55;
        roofB.scale.set(1, 1, 0.75);
        g.add(roofB);
        for (let i = 0; i < 2; i++) {
          const cow = new THREE.Group();
          const bodyC = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), mat("#f8fafc"));
          bodyC.rotation.z = Math.PI / 2;
          bodyC.position.y = 0.5;
          cow.add(bodyC);
          const spot = sphere(0.16, mat("#1f2937"), 6);
          spot.position.set(0.1, 0.62, 0.18);
          cow.add(spot);
          const headC = sphere(0.17, mat("#f8fafc"), 8);
          headC.position.set(0.45, 0.62, 0);
          cow.add(headC);
          for (const [dx, dz] of [[0.25, 0.15], [0.25, -0.15], [-0.25, 0.15], [-0.25, -0.15]]) {
            const leg = cyl(0.05, 0.05, 0.4, mat("#e5e7eb"), 5);
            leg.position.set(dx, 0.2, dz);
            cow.add(leg);
          }
          cow.position.set(1.6 + i * 0.9, 0, 0.8 - i * 1.4);
          cow.rotation.y = rng() * Math.PI * 2;
          cow.name = `cow${i}`;
          g.add(cow);
        }
        break;
      }
      case "orchard": {
        for (let i = 0; i < 4; i++) {
          const t = tree(0.7, "#3f9142");
          t.position.set((i % 2) * 1.6 - 0.8, 0, Math.floor(i / 2) * 1.6 - 0.8);
          g.add(t);
          for (let j = 0; j < 4; j++) {
            const apple = sphere(0.08, mat("#ef4444", { emissive: "#b91c1c", emissiveI: 0.25 }), 6);
            const a = rng() * Math.PI * 2;
            apple.position.set(
              (i % 2) * 1.6 - 0.8 + Math.cos(a) * 0.5,
              1.2 + rng() * 0.6,
              Math.floor(i / 2) * 1.6 - 0.8 + Math.sin(a) * 0.5
            );
            g.add(apple);
          }
        }
        break;
      }
      case "flowers": {
        for (let i = 0; i < 22; i++) {
          const stem = cyl(0.02, 0.02, 0.3, mat("#3f9142"), 5);
          const x = (rng() - 0.5) * 3.4;
          const z = (rng() - 0.5) * 3.4;
          stem.position.set(x, 0.15, z);
          g.add(stem);
          const bloom = sphere(0.1, mat(["#f472b6", "#facc15", "#f87171", "#c084fc", "#fb923c"][Math.floor(rng() * 5)], { emissive: "#ffffff", emissiveI: 0.08 }), 6);
          bloom.position.set(x, 0.34, z);
          bloom.name = `bloom${i}`;
          g.add(bloom);
        }
        break;
      }
      case "ruins": {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const h = 0.8 + rng() * 1.2;
          const col = cyl(0.2, 0.24, h, mat("#d6cbb2"), 8);
          col.position.set(Math.cos(a) * 1.2, h / 2, Math.sin(a) * 1.2);
          g.add(col);
        }
        const lintel = box(1.4, 0.25, 0.4, mat("#c9bfa5"));
        lintel.position.set(0, 1.9, -1.1);
        lintel.rotation.z = 0.08;
        g.add(lintel);
        break;
      }
      case "picnic": {
        const table = box(1.2, 0.08, 0.8, mat("#a16207"));
        table.position.y = 0.55;
        g.add(table);
        for (const s of [-1, 1]) {
          const bench = box(1.2, 0.06, 0.25, mat("#854d0e"));
          bench.position.set(0, 0.32, s * 0.6);
          g.add(bench);
          const legT = box(0.08, 0.55, 0.6, mat("#713f12"));
          legT.position.set(s * 0.45, 0.28, 0);
          g.add(legT);
        }
        const blanket = box(0.7, 0.02, 0.5, mat("#ef4444"));
        blanket.position.set(0, 0.6, 0);
        g.add(blanket);
        const basket = box(0.3, 0.2, 0.2, mat("#b45309"));
        basket.position.set(0.2, 0.7, 0.1);
        g.add(basket);
        const umb = cone(1.0, 0.5, mat("#f59e0b"), 10);
        umb.position.set(-0.9, 1.6, 0);
        g.add(umb);
        const umbPole = cyl(0.04, 0.04, 1.4, mat("#6b7280"), 6);
        umbPole.position.set(-0.9, 0.7, 0);
        g.add(umbPole);
        break;
      }
      case "viewpoint": {
        const deck = cyl(1.1, 1.2, 0.2, mat("#a16207"), 10);
        deck.position.y = 1.8;
        g.add(deck);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const legV = cyl(0.08, 0.1, 1.8, mat("#854d0e"), 6);
          legV.position.set(Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8);
          g.add(legV);
        }
        const rail = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.04, 6, 20), mat("#713f12"));
        rail.rotation.x = Math.PI / 2;
        rail.position.y = 2.5;
        g.add(rail);
        const scope = cyl(0.08, 0.11, 0.5, mat("#374151", { metal: 0.5 }), 8);
        scope.rotation.z = -0.6;
        scope.position.set(0.3, 2.35, 0);
        scope.name = "scope";
        g.add(scope);
        break;
      }
      case "rangers": {
        const hut = box(1.4, 1.1, 1.2, mat("#7f5539"));
        hut.position.y = 0.55;
        g.add(hut);
        const roofH = cone(1.25, 0.7, mat("#5d3a24"), 4);
        roofH.position.y = 1.45;
        roofH.rotation.y = Math.PI / 4;
        g.add(roofH);
        const door = box(0.35, 0.6, 0.05, mat("#3f2a18"));
        door.position.set(0, 0.35, 0.62);
        g.add(door);
        const flagpole = cyl(0.03, 0.03, 2.2, mat("#9ca3af"), 6);
        flagpole.position.set(0.95, 1.1, 0.4);
        g.add(flagpole);
        const flagR = box(0.4, 0.26, 0.02, mat("#16a34a"));
        flagR.position.set(1.17, 2.0, 0.4);
        flagR.name = "flag";
        g.add(flagR);
        break;
      }
      case "lake": {
        const water = cyl(2.2, 2.2, 0.1, mat("#4aa3d8", { rough: 0.15, metal: 0.1 }), 20);
        water.position.y = 0.05;
        water.name = "water";
        g.add(water);
        for (let i = 0; i < 2; i++) {
          const swan = new THREE.Group();
          const bodyS = ell(0.22, 0.16, 0.14, mat("#f8fafc"));
          bodyS.position.y = 0.18;
          swan.add(bodyS);
          const neck = cyl(0.04, 0.05, 0.3, mat("#f8fafc"), 6);
          neck.position.set(0.18, 0.35, 0);
          neck.rotation.z = -0.3;
          swan.add(neck);
          const headS = sphere(0.06, mat("#f8fafc"), 6);
          headS.position.set(0.26, 0.5, 0);
          swan.add(headS);
          const beak = cone(0.03, 0.08, mat("#f59e0b"), 5);
          beak.rotation.z = -Math.PI / 2;
          beak.position.set(0.34, 0.5, 0);
          swan.add(beak);
          swan.position.set(-0.5 + i, 0, 0.3 - i * 0.7);
          swan.name = `swan${i}`;
          g.add(swan);
        }
        break;
      }
      // train sights
      case "trainStation": {
        const platform = box(3.2, 0.3, 1.4, mat("#c9c2b2"));
        platform.position.y = 0.15;
        g.add(platform);
        const bld = box(2.2, 1.2, 1.0, mat("#dda15e"));
        bld.position.y = 0.9;
        g.add(bld);
        const roofS = box(2.6, 0.12, 1.3, mat("#7c2d12"));
        roofS.position.y = 1.56;
        g.add(roofS);
        const clockFace = cyl(0.2, 0.2, 0.06, mat("#f8fafc", { emissive: "#fef9c3", emissiveI: 0.3 }), 12);
        clockFace.rotation.x = Math.PI / 2;
        clockFace.position.set(0, 1.25, 0.55);
        g.add(clockFace);
        const sign = box(0.9, 0.3, 0.05, mat("#1d4ed8"));
        sign.position.set(0, 1.9, 0);
        sign.name = "sign";
        g.add(sign);
        break;
      }
      case "sheep": {
        for (let i = 0; i < 4; i++) {
          const sheep = new THREE.Group();
          const wool = sphere(0.3, mat("#f5f0e8"), 8);
          wool.position.y = 0.42;
          wool.scale.set(1.25, 1, 1);
          sheep.add(wool);
          const headSh = sphere(0.13, mat("#33261a"), 7);
          headSh.position.set(0.4, 0.48, 0);
          sheep.add(headSh);
          for (const [dx, dz] of [[0.18, 0.12], [0.18, -0.12], [-0.18, 0.12], [-0.18, -0.12]]) {
            const leg = cyl(0.04, 0.04, 0.3, mat("#33261a"), 5);
            leg.position.set(dx, 0.15, dz);
            sheep.add(leg);
          }
          sheep.position.set((rng() - 0.5) * 2.8, 0, (rng() - 0.5) * 2.4);
          sheep.rotation.y = rng() * Math.PI * 2;
          sheep.name = `sheep${i}`;
          g.add(sheep);
        }
        break;
      }
      case "pineForest": {
        for (let i = 0; i < 6; i++) {
          const t = tree(0.7 + rng() * 0.5, "#2f6e46", "pine");
          t.position.set((rng() - 0.5) * 3.4, 0, (rng() - 0.5) * 3.4);
          t.scale.setScalar(0.9 + rng() * 0.7);
          g.add(t);
        }
        break;
      }
      case "tunnel": {
        // an arch over the track — the train actually passes through it
        const hill = sphere(3.2, mat("#7d9974"), 10);
        hill.scale.set(1.15, 0.85, 1);
        hill.position.y = 0.4;
        g.add(hill);
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(1.5, 0.4, 8, 16, Math.PI),
          mat("#57534e")
        );
        arch.position.y = 0.2;
        g.add(arch);
        const hole = cyl(1.35, 1.35, 0.6, mat("#0f172a"), 16);
        hole.rotation.x = Math.PI / 2;
        hole.position.y = 0.65;
        g.add(hole);
        break;
      }
      case "snowPeak": {
        const peak = cone(2.6, 4.6, mat("#8fa8bb"), 7);
        peak.position.y = 2.3;
        g.add(peak);
        const snow = cone(1.15, 1.7, mat("#f4fafd"), 7);
        snow.position.y = 3.85;
        g.add(snow);
        const peak2 = cone(1.7, 3.0, mat("#9fb6c9"), 6);
        peak2.position.set(1.9, 1.5, 0.6);
        g.add(peak2);
        const snow2 = cone(0.8, 1.1, mat("#ffffff"), 6);
        snow2.position.set(1.9, 2.55, 0.6);
        g.add(snow2);
        break;
      }
      case "snowman": {
        const b1 = sphere(0.55, mat("#f8fafc"), 12);
        b1.position.y = 0.55;
        g.add(b1);
        const b2 = sphere(0.4, mat("#ffffff"), 12);
        b2.position.y = 1.3;
        g.add(b2);
        const b3 = sphere(0.28, mat("#f8fafc"), 12);
        b3.position.y = 1.85;
        b3.name = "head";
        g.add(b3);
        const carrot = cone(0.06, 0.3, mat("#fb923c"), 6);
        carrot.rotation.x = Math.PI / 2;
        carrot.position.set(0, 1.85, 0.35);
        g.add(carrot);
        for (const s of [-1, 1]) {
          const eye = sphere(0.04, mat("#1f2937"), 5);
          eye.position.set(s * 0.1, 1.95, 0.24);
          g.add(eye);
          const arm = cyl(0.03, 0.03, 0.7, mat("#7a5230"), 5);
          arm.position.set(s * 0.6, 1.35, 0);
          arm.rotation.z = s * 0.9;
          g.add(arm);
        }
        const hat = cyl(0.18, 0.18, 0.26, mat("#1f2937"), 10);
        hat.position.y = 2.16;
        g.add(hat);
        const brim = cyl(0.3, 0.3, 0.04, mat("#1f2937"), 10);
        brim.position.y = 2.05;
        g.add(brim);
        break;
      }
      case "riverBridge": {
        const river = box(6, 0.06, 1.6, mat("#4aa3d8", { rough: 0.15 }));
        river.position.y = 0.03;
        g.add(river);
        for (let i = 0; i < 3; i++) {
          const archB = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 8, 12, Math.PI), mat("#b8977a"));
          archB.position.set(-1.6 + i * 1.6, 0.15, 0);
          g.add(archB);
        }
        const deckB = box(5.4, 0.18, 0.7, mat("#a16207"));
        deckB.position.y = 1.0;
        g.add(deckB);
        for (let i = 0; i < 6; i++) {
          const post = cyl(0.04, 0.04, 0.4, mat("#854d0e"), 5);
          post.position.set(-2.3 + i * 0.92, 1.28, 0.3);
          g.add(post);
        }
        break;
      }
      case "canyon": {
        for (const s of [-1, 1]) {
          const wall = box(1.2, 2.6, 3.4, mat(s > 0 ? "#c2703e" : "#b05f33"));
          wall.position.set(s * 1.5, 1.3, 0);
          g.add(wall);
          const strata = box(1.25, 0.2, 3.45, mat("#dda15e"));
          strata.position.set(s * 1.5, 1.7, 0);
          g.add(strata);
        }
        const riverC = box(1.4, 0.05, 3.4, mat("#4aa3d8", { rough: 0.2 }));
        riverC.position.y = 0.03;
        g.add(riverC);
        break;
      }
      case "geyser": {
        const mound = cone(1.1, 0.7, mat("#d6cbb2"), 10);
        mound.position.y = 0.35;
        g.add(mound);
        const jet = cyl(0.16, 0.3, 2.4, mat("#bfe9fa", { rough: 0.2, emissive: "#e0f6ff", emissiveI: 0.3 }), 8);
        jet.position.y = 1.9;
        jet.name = "jet";
        g.add(jet);
        const puffG = sphere(0.5, mat("#ffffff", { rough: 0.6 }), 8);
        puffG.position.y = 3.2;
        puffG.name = "puff";
        g.add(puffG);
        break;
      }
      case "silo": {
        const siloC = cyl(0.7, 0.7, 2.6, mat("#d9822b"), 12);
        siloC.position.y = 1.3;
        g.add(siloC);
        const dome = sphere(0.7, mat("#b45309"), 12);
        dome.position.y = 2.6;
        dome.scale.y = 0.6;
        g.add(dome);
        const shed = box(1.4, 0.9, 1.0, mat("#a16207"));
        shed.position.set(1.3, 0.45, 0);
        g.add(shed);
        const wheat = box(2.2, 0.3, 2.2, mat("#e8c872"));
        wheat.position.set(0, 0.15, 1.9);
        g.add(wheat);
        break;
      }
      case "eagleNest": {
        const crag = cone(1.2, 3.4, mat("#8a8577"), 6);
        crag.position.y = 1.7;
        g.add(crag);
        const nest = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.14, 6, 12), mat("#8a6a3c"));
        nest.rotation.x = Math.PI / 2;
        nest.position.y = 3.4;
        g.add(nest);
        const eagle = new THREE.Group();
        const bodyE = ell(0.14, 0.2, 0.12, mat("#5c4327"));
        eagle.add(bodyE);
        const headE = sphere(0.09, mat("#f8fafc"), 7);
        headE.position.y = 0.24;
        eagle.add(headE);
        for (const s of [-1, 1]) {
          const wing = box(0.4, 0.03, 0.14, mat("#4a3620"));
          wing.position.x = s * 0.24;
          wing.name = s > 0 ? "wingR" : "wingL";
          eagle.add(wing);
        }
        eagle.position.y = 3.6;
        eagle.name = "eagle";
        g.add(eagle);
        break;
      }
      case "city": {
        const heights = [2.6, 3.6, 2.0, 3.0, 2.4];
        heights.forEach((h, i) => {
          const bld = box(0.9, h, 0.9, mat(["#7796b8", "#8aa8c9", "#6b8bad", "#9db8d4", "#7f9ec0"][i], { rough: 0.5, metal: 0.15 }));
          bld.position.set(-1.9 + i * 0.95, h / 2, (i % 2) * 0.8 - 0.4);
          g.add(bld);
          for (let w = 0; w < Math.floor(h * 2); w++) {
            const win = box(0.14, 0.14, 0.02, mat("#fde68a", { emissive: "#fcd34d", emissiveI: 0.9 }));
            win.position.set(
              -1.9 + i * 0.95 + ((w % 2) - 0.5) * 0.4,
              0.4 + Math.floor(w / 2) * 0.55,
              (i % 2) * 0.8 - 0.4 + 0.47
            );
            g.add(win);
          }
        });
        break;
      }
      // plane sights
      case "volcano": {
        const bodyV = cone(2.8, 3.2, mat("#6b4a3a"), 9);
        bodyV.position.y = 1.6;
        g.add(bodyV);
        const crater = cyl(0.9, 1.2, 0.5, mat("#3f2a20"), 9);
        crater.position.y = 3.1;
        g.add(crater);
        const glow = sphere(0.75, mat("#ff6b35", { emissive: "#ff4500", emissiveI: 1.6 }), 9);
        glow.position.y = 3.15;
        glow.scale.y = 0.4;
        glow.name = "lava";
        g.add(glow);
        for (let i = 0; i < 3; i++) {
          const puffV = sphere(0.4 + i * 0.16, mat("#9ca3af", { rough: 0.9 }), 8);
          puffV.position.set(0.2 * i, 3.8 + i * 0.7, 0.1 * i);
          puffV.name = `vsmoke${i}`;
          g.add(puffV);
        }
        break;
      }
      case "rainbow": {
        const colors = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"];
        colors.forEach((c, i) => {
          const arc = new THREE.Mesh(
            new THREE.TorusGeometry(3.4 - i * 0.22, 0.11, 6, 32, Math.PI),
            new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.82 })
          );
          arc.name = i === 0 ? "arc" : `arc${i}`;
          g.add(arc);
        });
        break;
      }
      case "balloons": {
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Group();
          const envColors = [["#ef4444", "#facc15"], ["#3b82f6", "#f8fafc"], ["#22c55e", "#f97316"]][i];
          const env = sphere(0.7, mat(envColors[0], { rough: 0.6 }), 12);
          env.scale.y = 1.15;
          b.add(env);
          const stripe = sphere(0.71, mat(envColors[1], { rough: 0.6 }), 12);
          stripe.scale.set(0.55, 1.16, 1.001);
          b.add(stripe);
          const basket = box(0.3, 0.24, 0.3, mat("#a16207"));
          basket.position.y = -1.05;
          b.add(basket);
          b.position.set(i * 1.7 - 1.7, i * 0.8, (i % 2) * 1.4 - 0.7);
          b.name = `balloon${i}`;
          g.add(b);
        }
        break;
      }
      case "desert": {
        for (let i = 0; i < 4; i++) {
          const dune = sphere(1.4 + rng() * 0.8, mat(i % 2 ? "#e8c872" : "#dda15e"), 9);
          dune.scale.y = 0.3;
          dune.position.set((rng() - 0.5) * 4.5, 0.15, (rng() - 0.5) * 4.5);
          g.add(dune);
        }
        const cactus = cyl(0.14, 0.16, 1.1, mat("#3f9142"), 7);
        cactus.position.y = 0.75;
        g.add(cactus);
        const cArm = cyl(0.09, 0.09, 0.5, mat("#3f9142"), 6);
        cArm.position.set(0.28, 0.95, 0);
        cArm.rotation.z = -0.8;
        g.add(cArm);
        break;
      }
      case "skyCity": {
        const heights = [3.4, 4.8, 2.8, 4.0, 3.2, 2.4];
        heights.forEach((h, i) => {
          const bld = box(0.8, h, 0.8, mat(["#7796b8", "#94aecb", "#6b8bad", "#a9c1d9", "#7f9ec0", "#8aa8c9"][i], { rough: 0.45, metal: 0.2 }));
          bld.position.set(-2.1 + i * 0.85, h / 2, (i % 3) * 0.9 - 0.9);
          g.add(bld);
        });
        const spire = cyl(0.04, 0.08, 1.2, mat("#e5e7eb", { metal: 0.5 }), 6);
        spire.position.set(-1.25, 5.4, 0);
        g.add(spire);
        break;
      }
      case "riverDelta": {
        const base = cyl(2.4, 2.4, 0.06, mat("#77a95c"), 18);
        base.position.y = 0.03;
        g.add(base);
        for (let i = 0; i < 3; i++) {
          const branch = box(0.5, 0.04, 3.6, mat("#4aa3d8", { rough: 0.2 }));
          branch.position.y = 0.07;
          branch.rotation.y = -0.5 + i * 0.5;
          g.add(branch);
        }
        break;
      }
      case "blueLake": {
        const lake = cyl(2.4, 2.4, 0.08, mat("#2dd4bf", { rough: 0.12, emissive: "#14b8a6", emissiveI: 0.25 }), 22);
        lake.position.y = 0.04;
        lake.name = "water";
        g.add(lake);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.14, 6, 26), mat("#e8e2d2"));
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.05;
        g.add(rim);
        break;
      }
      case "island": {
        const sea = cyl(3.0, 3.0, 0.06, mat("#3b82c4", { rough: 0.15 }), 22);
        sea.position.y = 0.03;
        g.add(sea);
        const isle = sphere(1.1, mat("#e8c872"), 10);
        isle.scale.y = 0.35;
        isle.position.y = 0.2;
        g.add(isle);
        const palmT = cyl(0.06, 0.09, 1.1, mat("#8a5a30"), 6);
        palmT.position.set(0.2, 0.8, 0);
        palmT.rotation.z = -0.2;
        g.add(palmT);
        for (let i = 0; i < 5; i++) {
          const frond = box(0.8, 0.03, 0.2, mat("#2f8a4f"));
          frond.position.set(0.35 + Math.cos((i / 5) * Math.PI * 2) * 0.3, 1.38, Math.sin((i / 5) * Math.PI * 2) * 0.3);
          frond.rotation.y = (i / 5) * Math.PI * 2;
          frond.rotation.z = -0.25;
          g.add(frond);
        }
        break;
      }
      case "birdFlock": {
        for (let i = 0; i < 5; i++) {
          const bird = new THREE.Group();
          for (const s of [-1, 1]) {
            const wing = box(0.4, 0.03, 0.13, mat("#f8fafc"));
            wing.position.x = s * 0.2;
            wing.name = s > 0 ? "wingR" : "wingL";
            bird.add(wing);
          }
          // V formation
          const row = Math.ceil(i / 2);
          const side = i % 2 === 0 ? 1 : -1;
          bird.position.set(-row * 0.7, -row * 0.15, side * row * 0.6);
          bird.name = `fbird${i}`;
          g.add(bird);
        }
        break;
      }
      case "iceMountain": {
        const peakI = cone(2.2, 4.2, mat("#bcd7e8"), 7);
        peakI.position.y = 2.1;
        g.add(peakI);
        const capI = cone(1.2, 1.8, mat("#f4fafd"), 7);
        capI.position.y = 3.3;
        g.add(capI);
        const shard = cone(0.6, 1.6, mat("#d5ecf7", { emissive: "#e8f6fd", emissiveI: 0.2 }), 6);
        shard.position.set(1.5, 0.8, 0.5);
        g.add(shard);
        break;
      }
      case "cloudCastle": {
        for (let i = 0; i < 6; i++) {
          const puffC = sphere(0.7 + rng() * 0.7, mat("#ffffff", { rough: 0.8 }), 9);
          puffC.position.set((rng() - 0.5) * 3.2, (rng() - 0.5) * 1.4, (rng() - 0.5) * 2.2);
          puffC.name = `cloudpuff${i}`;
          g.add(puffC);
        }
        break;
      }
      case "skyRings": {
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.5, 0.12, 8, 24),
            mat("#facc15", { emissive: "#f59e0b", emissiveI: 0.9 })
          );
          ring.position.set(i * 2.4 - 2.4, i * 0.7, 0);
          ring.name = `ring${i}`;
          g.add(ring);
        }
        break;
      }
    }
    return g;

    function ell(rx: number, ry: number, rz: number, material: THREE.Material): THREE.Mesh {
      const mesh = sphere(1, material);
      mesh.scale.set(rx, ry, rz);
      return mesh;
    }
  }

  private buildSights() {
    const list = sightsFor(this.kind);
    const rng = mulberry32(this.kind.length * 5 + 1);
    for (const spec of list) {
      const a = spec.at * Math.PI * 2;
      const group = this.buildSightMesh(spec);
      const airborne = spec.kind === "balloons" || spec.kind === "skyRings" || spec.kind === "birdFlock" || spec.kind === "cloudCastle" || spec.kind === "rainbow";
      const r = TRACK_R + spec.side * (this.kind === "plane" ? 8 : 5.5) + (rng() - 0.5) * 1.4;
      const y = this.kind === "plane"
        ? (airborne ? this.flyH - 1 + (spec.kind === "rainbow" ? -4 : 0) : 0)
        : 0;
      group.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      group.rotation.y = -a + Math.PI / 2 + (spec.side > 0 ? Math.PI : 0);
      group.traverse((o) => { o.userData.sightId = spec.id; });

      // fat-finger hit sphere
      const bounds = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const hitR = Math.max(1.6, Math.max(size.x, size.y, size.z) * 0.6);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(hitR, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = size.y * 0.45;
      hit.userData.sightId = spec.id;
      group.add(hit);

      const labelY = y + size.y + 1.1;
      const label = makeTextSprite(spec.nameHebrew, { fontSize: 54 });
      label.scale.multiplyScalar(2.6);
      const mystery = makeTextSprite("❓", { fontSize: 56, color: "#fff4c2", stroke: "rgba(60,40,10,0.9)" });
      mystery.scale.multiplyScalar(1.5);
      const found = this.discovered.has(spec.id);
      label.visible = found;
      mystery.visible = !found;
      label.position.set(group.position.x, labelY, group.position.z);
      mystery.position.copy(label.position);
      this.world.add(label, mystery);

      const rig: Record<string, THREE.Object3D> = {};
      group.traverse((o) => { if (o.name) rig[o.name] = o; });

      this.world.add(group);
      const node: SightNode = {
        spec, group, rig, label, mystery, labelY,
        angle: a, react: 0, phase: rng() * Math.PI * 2, announced: false,
      };
      this.sights.push(node);
      this.sightById.set(spec.id, node);
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setDiscovered(discovered: Set<string>) {
    this.discovered = new Set(discovered);
    for (const s of this.sights) {
      const found = this.discovered.has(s.spec.id);
      s.label.visible = found;
      s.mystery.visible = !found;
    }
  }

  playReaction(id: string) {
    const s = this.sightById.get(id);
    if (s) s.react = 1.2;
  }

  setSpeed(mult: number) { this.speedMult = mult; }

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

  private pickAt(clientX: number, clientY: number): LandPick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.sights.map((s) => s.group), true);
    for (const hit of hits) {
      const id = hit.object.userData.sightId as string | undefined;
      if (id) return { id, screenX: clientX, screenY: clientY };
    }
    // nearest sight center within 52px
    let best: string | null = null;
    let bestPx = 52;
    const v = new THREE.Vector3();
    for (const s of this.sights) {
      s.group.getWorldPosition(v);
      v.project(this.camera);
      if (v.z > 1) continue;
      const sx = ((v.x + 1) / 2) * rect.width + rect.left;
      const sy = ((1 - v.y) / 2) * rect.height + rect.top;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestPx) {
        bestPx = d;
        best = s.spec.id;
      }
    }
    return best ? { id: best, screenX: clientX, screenY: clientY } : null;
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
      const dy = e.clientY - prev.y;
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.userYaw -= dx * 0.005;
      this.userPitch = Math.min(0.5, Math.max(-0.25, this.userPitch - dy * 0.003));
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

  // ─── Sight idle + reaction animation ────────────────────────────────────────

  private animateSight(s: SightNode, t: number, dt: number) {
    const r = s.rig;
    const ph = s.phase;
    switch (s.spec.kind) {
      case "windmill":
        if (r.spinner) r.spinner.rotation.z = t * 1.1;
        break;
      case "waterfall":
        if (r.fall) {
          const m = (r.fall as THREE.Mesh).material as THREE.MeshStandardMaterial;
          m.emissiveIntensity = 0.2 + (Math.sin(t * 6 + ph) * 0.5 + 0.5) * 0.2;
        }
        for (let i = 0; i < 3; i++) {
          const foam = r[`foam${i}`];
          if (foam) foam.position.y = 0.12 + Math.abs(Math.sin(t * 3 + i * 1.7)) * 0.14;
        }
        break;
      case "castle":
      case "rangers":
      case "trainStation":
        if (r.flag) r.flag.rotation.y = Math.sin(t * 3 + ph) * 0.3;
        if (r.sign) r.sign.rotation.z = Math.sin(t * 1.4 + ph) * 0.05;
        break;
      case "deer":
        if (r.head) r.head.position.y = 1.35 + Math.sin(t * 1.1 + ph) * 0.05;
        break;
      case "farm":
        for (let i = 0; i < 2; i++) {
          const cow = r[`cow${i}`];
          if (cow) cow.rotation.y += Math.sin(t * 0.3 + i * 2 + ph) * 0.002;
        }
        break;
      case "lake":
        for (let i = 0; i < 2; i++) {
          const swan = r[`swan${i}`];
          if (swan) {
            swan.position.x = -0.5 + i + Math.sin(t * 0.4 + i * 2.2) * 0.4;
            swan.position.z = 0.3 - i * 0.7 + Math.cos(t * 0.35 + i) * 0.3;
            swan.rotation.y = Math.sin(t * 0.4 + i * 2.2) * 0.6;
          }
        }
        break;
      case "sheep":
        for (let i = 0; i < 4; i++) {
          const sh = r[`sheep${i}`];
          if (sh) sh.position.y = Math.abs(Math.sin(t * 1.6 + i * 1.9)) * 0.05;
        }
        break;
      case "snowman":
        if (r.head) r.head.rotation.y = Math.sin(t * 0.7 + ph) * 0.3;
        break;
      case "geyser": {
        // erupts every ~6s
        const cycle = (t * 0.16 + ph) % 1;
        const on = cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) : 0;
        if (r.jet) { r.jet.scale.y = 0.05 + on; r.jet.position.y = 0.7 + on * 1.2; }
        if (r.puff) { r.puff.scale.setScalar(0.3 + on * 1.1); r.puff.position.y = 1.6 + on * 1.8; }
        break;
      }
      case "eagleNest": {
        const flap = Math.sin(t * 6 + ph) * 0.5;
        if (r.wingL) r.wingL.rotation.x = flap;
        if (r.wingR) r.wingR.rotation.x = -flap;
        if (r.eagle) r.eagle.position.y = 3.6 + Math.sin(t * 0.9 + ph) * 0.12;
        break;
      }
      case "volcano":
        if (r.lava) ((r.lava as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 2.4 + ph) * 0.6;
        for (let i = 0; i < 3; i++) {
          const puff = r[`vsmoke${i}`];
          if (puff) {
            puff.position.y = 3.8 + i * 0.7 + ((t * 0.3 + i * 0.33 + ph) % 1) * 1.4;
            puff.scale.setScalar(0.7 + ((t * 0.3 + i * 0.33 + ph) % 1) * 0.8);
          }
        }
        break;
      case "balloons":
        for (let i = 0; i < 3; i++) {
          const b = r[`balloon${i}`];
          if (b) { b.position.y = i * 0.8 + Math.sin(t * 0.6 + i * 1.8) * 0.5; b.rotation.y = t * 0.15 + i; }
        }
        break;
      case "birdFlock":
        for (let i = 0; i < 5; i++) {
          const b = r[`fbird${i}`];
          if (b) {
            const flapB = Math.sin(t * 7 + i * 0.9) * 0.55;
            const wl = b.getObjectByName("wingL");
            const wr = b.getObjectByName("wingR");
            if (wl) wl.rotation.x = flapB;
            if (wr) wr.rotation.x = -flapB;
            b.position.y = -Math.ceil(i / 2) * 0.15 + Math.sin(t * 1.3 + i) * 0.14;
          }
        }
        break;
      case "skyRings":
        for (let i = 0; i < 3; i++) {
          const ring = r[`ring${i}`];
          if (ring) {
            ring.rotation.y = Math.sin(t * 0.7 + i) * 0.3;
            const m = (ring as THREE.Mesh).material as THREE.MeshStandardMaterial;
            m.emissiveIntensity = 0.7 + (Math.sin(t * 2.4 + i * 2) * 0.5 + 0.5) * 0.6;
          }
        }
        break;
      case "cloudCastle":
        for (let i = 0; i < 6; i++) {
          const p = r[`cloudpuff${i}`];
          if (p) p.position.x += Math.sin(t * 0.4 + i * 1.3) * 0.002;
        }
        break;
      case "rainbow":
        if (r.arc) {
          for (const child of s.group.children) {
            const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
            if (m && m.transparent) m.opacity = 0.72 + Math.sin(t * 1.6 + ph) * 0.14;
          }
        }
        break;
      case "blueLake":
      case "riverBridge":
        if (r.water) {
          const w = 1 + Math.sin(t * 1.8 + ph) * 0.01;
          r.water.scale.set(w, 1, w);
        }
        break;
      case "viewpoint":
        if (r.scope) r.scope.rotation.y = Math.sin(t * 0.5 + ph) * 0.7;
        break;
      default:
        break;
    }

    // tap reaction bounce
    if (s.react > 0) {
      s.react = Math.max(0, s.react - dt);
      const p = 1 - s.react / 1.2;
      const bump = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.12;
      s.group.scale.setScalar(1 + bump);
      if (s.react === 0) s.group.scale.setScalar(1);
    }
  }

  // ─── Main loop ──────────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = performance.now() / 1000;
    const motion = this.reducedMotion ? 0.25 : 1;

    // drive the loop
    this.angle += this.baseSpeed * this.speedMult * motion * dt;
    const a = this.angle;
    const px = Math.cos(a) * TRACK_R;
    const pz = Math.sin(a) * TRACK_R;
    // tangent (direction of travel for increasing angle)
    const tx = -Math.sin(a);
    const tz = Math.cos(a);

    // vehicle pose
    const bob = this.reducedMotion ? 0 : Math.sin(t * (this.kind === "plane" ? 1.4 : 7)) * (this.kind === "plane" ? 0.3 : 0.035);
    const vy = this.kind === "plane" ? this.flyH + bob : bob;
    this.vehicle.position.set(px, vy, pz);
    // vehicles are built facing +X; yaw maps +X onto the travel tangent
    this.vehicle.rotation.set(0, Math.atan2(-tz, tx), 0);
    if (this.kind === "plane") {
      this.vehicle.rotation.z = 0.14; // gentle bank into the turn
      this.vehicle.rotation.x = Math.sin(t * 0.7) * 0.03;
    }

    // vehicle life
    const r = this.vehicleRig;
    if (this.kind === "car") {
      const spin = this.baseSpeed * this.speedMult * TRACK_R * dt / 0.28;
      for (const name of ["wheelFL", "wheelFR", "wheelBL", "wheelBR"]) {
        if (r[name]) r[name].rotateY(spin); // local Y = the axle after the π/2 tilt
      }
    } else if (this.kind === "train") {
      const spin = this.baseSpeed * this.speedMult * TRACK_R * dt / 0.3;
      for (const k of Object.keys(r)) if (k.startsWith("wheel")) r[k].rotateY(spin);
      // coaches swing slightly on curves
      for (let c = 0; c < 2; c++) {
        const coach = r[`coach${c}`];
        if (coach) coach.rotation.y = Math.sin(t * 1.2 + c) * 0.02 + 0.13 + c * 0.11; // curve articulation
      }
      // smoke puffs
      if (!this.reducedMotion) {
        this.smokeTimer -= dt;
        if (this.smokeTimer <= 0) {
          this.smokeTimer = 0.5;
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({
            map: makeGlowTexture("rgba(240,240,245,0.85)", "rgba(240,240,245,0)", 64),
            transparent: true, depthWrite: false,
          }));
          const chim = r.chimney;
          if (chim) {
            const wp = new THREE.Vector3();
            chim.getWorldPosition(wp);
            sp.position.copy(wp).add(new THREE.Vector3(0, 0.4, 0));
            sp.scale.set(0.8, 0.8, 1);
            this.scene.add(sp);
            this.smoke.push({ sprite: sp, age: 0 });
          }
        }
      }
    } else if (this.kind === "plane") {
      if (r.prop) r.prop.rotation.x += dt * 30 * this.speedMult;
    }
    // fade smoke
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.age += dt;
      s.sprite.position.y += dt * 0.9;
      const k = 1 + s.age * 1.4;
      s.sprite.scale.set(0.8 * k, 0.8 * k, 1);
      s.sprite.material.opacity = Math.max(0, 0.85 - s.age * 0.5);
      if (s.age > 1.8) {
        this.scene.remove(s.sprite);
        this.smoke.splice(i, 1);
      }
    }

    // sights: idle life, reactions, proximity pulse + announce
    for (const s of this.sights) {
      this.animateSight(s, this.reducedMotion ? 0 : t, dt);
      // angular distance to vehicle
      let da = Math.abs(((s.angle - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (da > Math.PI) da = Math.PI * 2 - da;
      const near = da < 0.24;
      if (!this.discovered.has(s.spec.id)) {
        const pulse = near ? 1.5 + Math.sin(t * 5) * 0.3 : 1.5;
        s.mystery.scale.setScalar(pulse);
        if (near && !s.announced) {
          s.announced = true;
          this.onNearSight?.(s.spec.id);
        }
        if (!near) s.announced = false;
      }
    }

    // trees sway, clouds drift, birds circle
    if (!this.reducedMotion) {
      this.trees.forEach((tr, i) => {
        const crown = tr.children[1];
        if (crown) crown.rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.05;
      });
      for (const c of this.clouds) {
        c.position.x += dt * 0.35;
        if (c.position.x > 130) c.position.x = -130;
      }
      this.birds.forEach((b) => {
        const u = b.userData as { r: number; h: number; ph: number; sp: number };
        const ba = t * u.sp + u.ph;
        b.position.set(Math.cos(ba) * u.r, u.h + Math.sin(t * 0.8 + u.ph) * 0.5, Math.sin(ba) * u.r);
        b.rotation.y = -ba;
        const flap = Math.sin(t * 8 + u.ph) * 0.5;
        const wl = b.getObjectByName("wingL");
        const wr = b.getObjectByName("wingR");
        if (wl) wl.rotation.x = flap;
        if (wr) wr.rotation.x = -flap;
      });
    }

    // chase camera: behind + above the vehicle, with user orbit offsets.
    // The plane keeps the camera almost level with it so the horizon stays
    // in frame and the flight altitude actually reads as altitude.
    const backA = Math.atan2(tz, tx) + Math.PI + this.userYaw; // behind along -tangent
    const height = this.kind === "plane"
      ? this.flyH + 0.6 + this.camDist * 0.1 + this.userPitch * 6
      : 1.9 + this.camDist * 0.18 + this.userPitch * 6;
    this.camera.position.set(
      px + Math.cos(backA) * this.camDist,
      height,
      pz + Math.sin(backA) * this.camDist
    );
    this.camera.lookAt(
      px + tx * 6,
      vy + (this.kind === "plane" ? 1.4 : 1),
      pz + tz * 6
    );

    this.renderer.render(this.scene, this.camera);
  };
}
