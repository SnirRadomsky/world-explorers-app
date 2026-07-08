// 3D Earth globe engine: paints the world from bundled TopoJSON onto a canvas
// texture, renders it on a sphere with atmosphere + stars, and supports
// kid-friendly touch interaction (rotate/pinch/tap-pick/fly-to/pulse).

import * as THREE from "three";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import {
  geoEquirectangular,
  geoPath,
  geoContains,
  geoCentroid,
  geoBounds,
  geoDistance,
} from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { CONTINENTS } from "../data/continents";
import { getContinentId } from "../data/continentMapping";
import { COUNTRY_BY_ID } from "../data/countries";
import { makeStarField, addNebulae, makeAtmosphere } from "./proceduralTextures";

export type GlobeMode = "continents" | "countries";

export interface GlobePick {
  kind: GlobeMode;
  id: string;
  screenX: number;
  screenY: number;
}

export interface GlobeSceneOptions {
  mode: GlobeMode;
  discovered: Set<string>;
  night: boolean;
  reducedMotion: boolean;
  onPick: (pick: GlobePick | null) => void;
  onMaxZoomOut?: () => void;
}

interface CountryFeature {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
  // Pre-computed helpers:
  centroid: [number, number];
  bounds: [[number, number], [number, number]];
}

const R = 100;                 // globe radius (scene units)
const TEX_W = 3072;
const TEX_H = 1536;
const CAM_MIN = 152;           // closest dolly
const CAM_MAX_BASE = 420;      // farthest dolly (raised on narrow screens so the globe fits)
const CONTINENT_COLOR: Record<string, string> = Object.fromEntries(
  CONTINENTS.map((c) => [c.id, c.color])
);

function hashShift(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 100) / 100 - 0.5) * 0.12; // ±0.06 lightness shift
}

function shadeColor(hex: string, dl: number, ds = 0): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, Math.max(0, hsl.s + ds)), Math.min(1, Math.max(0, hsl.l + dl)));
  return `#${c.getHexString()}`;
}

function desaturate(hex: string): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.45, Math.min(1, hsl.l * 1.25 + 0.08));
  return `#${c.getHexString()}`;
}

/** lat/lng → unit position on the three.js sphere (see SphereGeometry UV math). */
export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((lng + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Inverse of latLngToVec3 for a point in globe-local space. */
export function vec3ToLatLng(p: THREE.Vector3): { lat: number; lng: number } {
  const r = p.length();
  const theta = Math.acos(Math.min(1, Math.max(-1, p.y / r)));
  const lat = 90 - (theta * 180) / Math.PI;
  let phi = Math.atan2(p.z, -p.x);
  if (phi < 0) phi += Math.PI * 2;
  const lng = (phi * 180) / Math.PI - 180;
  return { lat, lng };
}

function inBounds(lng: number, lat: number, b: [[number, number], [number, number]], pad = 0.5): boolean {
  const [[minLng, minLat], [maxLng, maxLat]] = b;
  if (lat < minLat - pad || lat > maxLat + pad) return false;
  if (minLng <= maxLng) return lng >= minLng - pad && lng <= maxLng + pad;
  // antimeridian-crossing bbox (e.g. Russia, Fiji)
  return lng >= minLng - pad || lng <= maxLng + pad;
}

export class GlobeScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private globeGroup: THREE.Group;
  private globeMesh!: THREE.Mesh;
  private overlayMesh!: THREE.Mesh;
  private atmosphere!: THREE.Mesh;

  private baseCanvas!: HTMLCanvasElement;
  private baseCtx!: CanvasRenderingContext2D;
  private baseTexture!: THREE.CanvasTexture;
  private overlayCanvas!: HTMLCanvasElement;
  private overlayCtx!: CanvasRenderingContext2D;
  private overlayTexture!: THREE.CanvasTexture;

  private projection = geoEquirectangular()
    .scale(TEX_W / (2 * Math.PI))
    .translate([TEX_W / 2, TEX_H / 2]);
  private pathGen = geoPath(this.projection);

  private features: CountryFeature[] = [];
  private raycaster = new THREE.Raycaster();

  private mode: GlobeMode;
  private discovered: Set<string>;
  private night: boolean;
  private reducedMotion: boolean;
  private onPick: (pick: GlobePick | null) => void;
  private onMaxZoomOut?: () => void;

  // interaction state
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartZ = 0;
  private velocity = { x: 0, y: 0 };
  private moved = 0;
  private downTime = 0;
  private lastInteraction = 0;
  private maxZoomOutFired = false;

  // fly-to animation
  private flyTarget: { rx: number; ry: number; z: number } | null = null;

  // pulse (quiz hint)
  private pulseUntil = 0;

  private disposed = false;
  private animHandle = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;
  private camMax = CAM_MAX_BASE;

  constructor(container: HTMLElement, topo: Topology, opts: GlobeSceneOptions) {
    this.container = container;
    this.mode = opts.mode;
    this.discovered = new Set(opts.discovered);
    this.night = opts.night;
    this.reducedMotion = opts.reducedMotion;
    this.onPick = opts.onPick;
    this.onMaxZoomOut = opts.onMaxZoomOut;

    // ── Features from TopoJSON ──
    const collection = topoFeature(
      topo,
      topo.objects.countries
    ) as unknown as { features: Array<{ type: "Feature"; id: string | number; geometry: GeoJSON.Geometry; properties: Record<string, unknown> }> };
    this.features = collection.features
      .filter((f) => f.geometry)
      .map((f) => {
        const geo = f as unknown as GeoPermissibleObjects;
        return {
          type: "Feature" as const,
          id: String(f.id),
          geometry: f.geometry,
          properties: f.properties ?? {},
          centroid: geoCentroid(geo) as [number, number],
          bounds: geoBounds(geo) as [[number, number], [number, number]],
        };
      });

    // ── Renderer / scene / camera ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#070c1e");

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      1,
      4000
    );
    this.camMax = Math.max(CAM_MAX_BASE, this.fitDistance() * 1.15);
    this.camera.position.set(0, 0, this.fitDistance());

    // ── Lights ──
    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(-180, 130, 240);
    this.scene.add(ambient, dir);

    // ── Stars + nebulae ──
    this.scene.add(makeStarField(2200, 900, 1800, 11));
    addNebulae(this.scene, 3, 3, 1300);

    // ── Globe ──
    this.globeGroup = new THREE.Group();
    this.scene.add(this.globeGroup);
    this.buildGlobe();

    // ── Atmosphere ──
    this.atmosphere = makeAtmosphere(R * 1.18, 0x5aa7ff, 1.0);
    this.scene.add(this.atmosphere);

    // ── Events ──
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerCancel);
    el.addEventListener("wheel", this.onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.paintBase();
    this.lastInteraction = performance.now();
    this.animate();
  }

  // ─── Scene construction ────────────────────────────────────────────────────

  private buildGlobe() {
    this.baseCanvas = document.createElement("canvas");
    this.baseCanvas.width = TEX_W;
    this.baseCanvas.height = TEX_H;
    this.baseCtx = this.baseCanvas.getContext("2d")!;

    this.baseTexture = new THREE.CanvasTexture(this.baseCanvas);
    this.baseTexture.colorSpace = THREE.SRGBColorSpace;
    this.baseTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    const globeGeo = new THREE.SphereGeometry(R, 96, 96);
    const globeMat = new THREE.MeshPhongMaterial({
      map: this.baseTexture,
      shininess: 12,
      specular: new THREE.Color("#1c2c44"),
    });
    this.globeMesh = new THREE.Mesh(globeGeo, globeMat);
    this.globeGroup.add(this.globeMesh);

    // Selection overlay sphere (slightly larger, transparent)
    this.overlayCanvas = document.createElement("canvas");
    this.overlayCanvas.width = TEX_W;
    this.overlayCanvas.height = TEX_H;
    this.overlayCtx = this.overlayCanvas.getContext("2d")!;
    this.overlayTexture = new THREE.CanvasTexture(this.overlayCanvas);
    this.overlayTexture.colorSpace = THREE.SRGBColorSpace;

    const overlayGeo = new THREE.SphereGeometry(R * 1.004, 96, 96);
    const overlayMat = new THREE.MeshBasicMaterial({
      map: this.overlayTexture,
      transparent: true,
      depthWrite: false,
    });
    this.overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
    this.globeGroup.add(this.overlayMesh);
  }

  // ─── Texture painting ──────────────────────────────────────────────────────

  private fillForFeature(id: string): { fill: string; skip: boolean } {
    if (this.mode === "continents") {
      const cid = getContinentId(id);
      const base = CONTINENT_COLOR[cid] ?? "#cbd5e1";
      const isDiscovered = this.discovered.has(cid);
      return { fill: isDiscovered ? base : desaturate(base), skip: false };
    }
    const country = COUNTRY_BY_ID.get(id);
    if (!country) return { fill: this.night ? "#3a4358" : "#d7dde6", skip: true };
    const base = shadeColor(CONTINENT_COLOR[country.continentId] ?? "#cbd5e1", hashShift(id));
    const isDiscovered = this.discovered.has(id);
    return { fill: isDiscovered ? base : desaturate(base), skip: false };
  }

  private paintOcean(ctx: CanvasRenderingContext2D) {
    if (this.night) {
      const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
      g.addColorStop(0, "#0b1533");
      g.addColorStop(0.5, "#0e1d42");
      g.addColorStop(1, "#0b1533");
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
      g.addColorStop(0, "#7ec3ea");
      g.addColorStop(0.5, "#3d9bd8");
      g.addColorStop(1, "#7ec3ea");
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, TEX_W, TEX_H);

    // faint graticule
    ctx.strokeStyle = this.night ? "rgba(120,150,220,0.10)" : "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.5;
    for (let lng = -150; lng <= 180; lng += 30) {
      const x = ((lng + 180) / 360) * TEX_W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TEX_H);
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = ((90 - lat) / 180) * TEX_H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TEX_W, y);
      ctx.stroke();
    }
  }

  private paintFeature(ctx: CanvasRenderingContext2D, f: CountryFeature) {
    const { fill } = this.fillForFeature(f.id);
    ctx.beginPath();
    this.pathGen.context(ctx as unknown as CanvasRenderingContext2D)(f as unknown as GeoPermissibleObjects);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = this.night ? "rgba(190,210,255,0.85)" : "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private paintStar(ctx: CanvasRenderingContext2D, lngLat: [number, number], size: number) {
    const pt = this.projection(lngLat);
    if (!pt) return;
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐", pt[0], pt[1]);
  }

  /** Full repaint of the base texture. */
  paintBase() {
    const ctx = this.baseCtx;
    this.paintOcean(ctx);
    for (const f of this.features) this.paintFeature(ctx, f);

    // Discovery stars
    if (this.mode === "continents") {
      for (const c of CONTINENTS) {
        if (!this.discovered.has(c.id)) continue;
        const f = this.features.find((ff) => getContinentId(ff.id) === c.id);
        void f;
        // continent star at a representative centroid (mean of member centroids)
        const members = this.features.filter((ff) => getContinentId(ff.id) === c.id);
        if (members.length === 0) continue;
        let bestLng = 0;
        let bestLat = 0;
        let bestArea = -1;
        for (const m of members) {
          const area = Math.abs(
            (m.bounds[1][0] - m.bounds[0][0]) * (m.bounds[1][1] - m.bounds[0][1])
          );
          if (area > bestArea) {
            bestArea = area;
            bestLng = m.centroid[0];
            bestLat = m.centroid[1];
          }
        }
        this.paintStar(ctx, [bestLng, bestLat], 44);
      }
    } else {
      for (const f of this.features) {
        if (COUNTRY_BY_ID.has(f.id) && this.discovered.has(f.id)) {
          this.paintStar(ctx, f.centroid, 20);
        }
      }
    }

    this.baseTexture.needsUpdate = true;
  }

  /** Incremental: repaint one feature (or a continent's features) as discovered. */
  private repaintDiscovered(id: string) {
    const ctx = this.baseCtx;
    if (this.mode === "continents") {
      for (const f of this.features) {
        if (getContinentId(f.id) === id) this.paintFeature(ctx, f);
      }
    } else {
      const f = this.features.find((ff) => ff.id === id);
      if (f) {
        this.paintFeature(ctx, f);
        this.paintStar(ctx, f.centroid, 20);
      }
    }
    this.baseTexture.needsUpdate = true;
  }

  /** Draw the selection/pulse highlight for a region. */
  private paintOverlay(id: string | null) {
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    if (!id) {
      this.overlayTexture.needsUpdate = true;
      return;
    }
    const targets =
      this.mode === "continents"
        ? this.features.filter((f) => getContinentId(f.id) === id)
        : this.features.filter((f) => f.id === id);

    for (const f of targets) {
      ctx.beginPath();
      this.pathGen.context(ctx as unknown as CanvasRenderingContext2D)(f as unknown as GeoPermissibleObjects);
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.fill();
      ctx.strokeStyle = "#ffe95e";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    this.overlayTexture.needsUpdate = true;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setMode(mode: GlobeMode, discovered: Set<string>) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.discovered = new Set(discovered);
    this.paintBase();
    this.paintOverlay(null);
  }

  setDiscovered(discovered: Set<string>) {
    const added: string[] = [];
    for (const id of discovered) if (!this.discovered.has(id)) added.push(id);
    const removed = this.discovered.size > discovered.size;
    this.discovered = new Set(discovered);
    if (removed || added.length > 3) {
      this.paintBase();
    } else {
      for (const id of added) this.repaintDiscovered(id);
    }
  }

  setNight(night: boolean) {
    if (this.night === night) return;
    this.night = night;
    this.scene.background = new THREE.Color(night ? "#03040c" : "#070c1e");
    this.paintBase();
  }

  setSelected(id: string | null) {
    this.pulseUntil = 0;
    (this.overlayMesh.material as THREE.MeshBasicMaterial).opacity = 1;
    this.paintOverlay(id);
  }

  /** Quiz hint: highlight the target and pulse it for `ms` milliseconds. */
  pulse(id: string, ms = 2600) {
    this.paintOverlay(id);
    this.pulseUntil = performance.now() + ms;
  }

  /** Smoothly rotate the globe so (lat,lng) faces the camera. */
  flyTo(lat: number, lng: number, zoomZ?: number) {
    const lngRad = (lng * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    let ry = -Math.PI / 2 - lngRad;
    // choose equivalent angle nearest to current rotation for shortest path
    const cur = this.globeGroup.rotation.y;
    while (ry - cur > Math.PI) ry -= Math.PI * 2;
    while (ry - cur < -Math.PI) ry += Math.PI * 2;
    const rx = Math.min(Math.PI / 3, Math.max(-Math.PI / 3, latRad));
    this.flyTarget = { rx, ry, z: zoomZ ?? Math.min(this.camera.position.z, 260) };
  }

  /** Fly to a region id (country or continent) using its centroid. */
  flyToRegion(id: string) {
    if (this.mode === "continents") {
      const members = this.features.filter((f) => getContinentId(f.id) === id);
      if (members.length === 0) return;
      let bestLng = 0, bestLat = 0, bestArea = -1;
      for (const m of members) {
        const area = Math.abs((m.bounds[1][0] - m.bounds[0][0]) * (m.bounds[1][1] - m.bounds[0][1]));
        if (area > bestArea) { bestArea = area; bestLng = m.centroid[0]; bestLat = m.centroid[1]; }
      }
      this.flyTo(bestLat, bestLng, 300);
    } else {
      const f = this.features.find((ff) => ff.id === id);
      if (f) this.flyTo(f.centroid[1], f.centroid[0], 220);
    }
  }

  /** Camera distance at which the whole globe (plus margin) fits the viewport. */
  private fitDistance(): number {
    const halfV = Math.tan((this.camera.fov * Math.PI) / 360);
    const aspect = Math.max(0.2, this.camera.aspect || 1);
    const vertical = (R * 1.25) / halfV;
    const horizontal = (R * 1.18) / (halfV * aspect);
    return Math.min(900, Math.max(vertical, horizontal));
  }

  resize() {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.camMax = Math.max(CAM_MAX_BASE, this.fitDistance() * 1.15);
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
    this.baseTexture.dispose();
    this.overlayTexture.dispose();
    this.renderer.dispose();
    el.remove();
  }

  // ─── Picking ───────────────────────────────────────────────────────────────

  private pickAt(clientX: number, clientY: number): GlobePick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.globeMesh, false);
    if (hits.length === 0) return null;

    const local = this.globeMesh.worldToLocal(hits[0].point.clone());
    const { lat, lng } = vec3ToLatLng(local);

    // Exact containment first
    for (const f of this.features) {
      if (!inBounds(lng, lat, f.bounds)) continue;
      if (geoContains(f as unknown as GeoPermissibleObjects, [lng, lat])) {
        return this.pickFromFeature(f, clientX, clientY);
      }
    }

    // Tiny-country helper: nearest centroid within tolerance (zoom-aware)
    const zoomT = (this.camera.position.z - CAM_MIN) / (this.camMax - CAM_MIN);
    const tolRad = ((2.2 + zoomT * 3.2) * Math.PI) / 180; // 2.2°–5.4°
    let best: CountryFeature | null = null;
    let bestDist = tolRad;
    for (const f of this.features) {
      if (this.mode === "countries" && !COUNTRY_BY_ID.has(f.id)) continue;
      const d = geoDistance([lng, lat], f.centroid);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    return best ? this.pickFromFeature(best, clientX, clientY) : null;
  }

  private pickFromFeature(f: CountryFeature, screenX: number, screenY: number): GlobePick | null {
    if (this.mode === "continents") {
      const cid = getContinentId(f.id);
      if (!CONTINENT_COLOR[cid]) return null;
      return { kind: "continents", id: cid, screenX, screenY };
    }
    if (!COUNTRY_BY_ID.has(f.id)) return null;
    return { kind: "countries", id: f.id, screenX, screenY };
  }

  // ─── Interaction ───────────────────────────────────────────────────────────

  private onPointerDown = (e: PointerEvent) => {
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.lastInteraction = performance.now();
    this.flyTarget = null;

    if (this.pointers.size === 1) {
      this.moved = 0;
      this.downTime = performance.now();
      this.velocity = { x: 0, y: 0 };
    } else if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      this.pinchStartDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      this.pinchStartZ = this.camera.position.z;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId)!;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.lastInteraction = performance.now();

    if (this.pointers.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      this.moved += Math.abs(dx) + Math.abs(dy);
      const zoomFactor = this.camera.position.z / 300; // slower rotation when close
      const k = 0.0042 * zoomFactor;
      this.globeGroup.rotation.y += dx * k;
      this.globeGroup.rotation.x += dy * k;
      this.globeGroup.rotation.x = Math.min(Math.PI / 3, Math.max(-Math.PI / 3, this.globeGroup.rotation.x));
      this.velocity = { x: dy * k, y: dx * k };
    } else if (this.pointers.size === 2 && this.pinchStartDist > 0) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scale = this.pinchStartDist / Math.max(1, dist);
      this.setCameraZ(this.pinchStartZ * scale);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    this.lastInteraction = performance.now();

    if (wasSingle) {
      const dt = performance.now() - this.downTime;
      if (this.moved < 9 && dt < 600) {
        const pick = this.pickAt(e.clientX, e.clientY);
        this.onPick(pick);
        this.velocity = { x: 0, y: 0 };
      }
    }
    if (this.pointers.size < 2) this.pinchStartDist = 0;
    if (this.pointers.size === 1) {
      this.moved = 10; // continuing drag after pinch shouldn't count as tap
    }
  };

  private onPointerCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStartDist = 0;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.lastInteraction = performance.now();
    this.setCameraZ(this.camera.position.z * (e.deltaY > 0 ? 1.1 : 0.9));
  };

  private setCameraZ(z: number) {
    const clamped = Math.min(this.camMax, Math.max(CAM_MIN, z));
    this.camera.position.z = clamped;
    if (clamped >= this.camMax - 0.5) {
      if (!this.maxZoomOutFired) {
        this.maxZoomOutFired = true;
        this.onMaxZoomOut?.();
      }
    } else if (clamped < this.camMax - 40) {
      this.maxZoomOutFired = false;
    }
  }

  zoomIn() { this.setCameraZ(this.camera.position.z / 1.35); this.lastInteraction = performance.now(); }
  zoomOut() { this.setCameraZ(this.camera.position.z * 1.35); this.lastInteraction = performance.now(); }
  resetView() {
    this.flyTarget = { rx: 0.28, ry: this.globeGroup.rotation.y % (Math.PI * 2), z: this.fitDistance() };
  }

  // ─── Animation loop ────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animHandle = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = performance.now();

    // Inertia
    if (this.pointers.size === 0 && !this.flyTarget) {
      if (Math.abs(this.velocity.x) > 1e-5 || Math.abs(this.velocity.y) > 1e-5) {
        this.globeGroup.rotation.y += this.velocity.y;
        this.globeGroup.rotation.x += this.velocity.x;
        this.globeGroup.rotation.x = Math.min(Math.PI / 3, Math.max(-Math.PI / 3, this.globeGroup.rotation.x));
        this.velocity.x *= 0.94;
        this.velocity.y *= 0.94;
      }

      // Idle auto-rotate
      if (!this.reducedMotion && now - this.lastInteraction > 6000) {
        this.globeGroup.rotation.y += dt * 0.06;
      }
    }

    // Fly-to easing
    if (this.flyTarget) {
      const g = this.globeGroup.rotation;
      const t = this.flyTarget;
      g.x += (t.rx - g.x) * Math.min(1, dt * 4.5);
      g.y += (t.ry - g.y) * Math.min(1, dt * 4.5);
      this.camera.position.z += (t.z - this.camera.position.z) * Math.min(1, dt * 4.5);
      if (Math.abs(t.rx - g.x) < 0.004 && Math.abs(t.ry - g.y) < 0.004 && Math.abs(t.z - this.camera.position.z) < 1) {
        this.flyTarget = null;
        // A finished flight counts as interaction — hold still afterwards
        // instead of immediately resuming the idle auto-rotation.
        this.lastInteraction = now;
      }
    }

    // Pulse overlay (quiz hint)
    const overlayMat = this.overlayMesh.material as THREE.MeshBasicMaterial;
    if (this.pulseUntil > now) {
      overlayMat.opacity = 0.55 + 0.45 * Math.sin(now / 140);
    } else if (this.pulseUntil !== 0) {
      this.pulseUntil = 0;
      overlayMat.opacity = 1;
      this.paintOverlay(null);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
