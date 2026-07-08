// Solar-system scene: sun + planets + moon + Pluto with procedural textures,
// slow orbits, tap-to-focus camera, Hebrew name labels and a galaxy backdrop.

import * as THREE from "three";
import { PLANETS, type PlanetSpec } from "../data/planets";
import {
  makeStarField,
  addNebulae,
  makeGlowTexture,
  makePlanetTexture,
  makeRingTexture,
  makeTextSprite,
  makeAtmosphere,
  mulberry32,
} from "./proceduralTextures";

export interface SpacePick {
  id: string;
  screenX: number;
  screenY: number;
}

export interface SolarSystemOptions {
  discovered: Set<string>;
  reducedMotion: boolean;
  onPick: (pick: SpacePick | null) => void;
  /** Painted mini-earth canvas (from the globe painter) — optional. */
  earthTexture?: THREE.Texture;
}

interface BodyEntry {
  spec: PlanetSpec;
  mesh: THREE.Mesh;
  group: THREE.Group;       // orbit anchor (rotates around parent)
  angle: number;
  label: THREE.Sprite;
  star: THREE.Sprite;       // "discovered" star badge
}

const CAM_MIN = 14;
const CAM_MAX = 150;

export class SolarSystemScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private bodies: BodyEntry[] = [];
  private sunGlow!: THREE.Sprite;

  private onPick: (pick: SpacePick | null) => void;
  private reducedMotion: boolean;
  private discovered: Set<string>;

  // Spherical orbit camera
  private camTheta = Math.PI / 2 - 0.45; // polar (from +Y)
  private camPhi = 0.6;                  // azimuth
  private camDist = 92;
  private lookTarget = new THREE.Vector3(0, 0, 0);
  private focusId: string | null = null;

  // interaction
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartCamDist = 0;
  private moved = 0;
  private downTime = 0;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: SolarSystemOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.reducedMotion = opts.reducedMotion;
    this.discovered = new Set(opts.discovered);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#020309");

    this.camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.5,
      5000
    );

    // Galaxy backdrop: dense stars + nebulae + a faint milky-way band
    this.scene.add(makeStarField(3400, 700, 2200, 21));
    addNebulae(this.scene, 13, 6, 1500);
    this.addMilkyWay();

    // Lights: sun at origin + soft ambient so far planets stay visible
    const sunLight = new THREE.PointLight(0xfff2cc, 2600, 0, 1.6);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    this.buildBodies(opts.earthTexture);

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

  private addMilkyWay() {
    const tex = makeGlowTexture("rgba(210,220,255,0.30)", "rgba(210,220,255,0)", 256);
    const rng = mulberry32(77);
    for (let i = 0; i < 26; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.16 + rng() * 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sp = new THREE.Sprite(mat);
      const t = (i / 26) * Math.PI * 2;
      const wobble = (rng() - 0.5) * 260;
      sp.position.set(Math.cos(t) * 1600, Math.sin(t * 2) * 120 + wobble * 0.4, Math.sin(t) * 1600);
      const s = 380 + rng() * 300;
      sp.scale.set(s, s * 0.55, 1);
      this.scene.add(sp);
    }
  }

  private buildBodies(earthTexture?: THREE.Texture) {
    const rng = mulberry32(3);
    let earthGroup: THREE.Group | null = null;

    for (const spec of PLANETS) {
      const group = new THREE.Group();
      const isMoon = spec.id === "moon";

      const tex = spec.style === "earth" && earthTexture ? earthTexture : makePlanetTexture(spec);
      const mat =
        spec.style === "sun"
          ? new THREE.MeshBasicMaterial({ map: tex })
          : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, 48, 48), mat);
      mesh.userData.bodyId = spec.id;

      const angle = spec.orbitRadius === 0 ? 0 : rng() * Math.PI * 2;

      if (isMoon) {
        // orbits Earth — parent group set below
        mesh.position.set(2.6, 0.5, 0);
      } else {
        mesh.position.set(spec.orbitRadius, 0, 0);
      }
      group.add(mesh);

      if (spec.id === "sun") {
        const glowTex = makeGlowTexture("rgba(255,220,120,0.9)", "rgba(255,150,30,0)", 256);
        this.sunGlow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        this.sunGlow.scale.set(spec.radius * 5.4, spec.radius * 5.4, 1);
        group.add(this.sunGlow);
      }

      if (spec.hasRings) {
        const ringGeo = new THREE.RingGeometry(spec.radius * 1.35, spec.radius * 2.25, 96);
        // map ring texture radially
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          const r = (v3.length() - spec.radius * 1.35) / (spec.radius * 0.9);
          uv.setXY(i, Math.min(1, Math.max(0, r)), 0.5);
        }
        const ringMat = new THREE.MeshBasicMaterial({
          map: makeRingTexture(),
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2 + 0.35;
        ring.position.copy(mesh.position);
        group.add(ring);
      }

      if (spec.style === "earth") {
        const atm = makeAtmosphere(spec.radius * 1.35, 0x5aa7ff, 0.8);
        atm.position.copy(mesh.position);
        group.add(atm);
        earthGroup = group;
      }

      // Orbit line
      if (spec.orbitRadius > 0 && !isMoon) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
          const t = (i / 128) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(t) * spec.orbitRadius, 0, Math.sin(t) * spec.orbitRadius));
        }
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x8899cc, transparent: true, opacity: 0.22 })
        );
        this.scene.add(line);
      }

      // Hebrew label above the body (size clamped so labels don't collide)
      const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
      const labelScale = Math.min(4.2, Math.max(2.3, spec.radius * 1.4));
      label.scale.multiplyScalar(labelScale);
      label.position.copy(mesh.position).add(new THREE.Vector3(0, spec.radius + labelScale * 0.62, 0));
      group.add(label);

      // Discovered star badge
      const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
      star.scale.multiplyScalar(Math.max(1.6, spec.radius * 0.8));
      star.position.copy(mesh.position).add(new THREE.Vector3(spec.radius * 0.9, spec.radius * 0.9, 0));
      star.visible = this.discovered.has(spec.id);
      group.add(star);

      this.scene.add(group);
      this.bodies.push({ spec, mesh, group, angle, label, star });
    }

    // Attach the moon's group to follow Earth: reparent under earth group anchor
    const moon = this.bodies.find((b) => b.spec.id === "moon");
    if (moon && earthGroup) {
      this.scene.remove(moon.group);
      earthGroup.add(moon.group);
      // moon.group orbits within earth group; position relative to earth mesh
      const earthMesh = this.bodies.find((b) => b.spec.id === "earth")!.mesh;
      moon.group.position.copy(earthMesh.position);
      moon.mesh.position.set(2.6, 0.5, 0);
      moon.label.position.set(2.6, 0.5 + moon.spec.radius + 1.6, 0);
      moon.star.position.set(2.6 + moon.spec.radius, 0.5 + moon.spec.radius, 0);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setDiscovered(discovered: Set<string>) {
    this.discovered = new Set(discovered);
    for (const b of this.bodies) b.star.visible = this.discovered.has(b.spec.id);
  }

  /** Camera glides to the body and follows it until unfocused. */
  focusBody(id: string | null) {
    this.focusId = id;
  }

  zoomIn() { this.camDist = Math.max(CAM_MIN, this.camDist / 1.3); }
  zoomOut() { this.camDist = Math.min(CAM_MAX, this.camDist * 1.3); }
  resetView() {
    this.focusId = null;
    this.camDist = 92;
    this.camTheta = Math.PI / 2 - 0.45;
    this.camPhi = 0.6;
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
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
    el.remove();
  }

  // ─── Picking & interaction ─────────────────────────────────────────────────

  private pickAt(clientX: number, clientY: number): SpacePick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = this.bodies.map((b) => b.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.bodyId as string;
      return { id, screenX: clientX, screenY: clientY };
    }
    // generous helper: nearest body within 42px on screen
    let best: string | null = null;
    let bestPx = 46;
    const v = new THREE.Vector3();
    for (const b of this.bodies) {
      b.mesh.getWorldPosition(v);
      v.project(this.camera);
      const sx = ((v.x + 1) / 2) * rect.width + rect.left;
      const sy = ((1 - v.y) / 2) * rect.height + rect.top;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestPx) {
        bestPx = d;
        best = b.spec.id;
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
      this.camPhi -= dx * 0.005;
      this.camTheta = Math.min(Math.PI - 0.35, Math.max(0.35, this.camTheta - dy * 0.005));
    } else if (this.pointers.size === 2 && this.pinchStartDist > 0) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.camDist = Math.min(CAM_MAX, Math.max(CAM_MIN, this.pinchStartCamDist * (this.pinchStartDist / Math.max(1, dist))));
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

  // ─── Animation ─────────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const speedScale = this.reducedMotion ? 0 : 1;

    // Orbits + self-rotation
    for (const b of this.bodies) {
      if (b.spec.orbitRadius > 0 && b.spec.id !== "moon") {
        b.angle += b.spec.orbitSpeed * dt * 0.35 * speedScale;
        b.group.rotation.y = b.angle;
      }
      if (b.spec.id === "moon") {
        b.angle += 0.5 * dt * speedScale;
        b.group.rotation.y = b.angle;
      }
      b.mesh.rotation.y += dt * 0.25 * speedScale;
      // keep labels facing up in world space (sprites auto-face camera)
    }

    // Sun glow breathing
    if (this.sunGlow) {
      const t = performance.now() / 1000;
      const s = 5.4 + Math.sin(t * 1.4) * 0.25;
      const sunR = this.bodies[0].spec.radius;
      this.sunGlow.scale.set(sunR * s, sunR * s, 1);
    }

    // Camera: follow focus or orbit origin
    const desiredTarget = new THREE.Vector3(0, 0, 0);
    let desiredDist = this.camDist;
    if (this.focusId) {
      const b = this.bodies.find((bb) => bb.spec.id === this.focusId);
      if (b) {
        b.mesh.getWorldPosition(desiredTarget);
        desiredDist = Math.max(CAM_MIN, b.spec.radius * 5.2);
      }
    }
    this.lookTarget.lerp(desiredTarget, Math.min(1, dt * 4));
    const dist = THREE.MathUtils.lerp(
      this.camera.position.distanceTo(this.lookTarget) || desiredDist,
      desiredDist,
      Math.min(1, dt * 4)
    );

    const sinT = Math.sin(this.camTheta);
    this.camera.position.set(
      this.lookTarget.x + dist * sinT * Math.cos(this.camPhi),
      this.lookTarget.y + dist * Math.cos(this.camTheta),
      this.lookTarget.z + dist * sinT * Math.sin(this.camPhi)
    );
    this.camera.lookAt(this.lookTarget);

    this.renderer.render(this.scene, this.camera);
  };
}
