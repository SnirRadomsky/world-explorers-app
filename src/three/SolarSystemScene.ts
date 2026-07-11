// Solar-system scene: sun + planets + moon + Pluto with procedural textures,
// slow orbits, tap-to-focus camera, Hebrew name labels and a galaxy backdrop.

import * as THREE from "three";
import { PLANETS, type PlanetSpec } from "../data/planets";
import { SPACE_OBJECTS } from "../data/spaceObjects";
import { CONSTELLATIONS } from "../data/constellations";
import {
  makeStarField,
  addNebulae,
  makeGlowTexture,
  makePlanetTexture,
  makeRingTexture,
  makeCloudTexture,
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
  constellationsDiscovered: Set<string>;
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
  private earthClouds: THREE.Mesh | null = null;

  // Extra space objects (belt / comet / ISS)
  private extraPickMeshes: THREE.Mesh[] = [];
  private extraStars = new Map<string, THREE.Sprite>();
  private focusTargets = new Map<string, { obj: THREE.Object3D; dist: number }>();
  private beltGroup: THREE.Group | null = null;
  private comet: { group: THREE.Group; nucleus: THREE.Mesh; tail: THREE.Sprite; angle: number } | null = null;
  private iss: { group: THREE.Group; angle: number } | null = null;
  private astronaut: { group: THREE.Group; figure: THREE.Group; angle: number } | null = null;
  private hubble: { group: THREE.Group; angle: number } | null = null;
  /** Small/far objects that get the generous screen-proximity tap helper. */
  private extraProximity: { id: string; obj: THREE.Object3D }[] = [];

  // Constellations
  private constellationsDiscovered: Set<string>;
  private constellationEntries: {
    id: string;
    center: THREE.Vector3;
    lines: THREE.LineSegments;
    nameLabel: THREE.Sprite;
    mysteryLabel: THREE.Sprite;
    pulseUntil: number;
  }[] = [];

  // Shooting stars
  private meteor: { line: THREE.Line; pos: THREE.Vector3; vel: THREE.Vector3; life: number } | null = null;
  private nextMeteorAt = 0;

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
    this.constellationsDiscovered = new Set(opts.constellationsDiscovered);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // Filmic tone mapping = rich, photo-like planet colors
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
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
    const sunLight = new THREE.PointLight(0xfff2cc, 3400, 0, 1.6);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
    // lower ambient → real lit/dark planet sides, without losing far planets
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    this.buildBodies(opts.earthTexture);
    this.buildAsteroidBelt();
    this.buildComet();
    this.buildIss();
    this.buildAstronaut();
    this.buildHubble();
    this.buildAndromeda();
    this.buildConstellations();

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
        // drifting cloud layer above the continents
        const clouds = new THREE.Mesh(
          new THREE.SphereGeometry(spec.radius * 1.035, 48, 48),
          new THREE.MeshStandardMaterial({
            map: makeCloudTexture(8),
            transparent: true,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
          })
        );
        clouds.position.copy(mesh.position);
        group.add(clouds);
        this.earthClouds = clouds;
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

  // ─── Extra space objects ───────────────────────────────────────────────────

  private buildAsteroidBelt() {
    const spec = SPACE_OBJECTS.find((o) => o.id === "asteroid-belt")!;
    const group = new THREE.Group();
    const rng = mulberry32(19);
    const COUNT = 380;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: spec.baseColor, roughness: 1, metalness: 0 });
    const belt = new THREE.InstancedMesh(geo, mat, COUNT);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const r = 22.4 + rng() * 2.2;
      dummy.position.set(Math.cos(a) * r, (rng() - 0.5) * 1.1, Math.sin(a) * r);
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      const s = 0.07 + rng() * 0.17;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      belt.setMatrixAt(i, dummy.matrix);
    }
    belt.instanceMatrix.needsUpdate = true;
    group.add(belt);

    // invisible pick target: a flat torus covering the ring
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(23.5, 1.7, 8, 64),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    torus.rotation.x = Math.PI / 2;
    torus.userData.bodyId = spec.id;
    group.add(torus);
    this.extraPickMeshes.push(torus);

    // label + star at a fixed anchor on the ring
    const anchor = new THREE.Object3D();
    anchor.position.set(23.5, 1.4, 0);
    group.add(anchor);
    const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
    label.scale.multiplyScalar(3.0);
    label.position.set(23.5, 3.0, 0);
    group.add(label);
    const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
    star.scale.multiplyScalar(1.7);
    star.position.set(23.5, 1.2, 2.2);
    star.visible = this.discovered.has(spec.id);
    group.add(star);
    this.extraStars.set(spec.id, star);
    this.focusTargets.set(spec.id, { obj: anchor, dist: 16 });

    this.scene.add(group);
    this.beltGroup = group;
  }

  private buildComet() {
    const spec = SPACE_OBJECTS.find((o) => o.id === "comet")!;
    const group = new THREE.Group();
    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 24),
      new THREE.MeshStandardMaterial({ color: spec.baseColor, roughness: 0.6 })
    );
    nucleus.userData.bodyId = spec.id;
    group.add(nucleus);
    this.extraPickMeshes.push(nucleus);

    const tail = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture("rgba(190,220,255,0.9)", "rgba(140,190,255,0)", 256),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    tail.scale.set(14, 3.2, 1);
    group.add(tail);

    const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
    label.scale.multiplyScalar(2.6);
    label.position.set(0, 1.8, 0);
    group.add(label);
    const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
    star.scale.multiplyScalar(1.5);
    star.position.set(1.1, 1.1, 0);
    star.visible = this.discovered.has(spec.id);
    group.add(star);
    this.extraStars.set(spec.id, star);
    this.focusTargets.set(spec.id, { obj: nucleus, dist: 7 });

    // dotted elliptical orbit line (sun at one focus)
    const a = 42;
    const e = 0.62;
    const b = a * Math.sqrt(1 - e * e);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * a - a * e, 0, Math.sin(t) * b));
    }
    const orbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x9fc4ee, transparent: true, opacity: 0.16 })
    );
    this.scene.add(orbit);

    this.scene.add(group);
    this.comet = { group, nucleus, tail, angle: 1.1 };
  }

  private buildIss() {
    const spec = SPACE_OBJECTS.find((o) => o.id === "iss")!;
    const earth = this.bodies.find((bb) => bb.spec.id === "earth");
    if (!earth) return;

    // orbit anchor that follows Earth's position inside its orbit group
    const group = new THREE.Group();
    group.position.copy(earth.mesh.position);
    earth.group.add(group);

    const station = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.55, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8edf5, roughness: 0.4, metalness: 0.4 })
    );
    core.rotation.z = Math.PI / 2;
    core.userData.bodyId = spec.id;
    station.add(core);
    this.extraPickMeshes.push(core);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x2456a8, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide,
    });
    for (const dx of [-0.45, 0.45]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.3), panelMat);
      panel.position.set(dx, 0, 0);
      station.add(panel);
    }
    station.position.set(2.05, -0.6, 0);
    group.add(station);

    const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
    label.scale.multiplyScalar(1.7);
    label.position.set(2.05, -0.05, 0);
    group.add(label);
    const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
    star.scale.multiplyScalar(0.9);
    star.position.set(2.6, -0.5, 0);
    star.visible = this.discovered.has(spec.id);
    group.add(star);
    this.extraStars.set(spec.id, star);
    this.focusTargets.set(spec.id, { obj: core, dist: 4.5 });

    this.iss = { group, angle: 0 };
  }

  /** A tiny spacewalking astronaut drifting around the Moon's neighborhood. */
  private buildAstronaut() {
    const spec = SPACE_OBJECTS.find((o) => o.id === "astronaut");
    const earth = this.bodies.find((bb) => bb.spec.id === "earth");
    if (!spec || !earth) return;

    // orbit anchor around Earth (wider than the Moon so they don't collide)
    const group = new THREE.Group();
    group.position.copy(earth.mesh.position);
    earth.group.add(group);

    const figure = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0xf4f6fb, roughness: 0.55, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 4, 10), suit);
    body.userData.bodyId = spec.id;
    figure.add(body);
    this.extraPickMeshes.push(body);
    // golden visor helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), suit);
    helmet.position.y = 0.36;
    figure.add(helmet);
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.15, metalness: 0.7 })
    );
    visor.position.set(0.06, 0.36, 0);
    figure.add(visor);
    // backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.1), new THREE.MeshStandardMaterial({ color: 0xd7dde8, roughness: 0.6 }));
    pack.position.set(-0.16, 0.08, 0);
    figure.add(pack);
    // arms + legs, splayed like a real spacewalk
    const limbMat = suit;
    for (const s of [1, -1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.24, 3, 8), limbMat);
      arm.position.set(0.05, 0.18, s * 0.22);
      arm.rotation.x = s * 1.1;
      figure.add(arm);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 3, 8), limbMat);
      leg.position.set(0, -0.32, s * 0.12);
      leg.rotation.x = s * 0.28;
      figure.add(leg);
    }
    figure.position.set(3.6, 0.9, 0);
    group.add(figure);

    const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
    label.scale.multiplyScalar(1.8);
    label.position.set(3.6, 1.65, 0);
    group.add(label);
    const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
    star.scale.multiplyScalar(0.9);
    star.position.set(4.1, 1.2, 0);
    star.visible = this.discovered.has(spec.id);
    group.add(star);
    this.extraStars.set(spec.id, star);
    this.focusTargets.set(spec.id, { obj: body, dist: 4 });
    this.extraProximity.push({ id: spec.id, obj: body });

    this.astronaut = { group, figure, angle: 2.2 };
  }

  /** The Hubble space telescope on a high Earth orbit. */
  private buildHubble() {
    const spec = SPACE_OBJECTS.find((o) => o.id === "hubble");
    const earth = this.bodies.find((bb) => bb.spec.id === "earth");
    if (!spec || !earth) return;

    const group = new THREE.Group();
    group.position.copy(earth.mesh.position);
    earth.group.add(group);

    const scope = new THREE.Group();
    // silver telescope tube with a dark aperture
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.62, 12),
      new THREE.MeshStandardMaterial({ color: 0xc8d3e6, roughness: 0.35, metalness: 0.6 })
    );
    tube.rotation.z = Math.PI / 2;
    tube.userData.bodyId = spec.id;
    scope.add(tube);
    this.extraPickMeshes.push(tube);
    const aperture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x101828, roughness: 0.8 })
    );
    aperture.rotation.z = Math.PI / 2;
    aperture.position.x = 0.33;
    scope.add(aperture);
    // twin solar wings
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xb4762a, roughness: 0.4, metalness: 0.45, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.5), wingMat);
      wing.position.set(0, 0, s * 0.42);
      scope.add(wing);
    }
    scope.position.set(-2.6, 0.85, 0);
    group.add(scope);

    const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
    label.scale.multiplyScalar(1.7);
    label.position.set(-2.6, 1.5, 0);
    group.add(label);
    const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
    star.scale.multiplyScalar(0.9);
    star.position.set(-2.1, 1.25, 0);
    star.visible = this.discovered.has(spec.id);
    group.add(star);
    this.extraStars.set(spec.id, star);
    this.focusTargets.set(spec.id, { obj: tube, dist: 4 });
    this.extraProximity.push({ id: spec.id, obj: tube });

    this.hubble = { group, angle: 3.6 };
  }

  /** The Andromeda galaxy — a glowing tilted spiral far beyond the planets. */
  private buildAndromeda() {
    const spec = SPACE_OBJECTS.find((o) => o.id === "andromeda");
    if (!spec) return;

    const group = new THREE.Group();
    const dir = new THREE.Vector3(-0.55, 0.42, -0.72).normalize();
    group.position.copy(dir.multiplyScalar(1150));

    // layered glow sprites: bright core + two stretched disk halos
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(255,244,214,0.95)", "rgba(214,190,255,0)", 256),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    core.scale.set(70, 56, 1);
    group.add(core);
    const disk = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(185,168,232,0.75)", "rgba(123,106,208,0)", 256),
      transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    disk.scale.set(220, 84, 1);
    (disk.material as THREE.SpriteMaterial).rotation = -0.5;
    group.add(disk);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(150,140,220,0.4)", "rgba(110,95,200,0)", 256),
      transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(320, 140, 1);
    (halo.material as THREE.SpriteMaterial).rotation = -0.5;
    group.add(halo);

    // invisible pick target
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(85, 10, 10),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    pick.userData.bodyId = spec.id;
    group.add(pick);
    this.extraPickMeshes.push(pick);

    const label = makeTextSprite(spec.nameHebrew, { fontSize: 64 });
    label.scale.multiplyScalar(42);
    label.position.set(0, -125, 0);
    group.add(label);
    const star = makeTextSprite("⭐", { fontSize: 64, stroke: "rgba(0,0,0,0)" });
    star.scale.multiplyScalar(26);
    star.position.set(120, 70, 0);
    star.visible = this.discovered.has(spec.id);
    group.add(star);
    this.extraStars.set(spec.id, star);
    this.focusTargets.set(spec.id, { obj: pick, dist: 430 });
    this.extraProximity.push({ id: spec.id, obj: pick });

    this.scene.add(group);
  }

  // ─── Constellations ────────────────────────────────────────────────────────

  private buildConstellations() {
    const RADIUS = 1250;
    const SIZE = 210;
    const starTex = makeGlowTexture("rgba(255,255,255,0.95)", "rgba(200,215,255,0)", 128);

    for (const c of CONSTELLATIONS) {
      const dir = new THREE.Vector3(
        Math.cos(c.elevation) * Math.cos(c.azimuth),
        Math.sin(c.elevation),
        Math.cos(c.elevation) * Math.sin(c.azimuth)
      );
      const center = dir.clone().multiplyScalar(RADIUS);
      // local plane basis perpendicular to the view direction
      const u = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (u.lengthSq() < 0.01) u.set(1, 0, 0);
      const v = new THREE.Vector3().crossVectors(u, dir).normalize();

      const posOf = (p: [number, number]) =>
        center
          .clone()
          .addScaledVector(u, (p[0] - 0.5) * SIZE)
          .addScaledVector(v, (0.5 - p[1]) * SIZE);

      const group = new THREE.Group();
      for (const p of c.stars) {
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: starTex, transparent: true, opacity: 0.9, depthWrite: false })
        );
        sp.position.copy(posOf(p));
        sp.scale.set(16, 16, 1);
        group.add(sp);
      }

      const linePts: THREE.Vector3[] = [];
      for (const [i, j] of c.lines) {
        linePts.push(posOf(c.stars[i]), posOf(c.stars[j]));
      }
      const discovered = this.constellationsDiscovered.has(c.id);
      const lines = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(linePts),
        new THREE.LineBasicMaterial({
          color: discovered ? 0xffe08a : 0x8fa8e0,
          transparent: true,
          opacity: discovered ? 0.85 : 0.4,
        })
      );
      group.add(lines);

      const nameLabel = makeTextSprite(`${c.emoji} ${c.nameHebrew}`, { fontSize: 64, color: "#ffe9a8" });
      nameLabel.scale.multiplyScalar(34);
      nameLabel.position.copy(center).addScaledVector(v, -SIZE * 0.68);
      nameLabel.visible = discovered;
      group.add(nameLabel);

      const mysteryLabel = makeTextSprite("✨❓", { fontSize: 64 });
      mysteryLabel.scale.multiplyScalar(22);
      mysteryLabel.position.copy(center).addScaledVector(v, -SIZE * 0.68);
      mysteryLabel.visible = !discovered;
      group.add(mysteryLabel);

      this.scene.add(group);
      this.constellationEntries.push({ id: c.id, center, lines, nameLabel, mysteryLabel, pulseUntil: 0 });
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setDiscovered(discovered: Set<string>) {
    this.discovered = new Set(discovered);
    for (const b of this.bodies) b.star.visible = this.discovered.has(b.spec.id);
    for (const [id, star] of this.extraStars) star.visible = this.discovered.has(id);
  }

  setConstellationsDiscovered(discovered: Set<string>) {
    this.constellationsDiscovered = new Set(discovered);
    for (const e of this.constellationEntries) {
      const on = this.constellationsDiscovered.has(e.id);
      const mat = e.lines.material as THREE.LineBasicMaterial;
      mat.color.set(on ? 0xffe08a : 0x8fa8e0);
      mat.opacity = on ? 0.85 : 0.4;
      e.nameLabel.visible = on;
      e.mysteryLabel.visible = !on;
    }
  }

  /** Briefly pulse a constellation's lines (used on tap). */
  highlightConstellation(id: string) {
    const e = this.constellationEntries.find((c) => c.id === id);
    if (e) e.pulseUntil = performance.now() + 2400;
  }

  /** True while a shooting star is streaking across the sky. */
  hasActiveMeteor(): boolean {
    return this.meteor !== null;
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
    const meshes = [...this.bodies.map((b) => b.mesh), ...this.extraPickMeshes];
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.bodyId as string;
      return { id, screenX: clientX, screenY: clientY };
    }

    const project = (obj: THREE.Object3D): [number, number] => {
      const v = new THREE.Vector3();
      obj.getWorldPosition(v);
      v.project(this.camera);
      return [((v.x + 1) / 2) * rect.width + rect.left, ((1 - v.y) / 2) * rect.height + rect.top];
    };

    // generous helper: nearest body within ~46px on screen
    let best: string | null = null;
    let bestPx = 46;
    const smallTargets: { id: string; obj: THREE.Object3D }[] = [
      ...this.bodies.map((b) => ({ id: b.spec.id, obj: b.mesh as THREE.Object3D })),
      ...(this.comet ? [{ id: "comet", obj: this.comet.nucleus as THREE.Object3D }] : []),
      ...(this.iss ? [{ id: "iss", obj: this.focusTargets.get("iss")!.obj }] : []),
      ...this.extraProximity,
    ];
    for (const t of smallTargets) {
      const [sx, sy] = project(t.obj);
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestPx) {
        bestPx = d;
        best = t.id;
      }
    }
    if (best) return { id: best, screenX: clientX, screenY: clientY };

    // constellations: tap near the pattern center on screen
    let bestConst: string | null = null;
    let bestConstPx = 85;
    const cv = new THREE.Vector3();
    for (const e of this.constellationEntries) {
      cv.copy(e.center).project(this.camera);
      if (cv.z > 1) continue; // behind the camera
      const sx = ((cv.x + 1) / 2) * rect.width + rect.left;
      const sy = ((1 - cv.y) / 2) * rect.height + rect.top;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestConstPx) {
        bestConstPx = d;
        bestConst = e.id;
      }
    }
    return bestConst ? { id: bestConst, screenX: clientX, screenY: clientY } : null;
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

    // Clouds drift a bit faster than the ground below them
    if (this.earthClouds) this.earthClouds.rotation.y += dt * 0.4 * speedScale;

    // Asteroid belt slowly churns
    if (this.beltGroup) this.beltGroup.rotation.y += dt * 0.02 * speedScale;

    // Comet on its elliptical orbit; tail always points away from the sun
    if (this.comet) {
      this.comet.angle += dt * 0.14 * speedScale;
      const a = 42;
      const e = 0.62;
      const b = a * Math.sqrt(1 - e * e);
      const px = Math.cos(this.comet.angle) * a - a * e;
      const pz = Math.sin(this.comet.angle) * b;
      this.comet.group.position.set(px, 0, pz);
      const away = new THREE.Vector3(px, 0, pz).normalize();
      this.comet.tail.position.copy(away.clone().multiplyScalar(6.2));
      // rotate the sprite in screen space to line up with the away direction
      const p0 = this.comet.group.position.clone().project(this.camera);
      const p1 = this.comet.group.position.clone().addScaledVector(away, 8).project(this.camera);
      const mat = this.comet.tail.material as THREE.SpriteMaterial;
      mat.rotation = Math.atan2(-(p1.y - p0.y), p1.x - p0.x);
      // brighter near the sun
      const rNow = Math.hypot(px, pz);
      mat.opacity = THREE.MathUtils.clamp(1.35 - rNow / 60, 0.25, 0.95);
    }

    // ISS zips around Earth
    if (this.iss) {
      this.iss.angle += dt * 1.1 * speedScale;
      this.iss.group.rotation.y = this.iss.angle;
    }

    // The astronaut drifts lazily around Earth, tumbling gently
    if (this.astronaut) {
      this.astronaut.angle += dt * 0.35 * speedScale;
      this.astronaut.group.rotation.y = this.astronaut.angle;
      const t = performance.now() / 1000;
      this.astronaut.figure.rotation.z = Math.sin(t * 0.7) * 0.5;
      this.astronaut.figure.rotation.x = Math.cos(t * 0.5) * 0.35;
      this.astronaut.figure.position.y = 0.9 + Math.sin(t * 1.1) * 0.18;
    }

    // Hubble on its high, slow orbit (opposite direction from the ISS)
    if (this.hubble) {
      this.hubble.angle -= dt * 0.5 * speedScale;
      this.hubble.group.rotation.y = this.hubble.angle;
    }

    // Shooting stars ✨
    const nowSec = performance.now() / 1000;
    if (!this.reducedMotion) {
      if (!this.meteor && nowSec > this.nextMeteorAt) {
        const rng = Math.random;
        const dir = new THREE.Vector3(rng() * 2 - 1, 0.35 + rng() * 0.5, rng() * 2 - 1).normalize();
        const pos = dir.multiplyScalar(700);
        const vel = new THREE.Vector3(rng() * 2 - 1, -(0.4 + rng() * 0.5), rng() * 2 - 1)
          .normalize()
          .multiplyScalar(520);
        const geo = new THREE.BufferGeometry().setFromPoints([pos, pos]);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: 0xfff4cc,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
          })
        );
        this.scene.add(line);
        this.meteor = { line, pos, vel, life: 1.3 };
      }
      if (this.meteor) {
        this.meteor.life -= dt;
        this.meteor.pos.addScaledVector(this.meteor.vel, dt);
        const tailPos = this.meteor.pos.clone().addScaledVector(this.meteor.vel, -0.16);
        this.meteor.line.geometry.setFromPoints([this.meteor.pos, tailPos]);
        (this.meteor.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, this.meteor.life);
        if (this.meteor.life <= 0) {
          this.scene.remove(this.meteor.line);
          this.meteor.line.geometry.dispose();
          (this.meteor.line.material as THREE.Material).dispose();
          this.meteor = null;
          this.nextMeteorAt = nowSec + 5 + Math.random() * 9;
        }
      }
    }

    // Constellation tap pulse
    const nowMs = performance.now();
    for (const e of this.constellationEntries) {
      if (e.pulseUntil > nowMs) {
        const mat = e.lines.material as THREE.LineBasicMaterial;
        mat.opacity = 0.6 + 0.4 * Math.sin(nowMs / 130);
      } else if (e.pulseUntil !== 0) {
        e.pulseUntil = 0;
        const on = this.constellationsDiscovered.has(e.id);
        (e.lines.material as THREE.LineBasicMaterial).opacity = on ? 0.85 : 0.4;
      }
    }

    // Sun glow breathing
    if (this.sunGlow) {
      const t = performance.now() / 1000;
      const s = 5.4 + Math.sin(t * 1.4) * 0.25;
      const sunR = this.bodies[0].spec.radius;
      this.sunGlow.scale.set(sunR * s, sunR * s, 1);
    }

    // Camera: follow focus (planet or extra object) or orbit origin
    const desiredTarget = new THREE.Vector3(0, 0, 0);
    let desiredDist = this.camDist;
    if (this.focusId) {
      const b = this.bodies.find((bb) => bb.spec.id === this.focusId);
      if (b) {
        b.mesh.getWorldPosition(desiredTarget);
        desiredDist = Math.max(CAM_MIN, b.spec.radius * 5.2);
      } else {
        const extra = this.focusTargets.get(this.focusId);
        if (extra) {
          extra.obj.getWorldPosition(desiredTarget);
          // allow flying closer than the free-navigation minimum (the ISS is tiny)
          desiredDist = Math.max(2.5, extra.dist);
        }
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
