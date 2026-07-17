// The deep-sea expedition engine: one special area per scene — a shipwreck,
// a kelp forest, a glowing cave, a sunken city or hydrothermal vents. The
// child explores as a little yellow submarine (headlights on!) or a diver
// (fins kicking, bubbles rising). Every find is tappable with its own
// reaction: nets tear free, chests pop open, pollution sparkles away.
// Whales, dolphins and a friendly giant squid pass by in the blue distance.

import * as THREE from "three";
import type { DeepSeaAreaSpec, DeepSeaFindSpec, DiveCraftId } from "../data/deepSea";
import { findsFor } from "../data/deepSea";
import { makeTextSprite, makeGlowTexture, mulberry32 } from "./proceduralTextures";

export interface DeepSeaPick {
  id: string;
  screenX: number;
  screenY: number;
}

export interface DeepSeaOptions {
  area: DeepSeaAreaSpec;
  craft: DiveCraftId;
  discovered: Set<string>;
  reducedMotion: boolean;
  onPick: (pick: DeepSeaPick | null) => void;
  /** fired when a visitor event starts (whale / dolphin / squid / glowfish) */
  onEvent?: (kind: "whale" | "dolphin" | "squid" | "glowfish") => void;
}

interface FindNode {
  spec: DeepSeaFindSpec;
  group: THREE.Group;
  rig: Record<string, THREE.Object3D>;
  label: THREE.Sprite;
  mystery: THREE.Sprite;
  react: number;
  phase: number;
}

interface AmbientFish {
  mesh: THREE.Group;
  center: THREE.Vector3;
  radius: number;
  speed: number;
  angle: number;
  bobPhase: number;
}

function mat(color: string | number, opts?: { rough?: number; metal?: number; emissive?: string; emissiveI?: number; flat?: boolean }) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: opts?.flat ?? true,
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

function simpleFish(color: string, size = 0.3): THREE.Group {
  const g = new THREE.Group();
  const body = sphere(size, mat(color, { rough: 0.6 }), 8);
  body.scale.set(1.6, 1, 0.7);
  g.add(body);
  const tail = cone(size * 0.6, size * 0.9, mat(color, { rough: 0.6 }), 5);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -size * 1.8;
  tail.name = "tail";
  g.add(tail);
  return g;
}

const FLOOR_Y = -6.5;
const CAM_MIN = 7;
const CAM_MAX = 20;

export class DeepSeaScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private finds: FindNode[] = [];
  private findById = new Map<string, FindNode>();
  private craft = new THREE.Group();
  private kelps: THREE.Group[] = [];
  private rays: THREE.Mesh[] = [];
  private particles: THREE.Points | null = null;
  private bubbles: THREE.Mesh[] = [];
  private craftBubbles: { sprite: THREE.Sprite; age: number }[] = [];
  private craftBubbleTimer = 0;
  private ambientFish: AmbientFish[] = [];
  private ventPuffs: { mesh: THREE.Mesh; base: THREE.Vector3; ph: number }[] = [];

  // visitor events
  private visitor: THREE.Group | null = null;
  private visitorKind: "whale" | "dolphin" | "squid" | "glowfish" | null = null;
  private visitorT = 0;
  private nextEventIn = 11;

  private isDark: boolean;
  private onPick: (pick: DeepSeaPick | null) => void;
  private onEvent?: (kind: "whale" | "dolphin" | "squid" | "glowfish") => void;
  private reducedMotion: boolean;
  private discovered: Set<string>;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartCam = 0;
  private moved = 0;
  private downTime = 0;
  private camYaw = 0;
  private camPitch = -0.3;
  private camDist = 15;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: DeepSeaOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.onEvent = opts.onEvent;
    this.reducedMotion = opts.reducedMotion;
    this.discovered = new Set(opts.discovered);
    this.isDark = !!opts.area.dark;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    const water = new THREE.Color(opts.area.water);
    this.scene = new THREE.Scene();
    this.scene.background = water;
    this.scene.fog = new THREE.FogExp2(water, opts.area.fog);

    this.camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      600
    );

    // lights
    if (this.isDark) {
      this.scene.add(new THREE.AmbientLight(0x9db2e8, 0.95));
      const dim = new THREE.DirectionalLight(0x5a7ab0, 0.6);
      dim.position.set(0, 12, 5);
      this.scene.add(dim);
      const rim = new THREE.DirectionalLight(0x3a5a92, 0.4);
      rim.position.set(-6, -3, -8);
      this.scene.add(rim);
    } else {
      this.scene.add(new THREE.AmbientLight(0xd9ecff, 0.95));
      const sun = new THREE.DirectionalLight(0xfff6dc, 1.25);
      sun.position.set(5, 20, 6);
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight(0x9fd0ff, 0.35);
      fill.position.set(-6, 6, -7);
      this.scene.add(fill);
    }

    this.buildWater(opts.area);
    this.buildArea(opts.area);
    this.buildFinds(opts.area);
    this.buildAmbientFish(opts.area);
    this.buildCraft(opts.craft);
    this.scene.add(this.craft);

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

  // ─── Water atmosphere ───────────────────────────────────────────────────────

  private buildWater(area: DeepSeaAreaSpec) {
    const rng = mulberry32(area.id.length * 9 + 2);

    if (!this.isDark) {
      for (let i = 0; i < 7; i++) {
        const ray = new THREE.Mesh(
          new THREE.ConeGeometry(2.2 + rng() * 2, 26, 6, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xfffbe8,
            transparent: true,
            opacity: 0.06,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          })
        );
        ray.position.set((rng() - 0.5) * 34, 12, (rng() - 0.5) * 30 - 4);
        ray.rotation.z = (rng() - 0.5) * 0.16;
        this.scene.add(ray);
        this.rays.push(ray);
      }
    }

    // drifting marine snow
    const COUNT = 320;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rng() - 0.5) * 46;
      positions[i * 3 + 1] = (rng() - 0.5) * 26;
      positions[i * 3 + 2] = (rng() - 0.5) * 46;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: this.isDark ? 0x9fd8ff : 0xffffff,
        size: this.isDark ? 2.3 : 1.7,
        sizeAttenuation: false,
        transparent: true,
        opacity: this.isDark ? 0.6 : 0.45,
        depthWrite: false,
      })
    );
    this.scene.add(this.particles);

    // rising bubbles
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xdff3ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.2,
    });
    for (let i = 0; i < 14; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rng() * 0.1, 8, 8), bubbleMat);
      b.position.set((rng() - 0.5) * 26, -8 + rng() * 16, (rng() - 0.5) * 26);
      b.userData.speed = 0.8 + rng() * 1.4;
      this.scene.add(b);
      this.bubbles.push(b);
    }

    // sea floor
    const floorColor = area.id === "kelp" ? "#37604a" : area.id === "ruins" ? "#c9b98a" : area.id === "cave" ? "#37305c" : area.id === "vents" ? "#26263a" : "#50656f";
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(48, 40),
      new THREE.MeshStandardMaterial({ color: floorColor, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR_Y - 0.5;
    this.scene.add(floor);

    // scattered rocks
    for (let i = 0; i < 14; i++) {
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.4 + rng() * 0.9, 0),
        mat("#4c566a", { rough: 1 })
      );
      const a = rng() * Math.PI * 2;
      const d = 6 + rng() * 26;
      rock.position.set(Math.cos(a) * d, FLOOR_Y - 0.25, Math.sin(a) * d);
      rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      this.scene.add(rock);
    }
  }

  // ─── Area centerpieces ──────────────────────────────────────────────────────

  private buildArea(area: DeepSeaAreaSpec) {
    const rng = mulberry32(area.id.charCodeAt(0) * 5 + 1);
    if (area.id === "wreck") {
      // broken hull: two halves, tilted masts, railing
      const wood = mat("#8a6d47", { rough: 0.95 });
      const hull = new THREE.Group();
      const bodyW = cyl(2.4, 3.2, 9, wood, 10);
      bodyW.rotation.z = Math.PI / 2;
      bodyW.scale.y = 0.62;
      bodyW.position.y = 1.2;
      hull.add(bodyW);
      const deck = box(9, 0.3, 2.9, mat("#9c7f55", { rough: 0.95 }));
      deck.position.y = 3.0;
      hull.add(deck);
      const mast = cyl(0.16, 0.22, 7, wood, 8);
      mast.position.set(1.2, 5.5, 0);
      mast.rotation.z = -0.5;
      hull.add(mast);
      const crossbeam = cyl(0.09, 0.09, 3.4, wood, 6);
      crossbeam.rotation.z = Math.PI / 2 - 0.5;
      crossbeam.position.set(2.4, 6.6, 0);
      hull.add(crossbeam);
      const sail = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.2),
        new THREE.MeshStandardMaterial({ color: "#cbd5d1", side: THREE.DoubleSide, transparent: true, opacity: 0.65, roughness: 0.9 })
      );
      sail.position.set(2.3, 5.6, 0.1);
      sail.rotation.y = 0.3;
      sail.name = "sail";
      hull.add(sail);
      // hole in the hull
      const hole = cyl(1.1, 1.1, 0.6, mat("#0c1622"), 12);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(-2.2, 1.4, 1.45);
      hull.add(hole);
      hull.position.set(0, FLOOR_Y, -4);
      hull.rotation.set(0, 0.5, 0.12);
      this.scene.add(hull);
    } else if (area.id === "kelp") {
      for (let i = 0; i < 22; i++) {
        const strand = new THREE.Group();
        const h = 6 + rng() * 7;
        const segs = 5;
        const green = mat(i % 3 === 0 ? "#2f9e44" : "#3aa86b", { rough: 0.85 });
        for (let j = 0; j < segs; j++) {
          const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, h / segs, 3, 5), green);
          blade.position.y = (j + 0.5) * (h / segs);
          blade.rotation.z = Math.sin(j * 1.2) * 0.14;
          strand.add(blade);
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), green);
          leaf.scale.set(1.7, 0.4, 0.15);
          leaf.position.set(0.3, (j + 0.6) * (h / segs), 0);
          strand.add(leaf);
        }
        const a = rng() * Math.PI * 2;
        const d = 4 + rng() * 18;
        strand.position.set(Math.cos(a) * d, FLOOR_Y, Math.sin(a) * d);
        this.scene.add(strand);
        this.kelps.push(strand);
      }
    } else if (area.id === "cave") {
      // cave walls: big dark rock masses around the back
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.55 + (i / 9) * Math.PI * 1.35;
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(4.5 + rng() * 3, 0),
          mat("#3d3566", { rough: 1 })
        );
        const d = 20 + rng() * 6;
        rock.position.set(Math.cos(a) * d, FLOOR_Y + 2 + rng() * 5, Math.sin(a) * d);
        this.scene.add(rock);
      }
      // ceiling arch hint
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(16, 2.6, 8, 18, Math.PI),
        mat("#453b78", { rough: 1 })
      );
      arch.position.set(0, FLOOR_Y + 2, -10);
      this.scene.add(arch);
    } else if (area.id === "ruins") {
      // plaza + broken colonnade
      const plaza = cyl(9, 9, 0.4, mat("#d0c096", { rough: 0.95 }), 24);
      plaza.position.set(0, FLOOR_Y - 0.1, -2);
      this.scene.add(plaza);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const h = i % 3 === 0 ? 2 + rng() * 1.2 : 4.6;
        const col = cyl(0.42, 0.5, h, mat("#e0d4ae", { rough: 0.9 }), 9);
        col.position.set(Math.cos(a) * 7, FLOOR_Y + h / 2, Math.sin(a) * 7 - 2);
        this.scene.add(col);
        if (h > 4) {
          const cap = box(1.2, 0.35, 1.2, mat("#d6c9a0"));
          cap.position.set(Math.cos(a) * 7, FLOOR_Y + h + 0.18, Math.sin(a) * 7 - 2);
          this.scene.add(cap);
        }
      }
    } else if (area.id === "vents") {
      for (let i = 0; i < 6; i++) {
        const a = rng() * Math.PI * 2;
        const d = 7 + rng() * 14;
        const vx = Math.cos(a) * d;
        const vz = Math.sin(a) * d;
        const vent = cone(0.8 + rng() * 0.5, 2.6 + rng() * 1.8, mat("#1f1a17", { rough: 1 }), 7);
        vent.position.set(vx, FLOOR_Y + 1.4, vz);
        this.scene.add(vent);
        const glow = new THREE.PointLight(0xff5a2a, 6, 8, 2);
        glow.position.set(vx, FLOOR_Y + 3.1, vz);
        this.scene.add(glow);
        // smoke column
        for (let j = 0; j < 3; j++) {
          const puff = sphere(0.35 + j * 0.14, mat("#2c2c34", { rough: 1 }), 7);
          const base = new THREE.Vector3(vx, FLOOR_Y + 3 + j * 0.9, vz);
          puff.position.copy(base);
          this.scene.add(puff);
          this.ventPuffs.push({ mesh: puff, base, ph: rng() * Math.PI * 2 + j });
        }
      }
    }
  }

  // ─── Find builders ──────────────────────────────────────────────────────────

  private buildFindMesh(spec: DeepSeaFindSpec): THREE.Group {
    const g = new THREE.Group();
    const rng = mulberry32(spec.id.length * 7 + spec.id.charCodeAt(3));
    const gold = mat("#f4c141", { metal: 0.7, rough: 0.3, emissive: "#b8860b", emissiveI: 0.4 });
    switch (spec.kind) {
      case "chest": {
        const base = box(1.3, 0.7, 0.9, mat("#6e4a2a", { rough: 0.9 }));
        base.position.y = 0.35;
        g.add(base);
        const lid = new THREE.Group();
        const lidM = box(1.3, 0.35, 0.9, mat("#5d3a1e", { rough: 0.9 }));
        lidM.position.set(0, 0.17, -0.45);
        lid.add(lidM);
        lid.position.set(0, 0.7, 0.45);
        lid.name = "lid";
        g.add(lid);
        const band = box(1.36, 0.72, 0.14, gold);
        band.position.y = 0.35;
        g.add(band);
        const glowT = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(255,214,110,0.9)", "rgba(255,214,110,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        glowT.position.y = 0.9;
        glowT.scale.set(0.01, 0.01, 1);
        glowT.name = "treasureGlow";
        g.add(glowT);
        const coins = sphere(0.4, gold, 8);
        coins.scale.y = 0.4;
        coins.position.y = 0.62;
        coins.visible = false;
        coins.name = "coins";
        g.add(coins);
        break;
      }
      case "anchor": {
        const shaft = cyl(0.09, 0.09, 1.8, mat("#3d4653", { metal: 0.6, rough: 0.55 }), 8);
        shaft.position.y = 1.0;
        g.add(shaft);
        const armsA = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.09, 8, 14, Math.PI), mat("#3d4653", { metal: 0.6, rough: 0.55 }));
        armsA.rotation.z = Math.PI;
        armsA.position.y = 0.5;
        g.add(armsA);
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 12), mat("#3d4653", { metal: 0.6 }));
        ringA.position.y = 2.0;
        g.add(ringA);
        const bar = cyl(0.05, 0.05, 0.8, mat("#3d4653", { metal: 0.6 }), 6);
        bar.rotation.z = Math.PI / 2;
        bar.position.y = 1.66;
        g.add(bar);
        g.rotation.z = 0.35;
        break;
      }
      case "bell": {
        const frame = box(0.14, 1.6, 0.14, mat("#5d4a33"));
        frame.position.y = 0.8;
        g.add(frame);
        const top = box(1.0, 0.14, 0.14, mat("#5d4a33"));
        top.position.y = 1.6;
        g.add(top);
        const bell = new THREE.Group();
        const cup = cone(0.42, 0.7, mat("#b8863b", { metal: 0.75, rough: 0.3, emissive: "#7a5218", emissiveI: 0.25 }), 12);
        cup.position.y = -0.2;
        bell.add(cup);
        const clapper = sphere(0.09, gold, 8);
        clapper.position.y = -0.55;
        bell.add(clapper);
        bell.position.set(0.3, 1.55, 0);
        bell.name = "bell";
        g.add(bell);
        break;
      }
      case "wheel": {
        const stand = cyl(0.12, 0.18, 1.0, mat("#5d4a33"), 8);
        stand.position.y = 0.5;
        g.add(stand);
        const wheelG = new THREE.Group();
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 20), mat("#6e4a2a", { rough: 0.85 }));
        wheelG.add(rim);
        for (let i = 0; i < 8; i++) {
          const spoke = cyl(0.045, 0.045, 1.9, mat("#7a5230"), 6);
          spoke.rotation.z = (i / 8) * Math.PI;
          wheelG.add(spoke);
        }
        wheelG.position.y = 1.45;
        wheelG.name = "wheel";
        g.add(wheelG);
        break;
      }
      case "cannon": {
        const barrel = cyl(0.18, 0.3, 1.7, mat("#2f3743", { metal: 0.6, rough: 0.5 }), 10);
        barrel.rotation.z = -1.15;
        barrel.position.y = 0.7;
        g.add(barrel);
        const wheelL = cyl(0.32, 0.32, 0.12, mat("#5d4a33"), 10);
        wheelL.rotation.x = Math.PI / 2;
        wheelL.position.set(0, 0.32, 0.3);
        g.add(wheelL);
        const wheelR = wheelL.clone();
        wheelR.position.z = -0.3;
        g.add(wheelR);
        const fishC = simpleFish("#fb923c", 0.12);
        fishC.position.set(0.75, 1.25, 0);
        fishC.name = "peekFish";
        g.add(fishC);
        break;
      }
      case "portOctopus": {
        const plate = cyl(0.55, 0.55, 0.16, mat("#4a3a28", { rough: 0.9 }), 14);
        plate.rotation.x = Math.PI / 2;
        plate.position.y = 1.0;
        g.add(plate);
        const ringP = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 18), mat("#8a6a3c", { metal: 0.5, rough: 0.4 }));
        ringP.position.y = 1.0;
        g.add(ringP);
        const head = sphere(0.4, mat("#9333ea", { rough: 0.6 }), 12);
        head.position.set(0, 1.05, 0.25);
        head.name = "octoHead";
        g.add(head);
        for (const s of [-1, 1]) {
          const eye = sphere(0.07, mat("#ffffff"), 6);
          eye.position.set(s * 0.16, 1.2, 0.55);
          g.add(eye);
          const pupil = sphere(0.035, mat("#1f2937"), 5);
          pupil.position.set(s * 0.16, 1.2, 0.61);
          g.add(pupil);
        }
        for (let i = 0; i < 4; i++) {
          const armO = cyl(0.05, 0.02, 0.7, mat("#a855f7", { rough: 0.6 }), 6);
          armO.position.set(-0.3 + i * 0.2, 0.62, 0.35);
          armO.rotation.x = 0.5;
          armO.name = `octoArm${i}`;
          g.add(armO);
        }
        break;
      }
      case "trappedTurtle": {
        const turtle = new THREE.Group();
        const shell = sphere(0.55, mat("#4d7c0f", { rough: 0.8 }), 10);
        shell.scale.set(1.25, 0.55, 1);
        turtle.add(shell);
        const headT = sphere(0.2, mat("#84a94e"), 8);
        headT.position.set(0.75, 0.05, 0);
        turtle.add(headT);
        for (const [dx, dz] of [[0.45, 0.5], [0.45, -0.5], [-0.45, 0.5], [-0.45, -0.5]]) {
          const flip = sphere(0.18, mat("#84a94e"), 6);
          flip.scale.set(1.6, 0.3, 0.8);
          flip.position.set(dx, -0.05, dz);
          flip.name = `flip${dx > 0 ? "F" : "B"}${dz > 0 ? "L" : "R"}`;
          turtle.add(flip);
        }
        turtle.position.y = 1.1;
        turtle.name = "turtle";
        g.add(turtle);
        // the net: a wireframe shell around the turtle
        const net = new THREE.Mesh(
          new THREE.SphereGeometry(1.0, 8, 6),
          new THREE.MeshBasicMaterial({ color: "#d8d2c2", wireframe: true, transparent: true, opacity: 0.85 })
        );
        net.position.y = 1.1;
        net.scale.set(1.25, 0.8, 1.05);
        net.name = "net";
        g.add(net);
        break;
      }
      case "bottles": {
        for (let i = 0; i < 4; i++) {
          const bottle = new THREE.Group();
          const bodyB = cyl(0.11, 0.13, 0.42, mat(["#7fb2c9", "#9fc98a", "#c9b47f", "#b28ac9"][i], { rough: 0.3, metal: 0.1 }), 8);
          bodyB.position.y = 0.21;
          bottle.add(bodyB);
          const neck = cyl(0.05, 0.06, 0.16, mat("#7fb2c9", { rough: 0.3 }), 8);
          neck.position.y = 0.5;
          bottle.add(neck);
          bottle.position.set((rng() - 0.5) * 1.8, 0, (rng() - 0.5) * 1.4);
          bottle.rotation.z = (rng() - 0.5) * 1.4;
          bottle.name = `bottle${i}`;
          g.add(bottle);
        }
        const bag = box(0.5, 0.03, 0.4, mat("#e5e7eb", { rough: 0.6 }));
        bag.position.set(0.3, 0.02, 0.5);
        bag.rotation.y = 0.6;
        bag.name = "bottle4";
        g.add(bag);
        const sparkle = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(190,255,220,0.9)", "rgba(190,255,220,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        sparkle.position.y = 0.6;
        sparkle.scale.set(0.01, 0.01, 1);
        sparkle.name = "cleanSparkle";
        g.add(sparkle);
        break;
      }
      case "seahorses": {
        for (let i = 0; i < 3; i++) {
          const sh = new THREE.Group();
          const scale = i === 0 ? 1 : 0.6;
          const bodyS = new THREE.Mesh(new THREE.CapsuleGeometry(0.14 * scale, 0.5 * scale, 4, 8), mat("#eab308", { rough: 0.6 }));
          bodyS.rotation.z = -0.2;
          sh.add(bodyS);
          const headS = sphere(0.12 * scale, mat("#eab308"), 8);
          headS.position.set(0.1 * scale, 0.42 * scale, 0);
          sh.add(headS);
          const snout = cyl(0.035 * scale, 0.045 * scale, 0.22 * scale, mat("#d4a017"), 6);
          snout.rotation.z = Math.PI / 2;
          snout.position.set(0.28 * scale, 0.42 * scale, 0);
          sh.add(snout);
          const tail = new THREE.Mesh(new THREE.TorusGeometry(0.12 * scale, 0.04 * scale, 6, 12, Math.PI * 1.5), mat("#d4a017"));
          tail.position.set(-0.02, -0.42 * scale, 0);
          sh.add(tail);
          sh.position.set(i * 0.6 - 0.6, 1.0 + i * 0.3, i * 0.2);
          sh.name = `horse${i}`;
          g.add(sh);
        }
        break;
      }
      case "kelpCrab": {
        const bodyC = sphere(0.4, mat("#b45309", { rough: 0.8 }), 9);
        bodyC.scale.set(1.3, 0.7, 1);
        bodyC.position.y = 0.4;
        g.add(bodyC);
        for (const s of [-1, 1]) {
          const claw = sphere(0.16, mat("#d97706"), 7);
          claw.position.set(s * 0.6, 0.5, 0.3);
          claw.name = s > 0 ? "clawR" : "clawL";
          g.add(claw);
          for (let i = 0; i < 3; i++) {
            const leg = cyl(0.035, 0.02, 0.5, mat("#92400e"), 5);
            leg.position.set(s * 0.5, 0.25, -0.2 + i * 0.2);
            leg.rotation.z = s * 1.0;
            g.add(leg);
          }
          const eye = sphere(0.05, mat("#1f2937"), 5);
          eye.position.set(s * 0.12, 0.72, 0.35);
          g.add(eye);
        }
        // camouflage kelp bits on the shell
        for (let i = 0; i < 3; i++) {
          const bit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), mat("#3aa86b"));
          bit.scale.set(1.5, 0.3, 0.4);
          bit.position.set(-0.2 + i * 0.2, 0.68, -0.1 + (i % 2) * 0.2);
          g.add(bit);
        }
        break;
      }
      case "anemones": {
        for (let i = 0; i < 4; i++) {
          const an = new THREE.Group();
          const stalk = cyl(0.16, 0.22, 0.3, mat(["#e879f9", "#fb7185", "#f0abfc", "#fda4af"][i], { rough: 0.7 }), 8);
          stalk.position.y = 0.15;
          an.add(stalk);
          for (let j = 0; j < 8; j++) {
            const a = (j / 8) * Math.PI * 2;
            const tent = cyl(0.03, 0.015, 0.45, mat(["#f0abfc", "#fda4af", "#e879f9", "#fb7185"][i], { emissive: "#f0abfc", emissiveI: 0.2 }), 5);
            tent.position.set(Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12);
            tent.rotation.z = -Math.cos(a) * 0.5;
            tent.rotation.x = Math.sin(a) * 0.5;
            tent.name = `tent${i}_${j}`;
            an.add(tent);
          }
          an.position.set((i % 2) * 1.1 - 0.55, 0, Math.floor(i / 2) * 1.1 - 0.55);
          g.add(an);
        }
        break;
      }
      case "sardines": {
        for (let i = 0; i < 9; i++) {
          const f = simpleFish("#cbd5e1", 0.14);
          const a = (i / 9) * Math.PI * 2;
          f.position.set(Math.cos(a) * 0.9, 1.2 + Math.sin(i * 2.1) * 0.5, Math.sin(a) * 0.9);
          f.rotation.y = -a;
          f.name = `sardine${i}`;
          g.add(f);
        }
        break;
      }
      case "crystals": {
        const colors = ["#a78bfa", "#67e8f9", "#f0abfc"];
        for (let i = 0; i < 6; i++) {
          const c = colors[i % 3];
          const crystal = new THREE.Mesh(
            new THREE.ConeGeometry(0.22 + rng() * 0.2, 1.0 + rng() * 1.5, 5),
            mat(c, { rough: 0.2, metal: 0.1, emissive: c, emissiveI: 1.3 })
          );
          crystal.position.set((rng() - 0.5) * 1.8, 0.45, (rng() - 0.5) * 1.6);
          crystal.rotation.z = (rng() - 0.5) * 0.5;
          crystal.name = `crystal${i}`;
          g.add(crystal);
        }
        const glowC = new THREE.PointLight(0xa78bfa, 16, 12, 2);
        glowC.position.y = 1.4;
        g.add(glowC);
        break;
      }
      case "glowfish": {
        const f = simpleFish("#22d3ee", 0.3);
        (f.children[0] as THREE.Mesh).material = mat("#22d3ee", { emissive: "#06b6d4", emissiveI: 1.4, rough: 0.4 });
        f.position.y = 1.4;
        f.name = "gfish";
        g.add(f);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(80,230,255,0.6)", "rgba(80,230,255,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        halo.position.y = 1.4;
        halo.scale.set(1.8, 1.8, 1);
        halo.name = "halo";
        g.add(halo);
        break;
      }
      case "pearls": {
        const shellB = sphere(0.55, mat("#c9b8d8", { rough: 0.5 }), 12);
        shellB.scale.set(1.2, 0.35, 1);
        shellB.position.y = 0.2;
        g.add(shellB);
        const shellT = sphere(0.55, mat("#e2d5ee", { rough: 0.5 }), 12);
        shellT.scale.set(1.2, 0.35, 1);
        shellT.position.y = 0.42;
        shellT.rotation.x = -0.75;
        shellT.name = "shellTop";
        g.add(shellT);
        const pearl = sphere(0.2, mat("#fdf4ff", { rough: 0.15, metal: 0.2, emissive: "#f5d0fe", emissiveI: 0.5 }), 14);
        pearl.position.y = 0.45;
        pearl.name = "pearl";
        g.add(pearl);
        break;
      }
      case "stalactites": {
        for (let i = 0; i < 5; i++) {
          const st = cone(0.2 + rng() * 0.14, 1.2 + rng() * 1.4, mat("#6b6293", { rough: 0.9 }), 6);
          st.rotation.x = Math.PI;
          st.position.set((rng() - 0.5) * 2.4, 3.4 - rng() * 0.5, (rng() - 0.5) * 1.4);
          g.add(st);
          const drip = sphere(0.05, mat("#9fd8ff", { emissive: "#7dd3fc", emissiveI: 0.7 }), 6);
          drip.position.set(st.position.x, 1.6, st.position.z);
          drip.name = `drip${i}`;
          g.add(drip);
        }
        const baseSt = cone(0.4, 1.0, mat("#6b6293", { rough: 0.9 }), 6);
        baseSt.position.y = 0.5;
        g.add(baseSt);
        break;
      }
      case "blindfish": {
        const f = simpleFish("#fbcfe8", 0.32);
        f.position.y = 1.1;
        f.name = "bfish";
        g.add(f);
        break;
      }
      case "caveEntrance": {
        const ringR = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.34, 8, 16), mat("#3b3468", { rough: 1 }));
        ringR.position.y = 1.2;
        g.add(ringR);
        const void1 = cyl(0.95, 0.95, 0.3, mat("#05040f"), 16);
        void1.rotation.x = Math.PI / 2;
        void1.position.y = 1.2;
        g.add(void1);
        const gleam = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(120,180,255,0.35)", "rgba(120,180,255,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        gleam.position.set(0, 1.2, 0.3);
        gleam.scale.set(2, 2, 1);
        gleam.name = "gleam";
        g.add(gleam);
        break;
      }
      case "statue": {
        const plinth = box(1.1, 0.5, 1.1, mat("#d6c9a0", { rough: 0.9 }));
        plinth.position.y = 0.25;
        g.add(plinth);
        const bodyS = cyl(0.32, 0.42, 1.5, mat("#e0d4ae", { rough: 0.85 }), 9);
        bodyS.position.y = 1.25;
        g.add(bodyS);
        const headS = sphere(0.3, mat("#e0d4ae", { rough: 0.85 }), 10);
        headS.position.y = 2.25;
        g.add(headS);
        const armS = cyl(0.11, 0.13, 0.9, mat("#e0d4ae"), 7);
        armS.position.set(0.42, 1.7, 0);
        armS.rotation.z = -1.0;
        g.add(armS);
        // moss patches
        for (let i = 0; i < 3; i++) {
          const moss = sphere(0.14, mat("#3aa86b", { rough: 1 }), 6);
          moss.scale.y = 0.4;
          moss.position.set((rng() - 0.5) * 0.5, 0.6 + rng() * 1.4, 0.3);
          g.add(moss);
        }
        break;
      }
      case "amphora": {
        const bodyA = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), mat("#b8763e", { rough: 0.85 }));
        bodyA.scale.y = 1.35;
        bodyA.position.y = 0.7;
        g.add(bodyA);
        const neckA = cyl(0.16, 0.22, 0.4, mat("#a5622f"), 8);
        neckA.position.y = 1.45;
        g.add(neckA);
        for (const s of [-1, 1]) {
          const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 6, 10, Math.PI), mat("#a5622f"));
          handle.position.set(s * 0.42, 1.15, 0);
          handle.rotation.z = -s * Math.PI / 2;
          g.add(handle);
        }
        g.rotation.z = 0.28;
        break;
      }
      case "crown": {
        const pedestal = cyl(0.5, 0.6, 0.7, mat("#d6c9a0", { rough: 0.9 }), 10);
        pedestal.position.y = 0.35;
        g.add(pedestal);
        const band = cyl(0.4, 0.42, 0.3, gold, 12);
        band.position.y = 0.95;
        band.name = "crownBand";
        g.add(band);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const spike = cone(0.08, 0.3, gold, 5);
          spike.position.set(Math.cos(a) * 0.38, 1.22, Math.sin(a) * 0.38);
          g.add(spike);
        }
        const gem = sphere(0.09, mat("#ef4444", { emissive: "#dc2626", emissiveI: 1.0, rough: 0.2 }), 8);
        gem.position.set(0, 1.02, 0.42);
        g.add(gem);
        const glowCr = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(255,214,110,0.7)", "rgba(255,214,110,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        glowCr.position.y = 1.1;
        glowCr.scale.set(1.6, 1.6, 1);
        glowCr.name = "treasureGlow";
        g.add(glowCr);
        break;
      }
      case "mosaic": {
        const slab = box(2.4, 0.12, 1.8, mat("#d0c096", { rough: 0.95 }));
        slab.position.y = 0.06;
        g.add(slab);
        const colors = ["#2563eb", "#dc2626", "#eab308", "#0d9488", "#7c3aed"];
        for (let x = 0; x < 8; x++) {
          for (let z = 0; z < 6; z++) {
            if ((x + z) % 3 === 0) continue;
            const tile = box(0.22, 0.05, 0.22, mat(colors[(x * 3 + z) % 5], { rough: 0.5 }));
            tile.position.set(-1.05 + x * 0.28, 0.14, -0.75 + z * 0.28);
            g.add(tile);
          }
        }
        break;
      }
      case "archway": {
        for (const s of [-1, 1]) {
          const col = cyl(0.28, 0.34, 2.6, mat("#e0d4ae", { rough: 0.9 }), 9);
          col.position.set(s * 1.1, 1.3, 0);
          g.add(col);
        }
        const archTop = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.26, 8, 14, Math.PI), mat("#d6c9a0", { rough: 0.9 }));
        archTop.position.y = 2.6;
        g.add(archTop);
        const fishA = simpleFish("#fbbf24", 0.16);
        fishA.position.set(0, 1.6, 0);
        fishA.name = "archFish";
        g.add(fishA);
        break;
      }
      case "coins": {
        const pile = sphere(0.7, gold, 10);
        pile.scale.y = 0.32;
        pile.position.y = 0.22;
        g.add(pile);
        for (let i = 0; i < 7; i++) {
          const coin = cyl(0.12, 0.12, 0.03, gold, 10);
          coin.position.set((rng() - 0.5) * 1.4, 0.45 + rng() * 0.12, (rng() - 0.5) * 1.2);
          coin.rotation.x = (rng() - 0.5) * 1.2;
          g.add(coin);
        }
        const glowCo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(255,214,110,0.65)", "rgba(255,214,110,0)", 128),
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        glowCo.position.y = 0.6;
        glowCo.scale.set(1.8, 1.4, 1);
        glowCo.name = "treasureGlow";
        g.add(glowCo);
        break;
      }
      case "smoker": {
        const chimneyS = cone(0.65, 2.8, mat("#1f1a17", { rough: 1 }), 7);
        chimneyS.position.y = 1.4;
        g.add(chimneyS);
        const mouth = cyl(0.3, 0.36, 0.3, mat("#3a2c22", { emissive: "#ff5a2a", emissiveI: 0.8 }), 8);
        mouth.position.y = 2.85;
        g.add(mouth);
        for (let i = 0; i < 3; i++) {
          const puff = sphere(0.3 + i * 0.12, mat("#26262e", { rough: 1 }), 7);
          puff.position.y = 3.2 + i * 0.8;
          puff.name = `spuff${i}`;
          g.add(puff);
        }
        break;
      }
      case "ventShrimp": {
        for (let i = 0; i < 5; i++) {
          const shr = new THREE.Group();
          const bodySh = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.25, 4, 6), mat("#fda4af", { rough: 0.6 }));
          bodySh.rotation.z = 0.6;
          shr.add(bodySh);
          const tailSh = cone(0.07, 0.14, mat("#fb7185"), 5);
          tailSh.position.set(-0.16, -0.12, 0);
          tailSh.rotation.z = 2.2;
          shr.add(tailSh);
          shr.position.set((rng() - 0.5) * 1.6, 0.3 + rng() * 1.2, (rng() - 0.5) * 1.2);
          shr.name = `shrimp${i}`;
          g.add(shr);
        }
        break;
      }
      case "tubeWorms": {
        for (let i = 0; i < 6; i++) {
          const h = 1.1 + rng() * 0.8;
          const tube = cyl(0.09, 0.12, h, mat("#e8e0d0", { rough: 0.85 }), 7);
          tube.position.set((rng() - 0.5) * 1.6, h / 2, (rng() - 0.5) * 1.2);
          g.add(tube);
          const plume = sphere(0.13, mat("#ef4444", { emissive: "#dc2626", emissiveI: 0.6, rough: 0.5 }), 7);
          plume.position.set(tube.position.x, h + 0.06, tube.position.z);
          plume.name = `plume${i}`;
          g.add(plume);
        }
        break;
      }
      case "researchDome": {
        const domeD = new THREE.Mesh(
          new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({ color: "#bfe3ff", transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide })
        );
        g.add(domeD);
        const baseD = cyl(1.55, 1.7, 0.4, mat("#4b5563", { metal: 0.5, rough: 0.5 }), 18);
        baseD.position.y = 0.05;
        g.add(baseD);
        const lab = box(1.0, 0.7, 0.7, mat("#f8fafc", { rough: 0.4 }));
        lab.position.y = 0.55;
        g.add(lab);
        const screenL = box(0.5, 0.35, 0.05, mat("#0e7490", { emissive: "#22d3ee", emissiveI: 0.9 }));
        screenL.position.set(0, 0.65, 0.38);
        screenL.name = "labScreen";
        g.add(screenL);
        const beaconD = sphere(0.12, mat("#fbbf24", { emissive: "#f59e0b", emissiveI: 1.6 }), 8);
        beaconD.position.y = 1.65;
        beaconD.name = "beacon";
        g.add(beaconD);
        break;
      }
      case "diveRobot": {
        const bodyR = box(0.9, 0.6, 0.6, mat("#fbbf24", { rough: 0.4, metal: 0.2 }));
        bodyR.position.y = 1.1;
        bodyR.name = "robotBody";
        g.add(bodyR);
        const eye = sphere(0.14, mat("#22d3ee", { emissive: "#06b6d4", emissiveI: 1.4 }), 10);
        eye.position.set(0.46, 1.2, 0);
        g.add(eye);
        for (const s of [-1, 1]) {
          const thruster = cyl(0.12, 0.15, 0.25, mat("#374151", { metal: 0.5 }), 8);
          thruster.rotation.z = Math.PI / 2;
          thruster.position.set(-0.5, 1.1, s * 0.25);
          g.add(thruster);
        }
        const armR = cyl(0.045, 0.045, 0.6, mat("#9ca3af", { metal: 0.6 }), 6);
        armR.position.set(0.3, 0.7, 0);
        armR.rotation.z = 0.5;
        armR.name = "robotArm";
        g.add(armR);
        const lightCone = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.6, 12, 1, true),
          new THREE.MeshBasicMaterial({ color: "#fff7cc", transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
        );
        lightCone.rotation.z = Math.PI / 2 + 0.3;
        lightCone.position.set(1.3, 1.0, 0);
        g.add(lightCone);
        break;
      }
      case "giantClam": {
        const bottom = sphere(0.8, mat("#7c9a8e", { rough: 0.8 }), 12);
        bottom.scale.set(1.25, 0.4, 1);
        bottom.position.y = 0.3;
        g.add(bottom);
        const top = sphere(0.8, mat("#8fb3a5", { rough: 0.8 }), 12);
        top.scale.set(1.25, 0.4, 1);
        top.position.y = 0.55;
        top.rotation.x = -0.55;
        top.name = "clamTop";
        g.add(top);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 8, 18, Math.PI * 2), mat("#3b82f6", { emissive: "#2563eb", emissiveI: 0.5 }));
        lip.rotation.x = Math.PI / 2;
        lip.position.y = 0.48;
        lip.scale.set(1.2, 1, 0.95);
        g.add(lip);
        break;
      }
    }
    return g;
  }

  private buildFinds(area: DeepSeaAreaSpec) {
    const list = findsFor(area.id);
    const rng = mulberry32(area.id.charCodeAt(1) * 7 + 3);
    const R = 7.5;
    list.forEach((spec, i) => {
      const group = this.buildFindMesh(spec);
      const a = (i / list.length) * Math.PI * 2 + 0.4 + rng() * 0.3;
      const d = R + (rng() - 0.5) * 3;
      group.position.set(Math.cos(a) * d, FLOOR_Y, Math.sin(a) * d);
      group.rotation.y = -a + Math.PI / 2;
      group.traverse((o) => { o.userData.findId = spec.id; });

      const bounds = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(1.4, size.y * 0.75), 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = size.y * 0.5;
      hit.userData.findId = spec.id;
      group.add(hit);

      const labelY = FLOOR_Y + size.y + 1.0;
      const label = makeTextSprite(spec.nameHebrew, { fontSize: 54 });
      label.scale.multiplyScalar(2.1);
      const mystery = makeTextSprite("❓", { fontSize: 56, color: "#b5f3ff", stroke: "rgba(6,40,66,0.9)" });
      mystery.scale.multiplyScalar(1.15);
      const found = this.discovered.has(spec.id);
      label.visible = found;
      mystery.visible = !found;
      label.position.set(group.position.x, labelY, group.position.z);
      mystery.position.copy(label.position);
      this.scene.add(label, mystery);

      const rig: Record<string, THREE.Object3D> = {};
      group.traverse((o) => { if (o.name) rig[o.name] = o; });

      this.scene.add(group);
      const node: FindNode = { spec, group, rig, label, mystery, react: 0, phase: rng() * Math.PI * 2 };
      this.finds.push(node);
      this.findById.set(spec.id, node);
      if (found) this.applyResolvedState(node);
    });
  }

  /** Visual end-state for special finds that were already discovered. */
  private applyResolvedState(n: FindNode) {
    const r = n.rig;
    if (n.spec.special === "rescue" && r.net) r.net.visible = false;
    if (n.spec.special === "clean") {
      for (let i = 0; i < 5; i++) if (r[`bottle${i}`]) r[`bottle${i}`].visible = false;
    }
    if (n.spec.kind === "chest") {
      if (r.lid) r.lid.rotation.x = -1.9;
      if (r.coins) r.coins.visible = true;
      if (r.treasureGlow) r.treasureGlow.scale.set(2.6, 2.6, 1);
    }
  }

  private buildAmbientFish(area: DeepSeaAreaSpec) {
    const rng = mulberry32(area.id.length * 3 + 8);
    const colors = area.dark
      ? ["#67e8f9", "#a5b4fc", "#f0abfc"]
      : ["#fbbf24", "#60a5fa", "#f87171", "#34d399", "#e2e8f0"];
    const n = 10;
    for (let i = 0; i < n; i++) {
      const f = simpleFish(colors[Math.floor(rng() * colors.length)], 0.16 + rng() * 0.16);
      if (area.dark) {
        const bodyMesh = f.children[0] as THREE.Mesh;
        (bodyMesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color("#3b82f6");
        (bodyMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
      }
      this.scene.add(f);
      this.ambientFish.push({
        mesh: f,
        center: new THREE.Vector3((rng() - 0.5) * 16, -2 + rng() * 5, (rng() - 0.5) * 16),
        radius: 2 + rng() * 4,
        speed: (0.3 + rng() * 0.5) * (rng() > 0.5 ? 1 : -1),
        angle: rng() * Math.PI * 2,
        bobPhase: rng() * Math.PI * 2,
      });
    }
  }

  // ─── The craft (submarine / diver) ─────────────────────────────────────────

  private buildCraft(kind: DiveCraftId) {
    const g = this.craft;
    if (kind === "sub") {
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.3, 6, 12), mat("#fbbf24", { rough: 0.35, metal: 0.15 }));
      hull.rotation.z = Math.PI / 2;
      g.add(hull);
      const tower = cyl(0.26, 0.3, 0.4, mat("#f59e0b", { rough: 0.4 }), 10);
      tower.position.y = 0.62;
      g.add(tower);
      const scope = cyl(0.04, 0.04, 0.4, mat("#374151", { metal: 0.5 }), 6);
      scope.position.y = 0.95;
      g.add(scope);
      const scopeHead = box(0.16, 0.07, 0.07, mat("#374151", { metal: 0.5 }));
      scopeHead.position.set(0.07, 1.13, 0);
      g.add(scopeHead);
      for (const dx of [-0.35, 0.25, 0.85]) {
        const port = cyl(0.13, 0.13, 0.06, mat("#7dd3fc", { emissive: "#38bdf8", emissiveI: 0.8, rough: 0.1 }), 10);
        port.rotation.x = Math.PI / 2;
        port.position.set(dx, 0.1, 0.5);
        g.add(port);
      }
      const prop = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const blade = box(0.05, 0.4, 0.1, mat("#94a3b8", { metal: 0.6 }));
        blade.rotation.x = (i / 3) * Math.PI * 2;
        prop.add(blade);
      }
      prop.position.x = -1.35;
      prop.name = "prop";
      g.add(prop);
      const finV = box(0.4, 0.5, 0.06, mat("#f59e0b"));
      finV.position.set(-1.1, 0.3, 0);
      g.add(finV);
      // headlights (visible cones + real light in dark areas)
      for (const s of [-1, 1]) {
        const lampGlass = sphere(0.1, mat("#fff7cc", { emissive: "#ffe9a8", emissiveI: 1.6 }), 8);
        lampGlass.position.set(1.1, 0.05, s * 0.28);
        g.add(lampGlass);
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.75, 4.2, 12, 1, true),
          new THREE.MeshBasicMaterial({ color: "#fff7cc", transparent: true, opacity: this.isDark ? 0.13 : 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
        );
        beam.rotation.z = Math.PI / 2;
        beam.position.set(3.2, 0.05, s * 0.28);
        g.add(beam);
      }
      if (this.isDark) {
        const spot = new THREE.SpotLight(0xfff2cc, 60, 24, 0.5, 0.5, 1.4);
        spot.position.set(1.2, 0, 0);
        const target = new THREE.Object3D();
        target.position.set(8, -1, 0);
        g.add(target);
        spot.target = target;
        g.add(spot);
      }
    } else {
      // diver
      const wet = mat("#0e7490", { rough: 0.6 });
      const bodyD = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 10), wet);
      bodyD.rotation.z = Math.PI / 2;
      g.add(bodyD);
      const headD = sphere(0.24, mat("#ffd9b3", { rough: 0.6 }), 12);
      headD.position.set(0.75, 0.05, 0);
      g.add(headD);
      const maskD = box(0.18, 0.14, 0.3, mat("#7dd3fc", { rough: 0.1, emissive: "#38bdf8", emissiveI: 0.3 }));
      maskD.position.set(0.92, 0.08, 0);
      g.add(maskD);
      const tank = cyl(0.14, 0.14, 0.6, mat("#f59e0b", { metal: 0.4, rough: 0.35 }), 10);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(-0.05, 0.32, 0);
      g.add(tank);
      for (const s of [-1, 1]) {
        const armD = cyl(0.07, 0.06, 0.55, wet, 6);
        armD.position.set(0.35, -0.05, s * 0.32);
        armD.rotation.x = s * 0.6;
        armD.name = s > 0 ? "armR" : "armL";
        g.add(armD);
        const legD = cyl(0.09, 0.07, 0.7, wet, 6);
        legD.position.set(-0.65, 0, s * 0.14);
        legD.rotation.z = Math.PI / 2 - 0.15;
        legD.name = s > 0 ? "legR" : "legL";
        g.add(legD);
        const finD = box(0.5, 0.03, 0.18, mat("#facc15", { rough: 0.5 }));
        finD.position.set(-1.15, 0, s * 0.14);
        finD.name = s > 0 ? "finR" : "finL";
        g.add(finD);
      }
      if (this.isDark) {
        const torch = new THREE.SpotLight(0xfff2cc, 40, 20, 0.45, 0.5, 1.4);
        torch.position.set(0.6, -0.1, 0);
        const target = new THREE.Object3D();
        target.position.set(7, -1.5, 0);
        g.add(target);
        torch.target = target;
        g.add(torch);
      }
    }
  }

  // ─── Visitor events (whale, dolphin, squid, glowing school) ────────────────

  private startVisitor() {
    const roll = Math.random();
    const kind: "whale" | "dolphin" | "squid" | "glowfish" =
      roll < 0.32 ? "whale" : roll < 0.6 ? "dolphin" : roll < 0.8 ? "glowfish" : "squid";
    const g = new THREE.Group();

    if (kind === "whale") {
      const silhouette = mat("#26415f", { rough: 0.9 });
      const bodyW = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 6, 6, 12), silhouette);
      bodyW.rotation.z = Math.PI / 2;
      g.add(bodyW);
      const tailW = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 6), silhouette);
      tailW.rotation.z = Math.PI / 2;
      tailW.position.x = -5.4;
      tailW.scale.z = 0.4;
      tailW.name = "flukes";
      g.add(tailW);
      for (const s of [-1, 1]) {
        const finW = box(1.8, 0.2, 0.7, silhouette);
        finW.position.set(1, -1.2, s * 1.8);
        finW.rotation.z = -0.3;
        g.add(finW);
      }
      g.position.set(-46, 2, -26);
      g.userData.vel = new THREE.Vector3(3.2, 0, 0.4);
    } else if (kind === "dolphin") {
      const skin = mat("#60a5fa", { rough: 0.5 });
      const bodyDo = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.6, 6, 10), skin);
      bodyDo.rotation.z = Math.PI / 2;
      g.add(bodyDo);
      const beak = cone(0.18, 0.5, skin, 8);
      beak.rotation.z = -Math.PI / 2;
      beak.position.x = 1.35;
      g.add(beak);
      const dorsal = cone(0.22, 0.5, skin, 6);
      dorsal.position.set(0, 0.6, 0);
      g.add(dorsal);
      const flukesD = box(0.2, 0.08, 1.0, skin);
      flukesD.position.x = -1.35;
      flukesD.name = "flukes";
      g.add(flukesD);
      g.position.set(-34, 0, -14);
      g.userData.vel = new THREE.Vector3(6.5, 0, 0.6);
    } else if (kind === "squid") {
      const shadow = mat("#1e2a45", { rough: 1 });
      const mantle = cone(1.6, 5, shadow, 8);
      mantle.rotation.z = -Math.PI / 2;
      mantle.position.x = 2;
      g.add(mantle);
      const headSq = sphere(1.2, shadow, 10);
      g.add(headSq);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const armSq = cyl(0.25, 0.06, 4.5, shadow, 6);
        armSq.position.set(-2.6, Math.cos(a) * 0.7, Math.sin(a) * 0.7);
        armSq.rotation.z = Math.PI / 2 + 0.12 * Math.cos(a);
        armSq.name = `sqArm${i}`;
        g.add(armSq);
      }
      for (const s of [-1, 1]) {
        const eyeSq = sphere(0.28, mat("#9fd8ff", { emissive: "#7dd3fc", emissiveI: 0.7 }), 10);
        eyeSq.position.set(0.5, 0.4, s * 0.9);
        g.add(eyeSq);
      }
      g.position.set(-52, -1, -38);
      g.userData.vel = new THREE.Vector3(2.2, 0, 0.2);
    } else {
      // a sparkling school of glowing fish weaving through
      for (let i = 0; i < 12; i++) {
        const f = simpleFish("#67e8f9", 0.14);
        (f.children[0] as THREE.Mesh).material = mat("#67e8f9", { emissive: "#22d3ee", emissiveI: 1.3, rough: 0.4 });
        f.position.set((i % 4) * 0.9, Math.sin(i * 1.7) * 0.7, Math.floor(i / 4) * 0.8 - 0.8);
        f.name = `schoolFish${i}`;
        g.add(f);
      }
      g.position.set(-36, 1, -16);
      g.userData.vel = new THREE.Vector3(4.5, 0, 0.8);
    }

    this.scene.add(g);
    this.visitor = g;
    this.visitorKind = kind;
    this.visitorT = 0;
    this.onEvent?.(kind);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  setDiscovered(discovered: Set<string>) {
    const before = this.discovered;
    this.discovered = new Set(discovered);
    for (const n of this.finds) {
      const found = this.discovered.has(n.spec.id);
      n.label.visible = found;
      n.mystery.visible = !found;
      if (found && !before.has(n.spec.id)) {
        // newly discovered while the scene lives → play the resolve animation
        n.react = 1.6;
      }
    }
  }

  playReaction(id: string) {
    const n = this.findById.get(id);
    if (n) n.react = Math.max(n.react, 1.4);
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

  private pickAt(clientX: number, clientY: number): DeepSeaPick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.finds.map((f) => f.group), true);
    for (const hit of hits) {
      const id = hit.object.userData.findId as string | undefined;
      if (id) return { id, screenX: clientX, screenY: clientY };
    }
    // nearest find within 50px
    let best: string | null = null;
    let bestPx = 50;
    const v = new THREE.Vector3();
    for (const f of this.finds) {
      f.group.getWorldPosition(v);
      v.y += 1;
      v.project(this.camera);
      if (v.z > 1) continue;
      const sx = ((v.x + 1) / 2) * rect.width + rect.left;
      const sy = ((1 - v.y) / 2) * rect.height + rect.top;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestPx) {
        bestPx = d;
        best = f.spec.id;
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
      this.camYaw -= dx * 0.0042;
      this.camPitch = Math.min(0.5, Math.max(-0.55, this.camPitch - dy * 0.0035));
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

  // ─── Find idle + reaction animation ─────────────────────────────────────────

  private animateFind(n: FindNode, t: number, dt: number) {
    const r = n.rig;
    const ph = n.phase;
    const resolved = this.discovered.has(n.spec.id);

    switch (n.spec.kind) {
      case "bell":
        if (r.bell) r.bell.rotation.x = Math.sin(t * 1.1 + ph) * 0.12;
        break;
      case "wheel":
        if (r.wheel) r.wheel.rotation.z = Math.sin(t * 0.5 + ph) * 0.4;
        break;
      case "cannon":
        if (r.peekFish) {
          r.peekFish.position.y = 1.25 + Math.sin(t * 1.4 + ph) * 0.12;
          const tail = r.peekFish.getObjectByName("tail");
          if (tail) tail.rotation.y = Math.sin(t * 8 + ph) * 0.5;
        }
        break;
      case "portOctopus":
        if (r.octoHead) { const p = 1 + Math.sin(t * 1.6 + ph) * 0.05; r.octoHead.scale.set(p, p, p); }
        for (let i = 0; i < 4; i++) {
          const armO = r[`octoArm${i}`];
          if (armO) armO.rotation.x = 0.5 + Math.sin(t * 1.3 + i * 0.9 + ph) * 0.2;
        }
        break;
      case "trappedTurtle":
        if (r.turtle) {
          r.turtle.position.y = 1.1 + (resolved ? Math.sin(t * 1.2 + ph) * 0.35 + 0.6 : Math.sin(t * 2.6 + ph) * 0.06);
          const flap = Math.sin(t * (resolved ? 2.6 : 5) + ph) * (resolved ? 0.5 : 0.22);
          for (const nm of ["flipFL", "flipFR", "flipBL", "flipBR"]) {
            const f = r.turtle.getObjectByName(nm);
            if (f) f.rotation.x = nm.endsWith("L") ? flap : -flap;
          }
        }
        break;
      case "sardines":
        for (let i = 0; i < 9; i++) {
          const f = r[`sardine${i}`];
          if (f) {
            const a = (i / 9) * Math.PI * 2 + t * 0.9;
            f.position.set(Math.cos(a) * 0.9, 1.2 + Math.sin(t * 1.6 + i * 2.1) * 0.4, Math.sin(a) * 0.9);
            f.rotation.y = -a;
          }
        }
        break;
      case "seahorses":
        for (let i = 0; i < 3; i++) {
          const h = r[`horse${i}`];
          if (h) h.position.y = 1.0 + i * 0.3 + Math.sin(t * 1.1 + i * 1.8 + ph) * 0.14;
        }
        break;
      case "kelpCrab": {
        const snip = Math.max(0, Math.sin(t * 2.4 + ph)) * 0.2;
        if (r.clawL) r.clawL.position.y = 0.5 + snip;
        if (r.clawR) r.clawR.position.y = 0.5 + snip * 0.6;
        break;
      }
      case "anemones":
        for (const k of Object.keys(r)) {
          if (k.startsWith("tent")) {
            r[k].rotation.z += Math.sin(t * 1.8 + k.length + ph) * 0.003;
          }
        }
        break;
      case "crystals":
        for (let i = 0; i < 6; i++) {
          const c = r[`crystal${i}`];
          if (c) ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + (Math.sin(t * 1.6 + i * 1.2 + ph) * 0.5 + 0.5) * 0.7;
        }
        break;
      case "glowfish":
        if (r.gfish) {
          r.gfish.position.x = Math.sin(t * 0.7 + ph) * 1.2;
          r.gfish.position.y = 1.4 + Math.sin(t * 1.3 + ph) * 0.3;
          r.gfish.rotation.y = Math.cos(t * 0.7 + ph) > 0 ? 0 : Math.PI;
          const tail = r.gfish.getObjectByName("tail");
          if (tail) tail.rotation.y = Math.sin(t * 9 + ph) * 0.5;
        }
        if (r.halo) {
          r.halo.position.x = r.gfish?.position.x ?? 0;
          r.halo.position.y = r.gfish?.position.y ?? 1.4;
          const hs = 1.6 + Math.sin(t * 2.2 + ph) * 0.3;
          r.halo.scale.set(hs, hs, 1);
        }
        break;
      case "pearls":
        if (r.pearl) ((r.pearl as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + (Math.sin(t * 1.8 + ph) * 0.5 + 0.5) * 0.5;
        if (r.shellTop) r.shellTop.rotation.x = -0.75 + Math.sin(t * 0.7 + ph) * 0.06;
        break;
      case "stalactites":
        for (let i = 0; i < 5; i++) {
          const d = r[`drip${i}`];
          if (d) {
            const cyc = (t * 0.35 + i * 0.37 + ph) % 1;
            d.position.y = 2.4 - cyc * 2.2;
            ((d as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 1;
          }
        }
        break;
      case "blindfish":
        if (r.bfish) {
          r.bfish.position.x = Math.sin(t * 0.5 + ph) * 1.0;
          r.bfish.rotation.y = Math.cos(t * 0.5 + ph) > 0 ? 0 : Math.PI;
          const tailB = r.bfish.getObjectByName("tail");
          if (tailB) tailB.rotation.y = Math.sin(t * 7 + ph) * 0.4;
        }
        break;
      case "caveEntrance":
        if (r.gleam) { const gs = 2 + Math.sin(t * 1.4 + ph) * 0.4; r.gleam.scale.set(gs, gs, 1); }
        break;
      case "archway":
        if (r.archFish) {
          r.archFish.position.x = Math.sin(t * 0.8 + ph) * 0.8;
          r.archFish.position.y = 1.6 + Math.cos(t * 1.1 + ph) * 0.4;
          r.archFish.rotation.y = Math.cos(t * 0.8 + ph) > 0 ? 0 : Math.PI;
        }
        break;
      case "smoker":
        for (let i = 0; i < 3; i++) {
          const p = r[`spuff${i}`];
          if (p) {
            const cyc = (t * 0.3 + i * 0.33 + ph) % 1;
            p.position.y = 3.2 + cyc * 2.6;
            p.scale.setScalar(0.6 + cyc);
          }
        }
        break;
      case "ventShrimp":
        for (let i = 0; i < 5; i++) {
          const s = r[`shrimp${i}`];
          if (s) s.position.y = 0.3 + i * 0.24 + Math.sin(t * 3 + i * 1.7 + ph) * 0.12;
        }
        break;
      case "tubeWorms":
        for (let i = 0; i < 6; i++) {
          const p = r[`plume${i}`];
          if (p) { const ps = 1 + Math.sin(t * 2 + i + ph) * 0.2; p.scale.set(ps, ps, ps); }
        }
        break;
      case "researchDome":
        if (r.beacon) ((r.beacon as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + (Math.sin(t * 3.2 + ph) * 0.5 + 0.5) * 1.6;
        if (r.labScreen) ((r.labScreen as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + (Math.sin(t * 6 + ph) * 0.5 + 0.5) * 0.3;
        break;
      case "diveRobot":
        if (r.robotBody) r.robotBody.position.y = 1.1 + Math.sin(t * 1.2 + ph) * 0.14;
        if (r.robotArm) r.robotArm.rotation.z = 0.5 + Math.sin(t * 0.9 + ph) * 0.25;
        break;
      case "giantClam":
        if (r.clamTop && !resolved) r.clamTop.rotation.x = -0.55 + Math.sin(t * 0.6 + ph) * 0.08;
        break;
      default:
        break;
    }

    // reaction: bounce + special resolves
    if (n.react > 0) {
      n.react = Math.max(0, n.react - dt);
      const p = 1 - n.react / 1.6;
      const bump = Math.sin(Math.min(1, p * 1.5) * Math.PI) * 0.13;
      n.group.scale.setScalar(1 + bump);

      if (n.spec.special === "rescue" && r.net) {
        const s = Math.max(0.01, 1 - p * 1.6);
        r.net.scale.set(1.25 * s, 0.8 * s, 1.05 * s);
        if (p > 0.6) r.net.visible = false;
      }
      if (n.spec.special === "clean") {
        for (let i = 0; i < 5; i++) {
          const b = r[`bottle${i}`];
          if (b) {
            b.scale.setScalar(Math.max(0.01, 1 - p * 1.4));
            if (p > 0.7) b.visible = false;
          }
        }
        if (r.cleanSparkle) {
          const s = Math.sin(Math.min(1, p * 1.2) * Math.PI) * 3;
          r.cleanSparkle.scale.set(Math.max(0.01, s), Math.max(0.01, s), 1);
        }
      }
      if (n.spec.kind === "chest") {
        if (r.lid) r.lid.rotation.x = -Math.min(1, p * 1.4) * 1.9;
        if (r.coins && p > 0.4) r.coins.visible = true;
        if (r.treasureGlow) {
          const s = 0.01 + Math.min(1, p * 1.3) * 2.6;
          r.treasureGlow.scale.set(s, s, 1);
        }
      }
      if (n.spec.kind === "giantClam" && r.clamTop) {
        r.clamTop.rotation.x = -0.55 - Math.sin(Math.min(1, p * 1.2) * Math.PI) * 0.5;
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

    // finds
    for (const n of this.finds) this.animateFind(n, this.reducedMotion ? 0 : t, dt);

    // kelp sways
    this.kelps.forEach((k, i) => {
      k.rotation.z = Math.sin(t * 0.6 + i * 1.3) * 0.11 * motion;
      k.rotation.x = Math.cos(t * 0.45 + i * 0.9) * 0.07 * motion;
    });

    // rays sway
    this.rays.forEach((rm, i) => {
      rm.rotation.z = Math.sin(t * 0.22 + i * 1.7) * 0.14;
    });

    // vent smoke columns
    for (const vp of this.ventPuffs) {
      const cyc = (t * 0.25 + vp.ph) % 1;
      vp.mesh.position.set(vp.base.x + Math.sin(t + vp.ph) * 0.2, vp.base.y + cyc * 3, vp.base.z);
      vp.mesh.scale.setScalar(0.6 + cyc * 1.2);
    }

    // marine snow
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 0.35 * motion;
        if (y < -13) y = 13;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // bubbles rise
    for (const b of this.bubbles) {
      b.position.y += dt * (b.userData.speed as number) * motion;
      b.position.x += Math.sin(t * 1.4 + b.position.z) * dt * 0.25;
      if (b.position.y > 10) b.position.y = -9;
    }

    // ambient fish cruise
    for (const f of this.ambientFish) {
      f.angle += f.speed * dt * motion;
      const x = f.center.x + Math.cos(f.angle) * f.radius;
      const z = f.center.z + Math.sin(f.angle) * f.radius;
      f.mesh.position.set(x, f.center.y + Math.sin(t * 1.1 + f.bobPhase) * 0.4, z);
      f.mesh.rotation.y = -f.angle + (f.speed > 0 ? Math.PI : 0);
      const tail = f.mesh.getObjectByName("tail");
      if (tail) tail.rotation.y = Math.sin(t * 8 + f.bobPhase) * 0.5;
    }

    // visitors
    if (!this.reducedMotion) {
      if (!this.visitor) {
        this.nextEventIn -= dt;
        if (this.nextEventIn <= 0) {
          this.startVisitor();
          this.nextEventIn = 20 + Math.random() * 16;
        }
      } else {
        this.visitorT += dt;
        const vel = this.visitor.userData.vel as THREE.Vector3;
        this.visitor.position.addScaledVector(vel, dt);
        this.visitor.position.y += Math.sin(t * 0.8) * dt * (this.visitorKind === "dolphin" ? 3.2 : 0.6);
        const flukes = this.visitor.getObjectByName("flukes");
        if (flukes) flukes.rotation.z = Math.sin(t * (this.visitorKind === "dolphin" ? 6 : 1.6)) * 0.3;
        if (this.visitorKind === "squid") {
          for (let i = 0; i < 6; i++) {
            const a = this.visitor.getObjectByName(`sqArm${i}`);
            if (a) a.rotation.z = Math.PI / 2 + Math.sin(t * 1.2 + i) * 0.14;
          }
        }
        if (this.visitorKind === "glowfish") {
          for (let i = 0; i < 12; i++) {
            const f = this.visitor.getObjectByName(`schoolFish${i}`);
            if (f) f.position.y = Math.sin(t * 2 + i * 1.7) * 0.7;
          }
        }
        if (this.visitorT > 26 || this.visitor.position.x > 60) {
          this.scene.remove(this.visitor);
          this.visitor = null;
          this.visitorKind = null;
        }
      }
    }

    // camera orbit + gentle current sway
    const sway = this.reducedMotion ? 0 : Math.sin(t * 0.4) * 0.02;
    const yaw = this.camYaw + sway;
    const pitch = this.camPitch;
    this.camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * this.camDist,
      Math.sin(-pitch) * this.camDist * 0.6 - 1,
      Math.cos(yaw) * Math.cos(pitch) * this.camDist
    );
    this.camera.lookAt(0, -3, 0);

    // craft swims just ahead of the camera (bottom-left of the frame),
    // always visible — built from the camera's own basis vectors
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camRight = new THREE.Vector3().crossVectors(camDir, this.camera.up).normalize();
    const camDown = new THREE.Vector3().crossVectors(camDir, camRight).normalize();
    this.craft.position
      .copy(this.camera.position)
      .addScaledVector(camDir, 6.5)
      .addScaledVector(camRight, -1.25)
      .addScaledVector(camDown, 1.45 + Math.sin(t * 0.9) * 0.25 * motion);
    // face the direction of view (nose points +X after a yaw)
    this.craft.rotation.set(0, Math.atan2(-camDir.z, camDir.x), Math.sin(t * 0.7) * 0.05 * motion);
    // craft life: prop spins / fins kick
    const prop = this.craft.getObjectByName("prop");
    if (prop) prop.rotation.x += dt * 9;
    for (const nm of ["finL", "finR", "legL", "legR"]) {
      const part = this.craft.getObjectByName(nm);
      if (part) part.rotation.z = (nm.startsWith("leg") ? Math.PI / 2 - 0.15 : 0) + Math.sin(t * 3 + (nm.endsWith("R") ? Math.PI : 0)) * 0.25;
    }
    // craft bubble trail
    if (!this.reducedMotion) {
      this.craftBubbleTimer -= dt;
      if (this.craftBubbleTimer <= 0) {
        this.craftBubbleTimer = 0.45;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: makeGlowTexture("rgba(210,240,255,0.7)", "rgba(210,240,255,0)", 64),
          transparent: true, depthWrite: false,
        }));
        sp.position.copy(this.craft.position).add(new THREE.Vector3(0, 0.4, 0));
        sp.scale.set(0.3, 0.3, 1);
        this.scene.add(sp);
        this.craftBubbles.push({ sprite: sp, age: 0 });
      }
      for (let i = this.craftBubbles.length - 1; i >= 0; i--) {
        const cb = this.craftBubbles[i];
        cb.age += dt;
        cb.sprite.position.y += dt * 1.4;
        cb.sprite.material.opacity = Math.max(0, 0.7 - cb.age * 0.4);
        const k = 0.3 + cb.age * 0.35;
        cb.sprite.scale.set(k, k, 1);
        if (cb.age > 1.8) {
          this.scene.remove(cb.sprite);
          this.craftBubbles.splice(i, 1);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}
