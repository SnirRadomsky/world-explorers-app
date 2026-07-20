// Country diorama stage: a floating island with a famous landmark, a local
// animal and nature — slowly rotating, draggable, and tappable. Countries
// without a full recipe get a charming emoji diorama instead.

import * as THREE from "three";
import {
  buildLandmark,
  buildAnimal,
  buildNature,
  BIOME_COLORS,
  SKY_GRADIENTS,
} from "./dioramaKit";
import type { DioramaRecipe } from "../data/dioramas";
import type { BiomeId, SkyId, NatureId } from "./dioramaKit";
import { makeCanvas, makeTextSprite, mulberry32 } from "./proceduralTextures";
import {
  setNatureTheme,
  themeForBiome,
  paintedGroundCylinder,
  hasNatureSprite,
  natureBillboard,
} from "./natureAssets";

export type DioramaPickKind = "landmark" | "animal" | "nature";

export interface DioramaOptions {
  recipe: DioramaRecipe | null;
  /** fallback content when there is no full recipe */
  fallback?: { emojis: string; flagEmoji: string; biome: BiomeId; sky: SkyId; nature: NatureId };
  reducedMotion: boolean;
  onPick: (kind: DioramaPickKind | null) => void;
}

export class DioramaScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();

  private stage = new THREE.Group();
  private animalGroup: THREE.Group | null = null;
  private spinner: THREE.Object3D | null = null;
  private emojiSprites: THREE.Sprite[] = [];

  private onPick: (kind: DioramaPickKind | null) => void;
  private reducedMotion: boolean;

  private pointers = new Map<number, { x: number; y: number }>();
  private moved = 0;
  private downTime = 0;
  private userYaw = 0;
  private autoYaw = 0;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: DioramaOptions) {
    this.container = container;
    this.onPick = opts.onPick;
    this.reducedMotion = opts.reducedMotion;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    this.scene = new THREE.Scene();

    // sky: painted vertical gradient
    const sky = opts.recipe?.sky ?? opts.fallback?.sky ?? "day";
    const [top, mid, bottom] = SKY_GRADIENTS[sky];
    const [skyCanvas, skyCtx] = makeCanvas(4, 256);
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, bottom);
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 4, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = skyTex;

    this.camera = new THREE.PerspectiveCamera(
      46,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );
    this.camera.position.set(0, 3.4, 10.5);
    this.camera.lookAt(0, 1.3, 0);

    // lights
    this.scene.add(new THREE.AmbientLight(0xffffff, sky === "dusk" ? 0.7 : 1.0));
    const sun = new THREE.DirectionalLight(sky === "sunset" ? 0xffd9a8 : 0xffffff, sky === "dusk" ? 0.9 : 1.5);
    sun.position.set(5, 9, 6);
    this.scene.add(sun);

    this.buildStage(opts);
    this.scene.add(this.stage);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerCancel);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  private buildStage(opts: DioramaOptions) {
    const biome = opts.recipe?.biome ?? opts.fallback?.biome ?? "grass";
    const colors = BIOME_COLORS[biome];
    const theme = setNatureTheme(themeForBiome(biome));
    const rng = mulberry32(17);

    // floating island ground: painted top + earthy underside
    const ground = paintedGroundCylinder(5.2, 4.6, 0.7, theme);
    ground.position.y = -0.35;
    this.stage.add(ground);
    const under = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 2.6, 24),
      new THREE.MeshStandardMaterial({ color: "#6e5137", flatShading: true, roughness: 1 })
    );
    under.rotation.x = Math.PI;
    under.position.y = -2.0;
    this.stage.add(under);

    // scattered ground details: painted tufts / rocks when available
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2;
      const r = 1.5 + rng() * 3.2;
      const detailKind = biome === "snow" || biome === "rock" || biome === "sand"
        ? "rock"
        : i % 3 === 0
          ? "flowers"
          : "grass";
      if (hasNatureSprite(detailKind) && i % 2 === 0) {
        const bb = natureBillboard(detailKind, 0.35 + rng() * 0.25, { widthScale: 0.9 });
        if (bb) {
          bb.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
          this.stage.add(bb);
          continue;
        }
      }
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + rng() * 0.09, 5, 5),
        new THREE.MeshStandardMaterial({ color: colors.detail, flatShading: true, roughness: 1 })
      );
      d.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
      this.stage.add(d);
    }

    if (opts.recipe) {
      const landmark = buildLandmark(opts.recipe.landmark);
      landmark.position.set(-0.4, 0, -1.4);
      landmark.traverse((o) => (o.userData.pickKind = "landmark"));
      this.stage.add(landmark);
      this.spinner = landmark.getObjectByName("spinner") ?? null;

      const animal = buildAnimal(opts.recipe.animal);
      animal.position.set(2.4, 0, 1.6);
      animal.rotation.y = -0.7;
      animal.traverse((o) => (o.userData.pickKind = "animal"));
      this.stage.add(animal);
      this.animalGroup = animal;

      const naturePiece = buildNature(opts.recipe.nature);
      naturePiece.position.set(-2.9, 0, 1.3);
      naturePiece.traverse((o) => (o.userData.pickKind = "nature"));
      this.stage.add(naturePiece);
    } else if (opts.fallback) {
      // emoji diorama: nature piece + big floating country emojis + flag
      const naturePiece = buildNature(opts.fallback.nature);
      naturePiece.position.set(-2.6, 0, 0.9);
      naturePiece.traverse((o) => (o.userData.pickKind = "nature"));
      this.stage.add(naturePiece);

      const emojis = [...(opts.fallback.emojis || "🌍")].filter((ch) => ch.trim().length > 0);
      const shown = emojis.slice(0, 3);
      shown.forEach((emoji, i) => {
        const sprite = makeTextSprite(emoji, { fontSize: 128, stroke: "rgba(0,0,0,0)" });
        sprite.scale.multiplyScalar(1.9);
        sprite.position.set(-1.4 + i * 1.6, 1.9 + (i % 2) * 0.5, 0.3 - i * 0.4);
        sprite.userData.pickKind = "landmark";
        this.stage.add(sprite);
        this.emojiSprites.push(sprite);
      });
      const flag = makeTextSprite(opts.fallback.flagEmoji, { fontSize: 128, stroke: "rgba(0,0,0,0)" });
      flag.scale.multiplyScalar(1.4);
      flag.position.set(2.6, 2.6, -0.6);
      flag.userData.pickKind = "landmark";
      this.stage.add(flag);
      this.emojiSprites.push(flag);

      // a flagpole for charm
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: "#8a8f98", roughness: 0.5, metalness: 0.4 })
      );
      pole.position.set(2.6, 1.2, -0.6);
      this.stage.add(pole);
    }

    // drifting puffy clouds around the island
    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.35 + rng() * 0.25, 7, 7),
          new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, opacity: 0.92 })
        );
        puff.position.set(j * 0.45 - 0.45, (rng() - 0.5) * 0.15, 0);
        cloud.add(puff);
      }
      const a = (i / 4) * Math.PI * 2;
      cloud.position.set(Math.cos(a) * 6.4, 2.4 + rng() * 1.6, Math.sin(a) * 6.4);
      this.stage.add(cloud);
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

  private pickAt(clientX: number, clientY: number): DioramaPickKind | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.stage.children, true);
    for (const hit of hits) {
      const kind = hit.object.userData.pickKind as DioramaPickKind | undefined;
      if (kind) return kind;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.moved = 0;
    this.downTime = performance.now();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId)!;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const dx = e.clientX - prev.x;
    this.moved += Math.abs(dx) + Math.abs(e.clientY - prev.y);
    this.userYaw += dx * 0.006;
  };

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.moved < 9 && performance.now() - this.downTime < 600) {
      this.onPick(this.pickAt(e.clientX, e.clientY));
    }
  };

  private onPointerCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
  };

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = performance.now() / 1000;

    if (!this.reducedMotion && this.pointers.size === 0) this.autoYaw += dt * 0.12;
    this.stage.rotation.y = this.autoYaw + this.userYaw;

    // island bobs gently
    this.stage.position.y = this.reducedMotion ? 0 : Math.sin(t * 0.7) * 0.08;

    // the animal idles: little bounce + head bob
    if (this.animalGroup && !this.reducedMotion) {
      this.animalGroup.position.y = Math.abs(Math.sin(t * 2.2)) * 0.07;
      const head = this.animalGroup.getObjectByName("head");
      if (head) head.rotation.z = Math.sin(t * 1.4) * 0.08;
    }

    // windmill blades spin
    if (this.spinner && !this.reducedMotion) this.spinner.rotation.z += dt * 1.2;

    // emoji sprites bob
    this.emojiSprites.forEach((s, i) => {
      s.position.y += Math.sin(t * 1.3 + i * 1.8) * 0.0035;
    });

    this.renderer.render(this.scene, this.camera);
  };
}
