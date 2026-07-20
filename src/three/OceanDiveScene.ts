// Underwater dive engine: one ocean × one depth zone. Fog, god rays,
// drifting particles, rising bubbles, a themed floor, and low-poly creatures
// swimming on looping paths — every one tappable.

import * as THREE from "three";
import type { OceanSpec, OceanZoneId } from "../data/oceans";
import { creaturesFor, type MarineCreature } from "../data/marineLife";
import { buildCreature, collectRig } from "./lowPolyLife";
import { makeTextSprite, mulberry32 } from "./proceduralTextures";
import {
  setNatureTheme,
  paintedGroundDisc,
  hasNatureSprite,
  natureBillboard,
} from "./natureAssets";

export interface OceanPick {
  id: string;
  screenX: number;
  screenY: number;
}

export interface OceanDiveOptions {
  ocean: OceanSpec;
  zone: OceanZoneId;
  discovered: Set<string>;
  reducedMotion: boolean;
  onPick: (pick: OceanPick | null) => void;
}

interface Swimmer {
  spec: MarineCreature;
  group: THREE.Group;
  rig: Record<string, THREE.Object3D>;
  label: THREE.Sprite;
  mystery: THREE.Sprite;
  center: THREE.Vector3;
  radius: number;
  angSpeed: number;   // signed
  angle: number;
  bobAmp: number;
  bobFreq: number;
  bobPhase: number;
  floorDweller: boolean;
}

/** Creatures that sit/peek on the sea floor instead of cruising loops. */
const FLOOR_STYLES = new Set(["crab", "starfish", "eel", "lobster", "blobfish"]);

const CAM_MIN = 7;
const CAM_MAX = 22;

export class OceanDiveScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private swimmers: Swimmer[] = [];
  private rays: THREE.Mesh[] = [];
  private particles: THREE.Points | null = null;
  private bubbles: THREE.Mesh[] = [];
  private seaweeds: THREE.Group[] = [];

  private onPick: (pick: OceanPick | null) => void;
  private reducedMotion: boolean;
  private discovered: Set<string>;

  private camYaw = 0;
  private camPitch = -0.05;
  private camDist = 16;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartCamDist = 0;
  private moved = 0;
  private downTime = 0;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: OceanDiveOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.reducedMotion = opts.reducedMotion;
    this.discovered = new Set(opts.discovered);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    const water = new THREE.Color(opts.ocean.waterColors[opts.zone]);
    this.scene = new THREE.Scene();
    this.scene.background = water;
    const fogDensity = opts.zone === "reef" ? 0.022 : opts.zone === "open" ? 0.027 : 0.04;
    this.scene.fog = new THREE.FogExp2(water, fogDensity);

    this.camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      600
    );

    // ── Lights per zone ──
    if (opts.zone === "reef") {
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.05));
      const sun = new THREE.DirectionalLight(0xfff8e0, 1.5);
      sun.position.set(4, 20, 6);
      this.scene.add(sun);
    } else if (opts.zone === "open") {
      this.scene.add(new THREE.AmbientLight(0xbcd8ff, 0.75));
      const sun = new THREE.DirectionalLight(0xcfe6ff, 0.8);
      sun.position.set(2, 18, 4);
      this.scene.add(sun);
    } else {
      // dark but readable: cool ambient + faint top light + blue rim fill so
      // big creatures read as shapes, not black blobs
      this.scene.add(new THREE.AmbientLight(0x8aa8dd, 0.72));
      const dim = new THREE.DirectionalLight(0x4a6a9e, 0.4);
      dim.position.set(0, 10, 4);
      this.scene.add(dim);
      const rim = new THREE.DirectionalLight(0x2e4a7a, 0.3);
      rim.position.set(-6, -4, -8);
      this.scene.add(rim);
    }

    this.buildEnvironment(opts);
    this.buildCreatures(opts);

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

  // ─── Environment ───────────────────────────────────────────────────────────

  private buildEnvironment(opts: OceanDiveOptions) {
    const rng = mulberry32(opts.ocean.id.length * 7 + opts.zone.length);

    // god rays (sunlit zones only)
    if (opts.zone !== "deep") {
      for (let i = 0; i < 7; i++) {
        const ray = new THREE.Mesh(
          new THREE.ConeGeometry(2.2 + rng() * 2, 26, 6, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xfffbe8,
            transparent: true,
            opacity: opts.zone === "reef" ? 0.075 : 0.045,
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

    // drifting particles (plankton / marine snow)
    const COUNT = 300;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rng() - 0.5) * 44;
      positions[i * 3 + 1] = (rng() - 0.5) * 26;
      positions[i * 3 + 2] = (rng() - 0.5) * 44;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: opts.zone === "deep" ? 0x9fd8ff : 0xffffff,
        size: opts.zone === "deep" ? 2.4 : 1.7,
        sizeAttenuation: false,
        transparent: true,
        opacity: opts.zone === "deep" ? 0.65 : 0.45,
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
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rng() * 0.1, 8, 8), bubbleMat);
      b.position.set((rng() - 0.5) * 26, -8 + rng() * 16, (rng() - 0.5) * 26);
      b.userData.speed = 0.8 + rng() * 1.4;
      this.scene.add(b);
      this.bubbles.push(b);
    }

    // floor
    if (opts.zone !== "open") {
      if (opts.zone === "reef") {
        setNatureTheme("reef");
        const floor = paintedGroundDisc(45, "reef", { segments: 36, y: -7 });
        this.scene.add(floor);

        // swaying kelp / seaweed
        for (let i = 0; i < 10; i++) {
          const painted = hasNatureSprite("kelp")
            ? natureBillboard("kelp", 2.2 + rng() * 1.4, { sway: 0.04, widthScale: 0.55 })
            : null;
          if (painted) {
            painted.position.set((rng() - 0.5) * 32, -7, (rng() - 0.5) * 32);
            this.scene.add(painted);
            this.seaweeds.push(painted);
            continue;
          }
          const strand = new THREE.Group();
          const h = 1.6 + rng() * 1.8;
          const green = new THREE.MeshStandardMaterial({
            color: i % 3 === 0 ? "#2f9e44" : "#3aa86b",
            roughness: 0.9,
            side: THREE.DoubleSide,
          });
          for (let j = 0; j < 3; j++) {
            const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, h * (0.7 + rng() * 0.5), 3, 5), green);
            blade.position.set((rng() - 0.5) * 0.4, h / 2, (rng() - 0.5) * 0.4);
            blade.rotation.z = (rng() - 0.5) * 0.4;
            strand.add(blade);
          }
          strand.position.set((rng() - 0.5) * 32, -7, (rng() - 0.5) * 32);
          this.scene.add(strand);
          this.seaweeds.push(strand);
        }
        // coral garden
        const corals = ["#ff6f61", "#f59e0b", "#e879f9", "#34d399", "#f43f5e", "#38bdf8"];
        for (let i = 0; i < 22; i++) {
          const cx = (rng() - 0.5) * 34;
          const cz = (rng() - 0.5) * 34;
          if (hasNatureSprite("coral")) {
            const c = natureBillboard("coral", 0.9 + rng() * 1.1, { widthScale: 0.95 });
            if (c) {
              c.position.set(cx, -7, cz);
              this.scene.add(c);
              continue;
            }
          }
          const cluster = new THREE.Group();
          const n = 2 + Math.floor(rng() * 4);
          for (let j = 0; j < n; j++) {
            const color = corals[Math.floor(rng() * corals.length)];
            const kind = rng();
            let m: THREE.Mesh;
            if (kind < 0.4) {
              m = new THREE.Mesh(
                new THREE.ConeGeometry(0.25 + rng() * 0.3, 0.9 + rng() * 1.3, 5),
                new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 })
              );
              m.position.y = 0.5;
            } else if (kind < 0.7) {
              m = new THREE.Mesh(
                new THREE.SphereGeometry(0.35 + rng() * 0.35, 7, 6),
                new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 })
              );
              m.position.y = 0.3;
            } else {
              m = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.09, 1.2 + rng() * 1.2, 5),
                new THREE.MeshStandardMaterial({ color: "#2f9e44", flatShading: true, roughness: 1 })
              );
              m.position.y = 0.7;
              m.rotation.z = (rng() - 0.5) * 0.35;
            }
            m.position.x = (rng() - 0.5) * 1.6;
            m.position.z = (rng() - 0.5) * 1.6;
            cluster.add(m);
          }
          cluster.position.set(cx, -7, cz);
          this.scene.add(cluster);
        }
      } else {
        const floor = new THREE.Mesh(
          new THREE.CircleGeometry(45, 36),
          new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 1 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -7;
        this.scene.add(floor);

        // deep: hydrothermal vents ("black smokers") with a warm glow
        for (let i = 0; i < 5; i++) {
          const vent = new THREE.Mesh(
            new THREE.ConeGeometry(0.7 + rng() * 0.5, 2.4 + rng() * 1.6, 6),
            new THREE.MeshStandardMaterial({ color: 0x1f1a17, flatShading: true, roughness: 1 })
          );
          const vx = (rng() - 0.5) * 26;
          const vz = (rng() - 0.5) * 26;
          vent.position.set(vx, -6, vz);
          this.scene.add(vent);
          const glow = new THREE.PointLight(0xff5a2a, 5, 7, 2);
          glow.position.set(vx, -4.6, vz);
          this.scene.add(glow);
        }
      }
    }
  }

  // ─── Creatures ─────────────────────────────────────────────────────────────

  private buildCreatures(opts: OceanDiveOptions) {
    const list = creaturesFor(opts.ocean.id, opts.zone);
    const rng = mulberry32(opts.ocean.id.charCodeAt(0) * 13 + opts.zone.charCodeAt(0));

    list.forEach((spec, i) => {
      const group = buildCreature(spec);
      const floorDweller = spec.speed === 0 || FLOOR_STYLES.has(spec.style);
      const surface = spec.style === "otter"; // floats on its back near the light

      const a = (i / list.length) * Math.PI * 2 + rng() * 0.5;
      // giants circle farther out so they don't blot out the camera
      const dist = 5 + rng() * 5 + Math.max(0, spec.size - 1.8) * 2.2;
      const center = new THREE.Vector3(
        Math.cos(a) * dist,
        floorDweller ? -6.6 : surface ? 3.6 + rng() * 1.2 : -3 + rng() * 6.5,
        Math.sin(a) * dist
      );

      const label = makeTextSprite(spec.nameHebrew, { fontSize: 56 });
      label.scale.multiplyScalar(1.6 + spec.size * 0.55);
      label.visible = this.discovered.has(spec.id);
      const mystery = makeTextSprite("❓", { fontSize: 56 });
      mystery.scale.multiplyScalar(1.0);
      mystery.visible = !this.discovered.has(spec.id);
      this.scene.add(label, mystery);

      this.scene.add(group);
      this.swimmers.push({
        spec,
        group,
        rig: collectRig(group),
        label,
        mystery,
        center,
        radius: floorDweller ? 0.6 + rng() * 0.8 : 1.8 + rng() * 3.2,
        angSpeed: (0.1 + rng() * 0.14) * spec.speed * (rng() > 0.5 ? 1 : -1),
        angle: rng() * Math.PI * 2,
        bobAmp: floorDweller ? 0 : 0.3 + rng() * 0.5,
        bobFreq: 0.5 + rng(),
        bobPhase: rng() * Math.PI * 2,
        floorDweller,
      });
    });
  }

  /** Drive the named animation rig: tails wag, fins flap, arms sway. */
  private animateRig(s: Swimmer, t: number) {
    const r = s.rig;
    const ph = s.bobPhase;
    const swimF = 2.2 + s.spec.speed * 2.4; // faster swimmers beat faster
    const wave = Math.sin(t * swimF + ph);
    if (r.tail) r.tail.rotation.y = wave * 0.42;
    if (r.flukes) r.flukes.rotation.z = Math.sin(t * swimF * 0.7 + ph) * 0.3;
    if (r.dorsal) r.dorsal.rotation.x = Math.sin(t * swimF * 0.5 + ph) * 0.1;
    const pect = Math.sin(t * swimF * 0.8 + ph);
    if (r.pectL) r.pectL.rotation.x = pect * 0.28;
    if (r.pectR) r.pectR.rotation.x = -pect * 0.28;
    const flip = Math.sin(t * swimF * 0.6 + ph);
    if (r.flipperL) r.flipperL.rotation.x = flip * 0.45;
    if (r.flipperR) r.flipperR.rotation.x = -flip * 0.45;
    // rays/mantas/flying-fish/squid fins + dumbo ears
    const flap = Math.sin(t * (1.4 + s.spec.speed) + ph);
    if (r.wingL) r.wingL.rotation.x = flap * 0.5;
    if (r.wingR) r.wingR.rotation.x = -flap * 0.5;
    // paddling legs (turtle back legs / polar bear)
    const paddle = Math.sin(t * 3 + ph);
    if (r.legFL) r.legFL.rotation.x = paddle * 0.4;
    if (r.legFR) r.legFR.rotation.x = -paddle * 0.4;
    if (r.legBL) r.legBL.rotation.x = -paddle * 0.35;
    if (r.legBR) r.legBR.rotation.x = paddle * 0.35;
    // arms/tentacles ripple with a per-arm phase
    for (let i = 0; i < 12; i++) {
      const arm = r[`arm${i}`];
      if (!arm) break;
      arm.rotation.x = Math.sin(t * 1.6 + ph + i * 0.8) * 0.16;
      arm.rotation.z = Math.cos(t * 1.3 + ph + i * 0.8) * 0.14;
    }
    if (r.tent0) r.tent0.rotation.z = Math.sin(t * 1.2 + ph) * 0.12;
    if (r.tent1) r.tent1.rotation.z = Math.cos(t * 1.2 + ph) * 0.12;
    // jaws slowly open and close (moray / gulper / anglerfish)
    if (r.jaw) r.jaw.rotation.z = 0.08 + (Math.sin(t * 1.4 + ph) * 0.5 + 0.5) * 0.3;
    // claws snip now and then
    const snip = Math.max(0, Math.sin(t * 2.6 + ph)) * 0.22;
    if (r.clawL) r.clawL.rotation.y = snip;
    if (r.clawR) r.clawR.rotation.y = -snip;
    if (r.antL) r.antL.rotation.z = Math.sin(t * 1.1 + ph) * 0.15;
    if (r.antR) r.antR.rotation.z = Math.cos(t * 1.1 + ph) * 0.15;
    if (r.lure) r.lure.rotation.z = Math.sin(t * 1.5 + ph) * 0.2;
    if (r.head && (s.spec.style === "seahorse" || s.spec.style === "seal" || s.spec.style === "walrus" || s.spec.style === "bear" || s.spec.style === "turtle")) {
      r.head.rotation.z = Math.sin(t * 1.2 + ph) * 0.09;
    }
    if (r.skirt) {
      const p = 1 + 0.1 * Math.sin(t * 2.2 + ph);
      r.skirt.scale.set(p, p, 1);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setDiscovered(discovered: Set<string>) {
    this.discovered = new Set(discovered);
    for (const s of this.swimmers) {
      const on = this.discovered.has(s.spec.id);
      s.label.visible = on;
      s.mystery.visible = !on;
    }
  }

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

  // ─── Picking & interaction ─────────────────────────────────────────────────

  private pickAt(clientX: number, clientY: number): OceanPick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.swimmers.map((s) => s.group),
      true
    );
    for (const hit of hits) {
      const id = hit.object.userData.creatureId as string | undefined;
      if (id) return { id, screenX: clientX, screenY: clientY };
    }
    // nearest creature center within 48px
    let best: string | null = null;
    let bestPx = 48;
    const v = new THREE.Vector3();
    for (const s of this.swimmers) {
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
      this.pinchStartCamDist = this.camDist;
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
      this.camPitch = Math.min(0.55, Math.max(-0.6, this.camPitch - dy * 0.0035));
    } else if (this.pointers.size === 2 && this.pinchStartDist > 0) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.camDist = Math.min(
        CAM_MAX,
        Math.max(CAM_MIN, this.pinchStartCamDist * (this.pinchStartDist / Math.max(1, dist)))
      );
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

  zoomIn() { this.camDist = Math.max(CAM_MIN, this.camDist / 1.25); }
  zoomOut() { this.camDist = Math.min(CAM_MAX, this.camDist * 1.25); }

  // ─── Animation ─────────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = performance.now() / 1000;
    const speedScale = this.reducedMotion ? 0.15 : 1;

    // creatures swim their loops
    for (const s of this.swimmers) {
      s.angle += s.angSpeed * dt * speedScale;
      const bob = s.bobAmp * Math.sin(t * s.bobFreq + s.bobPhase);
      const x = s.center.x + Math.cos(s.angle) * s.radius;
      const z = s.center.z + Math.sin(s.angle) * s.radius;
      s.group.position.set(x, s.center.y + bob, z);
      if (!s.floorDweller || s.spec.style === "crab") {
        // face the swim direction (tangent of the circle)
        s.group.rotation.y = -s.angle + (s.angSpeed > 0 ? Math.PI : 0);
        // gentle body roll + pitch — alive, not a statue on rails
        if (this.reducedMotion) {
          s.group.rotation.z = 0;
          s.group.rotation.x = 0;
        } else {
          s.group.rotation.z = Math.sin(t * 0.9 + s.bobPhase) * 0.06;
          s.group.rotation.x = Math.cos(t * s.bobFreq + s.bobPhase) * s.bobAmp * 0.08;
        }
      }
      if (!this.reducedMotion) this.animateRig(s, t);
      // jellyfish bell pulse
      if (s.spec.style === "jellyfish") {
        const bell = s.rig.bell;
        if (bell) {
          const p = 1 + 0.14 * Math.sin(t * 2.2 + s.bobPhase);
          bell.scale.set(1 / Math.sqrt(p), p, 1 / Math.sqrt(p));
        }
        s.group.position.y += Math.sin(t * 2.2 + s.bobPhase) * 0.15;
      }
      // labels float above
      const labelY = s.group.position.y + 1.1 * s.spec.size + 0.7;
      s.label.position.set(x, labelY, z);
      s.mystery.position.set(x, labelY, z);
    }

    // seaweed sways with the current
    this.seaweeds.forEach((w, i) => {
      w.rotation.z = Math.sin(t * 0.8 + i * 1.3) * 0.16;
      w.rotation.x = Math.cos(t * 0.6 + i * 0.9) * 0.1;
    });

    // god rays sway gently
    this.rays.forEach((r, i) => {
      r.rotation.z = Math.sin(t * 0.22 + i * 1.7) * 0.14;
    });

    // marine snow drifts down
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 0.35 * speedScale;
        if (y < -13) y = 13;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // bubbles rise
    for (const b of this.bubbles) {
      b.position.y += dt * (b.userData.speed as number) * speedScale;
      b.position.x += Math.sin(t * 1.4 + b.position.z) * dt * 0.25;
      if (b.position.y > 10) b.position.y = -9;
    }

    // camera: orbit around the center + a gentle current sway
    const sway = this.reducedMotion ? 0 : Math.sin(t * 0.4) * 0.02;
    const yaw = this.camYaw + sway;
    const pitch = this.camPitch;
    this.camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * this.camDist,
      Math.sin(-pitch) * this.camDist * 0.6,
      Math.cos(yaw) * Math.cos(pitch) * this.camDist
    );
    this.camera.lookAt(0, -0.5, 0);

    this.renderer.render(this.scene, this.camera);
  };
}
