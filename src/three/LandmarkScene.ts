// The landmark visit engine: a round stage with a painted ground, a mood sky
// (day / sunset / dusk / night / aurora / polar), the hand-built 3D site from
// landmarkKit, and 3 floating treasure pedestals to tap. Drag rotates, pinch
// zooms, and every site's named parts (doves, boats, penguins, aurora
// curtains, petals...) are animated here.

import * as THREE from "three";
import type { LandmarkSpec, LandmarkSky, LandmarkGround } from "../data/landmarks";
import { buildLandmarkSite } from "./landmarkKit";
import { makeStarField, makeTextSprite, makeGlowTexture, mulberry32 } from "./proceduralTextures";
import {
  setNatureTheme,
  themeForLandmarkGround,
  paintedGroundDisc,
  hasNatureSprite,
  natureBillboard,
} from "./natureAssets";

export interface LandmarkPick {
  kind: "treasure" | "site";
  id: string;
  screenX: number;
  screenY: number;
}

export interface LandmarkSceneOptions {
  landmark: LandmarkSpec;
  discoveredTreasures: Set<string>;
  reducedMotion: boolean;
  onPick: (pick: LandmarkPick | null) => void;
}

interface TreasureNode {
  id: string;
  group: THREE.Group;
  emojiSprite: THREE.Sprite;
  mysterySprite: THREE.Sprite;
  ring: THREE.Mesh;
  baseY: number;
  phase: number;
}

const SKY: Record<LandmarkSky, {
  top: string; mid: string; bottom: string;
  ambient: number; ambientColor: number;
  sun: number; sunColor: number; sunPos: [number, number, number];
  stars?: boolean; moon?: boolean; sunDisc?: string;
}> = {
  day:    { top: "#3f97e0", mid: "#a8d8f0", bottom: "#eaf6fc", ambient: 0.95, ambientColor: 0xffffff, sun: 1.5,  sunColor: 0xfff6e0, sunPos: [6, 10, 5], sunDisc: "#fff3b0" },
  sunset: { top: "#41519e", mid: "#e88a5d", bottom: "#f7c873", ambient: 0.8,  ambientColor: 0xffe0c0, sun: 1.35, sunColor: 0xffc07a, sunPos: [-7, 4, 6], sunDisc: "#ffd9a0" },
  dusk:   { top: "#1a2350", mid: "#4a5fa8", bottom: "#8a7fb8", ambient: 0.78, ambientColor: 0xc8d2ff, sun: 1.15, sunColor: 0xb8c6ff, sunPos: [4, 8, 6], stars: true },
  night:  { top: "#050a1c", mid: "#0d1738", bottom: "#1a2a55", ambient: 0.45, ambientColor: 0x8fa8e0, sun: 0.55, sunColor: 0x9db8ff, sunPos: [3, 9, 5], stars: true, moon: true },
  aurora: { top: "#03060f", mid: "#0a1430", bottom: "#16295c", ambient: 0.66, ambientColor: 0xb8ffe0, sun: 0.6,  sunColor: 0xa8f0d0, sunPos: [0, 10, 6], stars: true, moon: true },
  polar:  { top: "#8fc3e8", mid: "#cfe8f7", bottom: "#f2f9fd", ambient: 0.95, ambientColor: 0xf0f8ff, sun: 1.1,  sunColor: 0xffe8c8, sunPos: [-8, 3, 7], sunDisc: "#ffe8b8" },
};

export class LandmarkScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private stage = new THREE.Group();       // rotates: ground + site + treasures
  private treasures: TreasureNode[] = [];
  private rig: Record<string, THREE.Object3D> = {};
  private discovered: Set<string>;

  private onPick: (pick: LandmarkPick | null) => void;
  private reducedMotion: boolean;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartCam = 0;
  private moved = 0;
  private downTime = 0;
  private userYaw = 0;
  private autoYaw = 0;
  private camDist = 17;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: LandmarkSceneOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.reducedMotion = opts.reducedMotion;
    this.discovered = new Set(opts.discoveredTreasures);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    this.scene = new THREE.Scene();
    const sky = SKY[opts.landmark.sky];

    // sky gradient background (canvas texture with graceful fallback)
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 4;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext("2d");
    if (skyCtx) {
      const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, sky.top);
      grad.addColorStop(0.55, sky.mid);
      grad.addColorStop(1, sky.bottom);
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(0, 0, 4, 256);
      const tex = new THREE.CanvasTexture(skyCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = tex;
    } else {
      this.scene.background = new THREE.Color(sky.mid);
    }

    if (sky.stars) {
      this.scene.add(makeStarField(700, 120, 300, 5));
    }
    if (sky.moon) {
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: "#e8e6da" })
      );
      moon.position.set(-14, 16, -26);
      this.scene.add(moon);
    }
    if (sky.sunDisc) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(sky.sunDisc, "rgba(255,220,140,0)", 128),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      glow.position.set(sky.sunPos[0] * 3.2, sky.sunPos[1] * 2.4, -30);
      glow.scale.set(16, 16, 1);
      this.scene.add(glow);
    }

    this.camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      400
    );

    // lights
    this.scene.add(new THREE.AmbientLight(sky.ambientColor, sky.ambient));
    const sun = new THREE.DirectionalLight(sky.sunColor, sky.sun);
    sun.position.set(...sky.sunPos);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd0e8, 0.3);
    fill.position.set(-sky.sunPos[0], 4, -sky.sunPos[2]);
    this.scene.add(fill);

    this.buildGround(opts.landmark.ground);
    const site = buildLandmarkSite(opts.landmark.id);
    site.traverse((o) => { o.userData.pickKind = "site"; });
    this.stage.add(site);
    this.rig = {};
    site.traverse((o) => { if (o.name) this.rig[o.name] = o; });

    this.buildTreasures(opts.landmark);
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

  private buildGround(kind: LandmarkGround) {
    const theme = setNatureTheme(themeForLandmarkGround(kind));
    const ground = paintedGroundDisc(11.5, theme, { segments: 40 });
    this.stage.add(ground);

    // soft rim props around the stage edge
    const rng = mulberry32(kind.length * 17 + 3);
    const propKind = kind === "sand" || kind === "savanna"
      ? ("palm" as const)
      : kind === "snow" || kind === "ice"
        ? ("rock" as const)
        : kind === "plaza" || kind === "stone"
          ? ("bush" as const)
          : ("tree" as const);
    if (hasNatureSprite(propKind)) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + rng() * 0.2;
        const r = 8.2 + rng() * 2.2;
        const bb = natureBillboard(propKind, 1.4 + rng() * 1.2, { sway: 0.02 });
        if (bb) {
          bb.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
          this.stage.add(bb);
        }
      }
    }

    // earthy rim so the stage reads like a little island
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(11.5, 10.6, 1.1, 40, 1, true),
      new THREE.MeshStandardMaterial({ color: "#6e5137", roughness: 1, side: THREE.DoubleSide })
    );
    rim.position.y = -0.56;
    this.stage.add(rim);
  }

  private buildTreasures(landmark: LandmarkSpec) {
    const angles = [0.96, 3.05, 5.1];
    landmark.treasures.forEach((t, i) => {
      const group = new THREE.Group();
      const a = angles[i % angles.length];
      const baseY = 1.05;
      group.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6);

      // golden pedestal ring + glow
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.07, 8, 24),
        new THREE.MeshStandardMaterial({
          color: "#f4c141",
          metalness: 0.65,
          roughness: 0.3,
          emissive: new THREE.Color("#b8860b"),
          emissiveIntensity: 0.5,
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.28;
      group.add(ring);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(255,214,110,0.85)", "rgba(255,214,110,0)", 128),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      glow.position.y = baseY + 0.55;
      glow.scale.set(2.6, 2.6, 1);
      group.add(glow);

      // the treasure emoji (revealed) vs the mystery "?"
      const emojiSprite = makeTextSprite(t.emoji, { fontSize: 110, stroke: "rgba(0,0,0,0)" });
      emojiSprite.scale.multiplyScalar(1.5);
      emojiSprite.position.y = baseY + 0.55;
      const mysterySprite = makeTextSprite("❓", { fontSize: 100, color: "#ffe9a8", stroke: "rgba(120,70,0,0.85)" });
      mysterySprite.scale.multiplyScalar(1.25);
      mysterySprite.position.y = baseY + 0.55;
      const found = this.discovered.has(t.id);
      emojiSprite.visible = found;
      mysterySprite.visible = !found;
      group.add(emojiSprite, mysterySprite);

      // fat-finger hit target
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.y = baseY + 0.5;
      group.add(hit);

      group.traverse((o) => { o.userData.treasureId = t.id; });
      this.stage.add(group);
      this.treasures.push({ id: t.id, group, emojiSprite, mysterySprite, ring, baseY, phase: i * 2.1 });
    });
  }

  setDiscovered(discovered: Set<string>) {
    this.discovered = new Set(discovered);
    for (const t of this.treasures) {
      const found = this.discovered.has(t.id);
      t.emojiSprite.visible = found;
      t.mysterySprite.visible = !found;
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

  private pickAt(clientX: number, clientY: number): LandmarkPick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.stage.children, true);
    for (const hit of hits) {
      const tid = hit.object.userData.treasureId as string | undefined;
      if (tid) return { kind: "treasure", id: tid, screenX: clientX, screenY: clientY };
    }
    for (const hit of hits) {
      if (hit.object.userData.pickKind === "site") {
        return { kind: "site", id: "site", screenX: clientX, screenY: clientY };
      }
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
      this.camDist = Math.min(26, Math.max(9, this.pinchStartCam * (this.pinchStartDist / Math.max(1, dist))));
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
    this.camDist = Math.min(26, Math.max(9, this.camDist * (e.deltaY > 0 ? 1.08 : 0.92)));
  };

  zoomIn() { this.camDist = Math.max(9, this.camDist / 1.25); }
  zoomOut() { this.camDist = Math.min(26, this.camDist * 1.25); }

  // ─── Animation ─────────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = performance.now() / 1000;

    if (!this.reducedMotion && this.pointers.size === 0) this.autoYaw += dt * 0.1;
    this.stage.rotation.y = this.autoYaw + this.userYaw;

    // treasures float and their rings shimmer
    for (const tr of this.treasures) {
      const bob = this.reducedMotion ? 0 : Math.sin(t * 1.4 + tr.phase) * 0.16;
      tr.emojiSprite.position.y = tr.baseY + 0.55 + bob;
      tr.mysterySprite.position.y = tr.baseY + 0.55 + bob;
      tr.ring.rotation.z = t * 0.6 + tr.phase;
      const pulse = 1 + Math.sin(t * 2.2 + tr.phase) * 0.06;
      tr.ring.scale.set(pulse, pulse, 1);
    }

    // site-specific life
    if (!this.reducedMotion) {
      const r = this.rig;
      for (let i = 0; i < 3; i++) {
        const dv = r[`dove${i}`];
        if (dv) dv.position.y += Math.sin(t * 2 + i * 2) * 0.0016;
        const au = r[`aurora${i}`];
        if (au) {
          au.rotation.z = Math.sin(t * 0.4 + i * 1.4) * 0.08;
          au.position.x += Math.sin(t * 0.25 + i) * 0.0012;
          const mat = (au as THREE.Mesh).material as THREE.Material;
          mat.opacity = 0.75 + Math.sin(t * 0.9 + i * 2) * 0.25;
          mat.transparent = true;
        }
        const mist = r[`mist${i}`];
        if (mist) mist.position.x += Math.sin(t * 0.3 + i * 2.4) * 0.002;
      }
      for (let i = 0; i < 8; i++) {
        const p = r[`penguin${i}`];
        if (p) p.rotation.z = Math.sin(t * 2.4 + i * 1.1) * 0.07;
        const petal = r[`petal${i}`];
        if (petal) {
          petal.position.y -= dt * 0.25;
          petal.position.x += Math.sin(t * 1.5 + i) * dt * 0.3;
          if (petal.position.y < 0.1) petal.position.y = 2.6;
        }
      }
      if (r.boat) {
        r.boat.position.x += Math.sin(t * 0.4) * 0.004;
        r.boat.rotation.z = Math.sin(t * 1.1) * 0.04;
      }
      if (r.bus) r.bus.position.x = 1.2 + Math.sin(t * 0.35) * 2.6;
      if (r.cloudring) r.cloudring.rotation.z = t * 0.06;
      if (r.flame) {
        const f = 1 + Math.sin(t * 9) * 0.12;
        r.flame.scale.set(f, 1 / f, f);
      }
      if (r.beacon) {
        const b = (Math.sin(t * 3.4) + 1) / 2;
        ((r.beacon as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + b * 1.6;
      }
      if (r.spinner) r.spinner.rotation.z += dt * 1.2;
    }

    // camera: gentle orbit height, looks at the heart of the site
    this.camera.position.set(0, 3.2 + this.camDist * 0.18, this.camDist);
    this.camera.lookAt(0, 1.9, 0);

    this.renderer.render(this.scene, this.camera);
  };
}
