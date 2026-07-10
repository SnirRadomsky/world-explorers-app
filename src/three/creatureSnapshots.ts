// Real pictures for the marine quiz & encyclopedia: each creature's actual 3D
// model is rendered once to a small transparent PNG (data URL) with a shared
// offscreen WebGL renderer, then cached. Falls back to null (→ emoji) when
// WebGL isn't available.

import * as THREE from "three";
import { CREATURE_BY_ID } from "../data/marineLife";
import { buildCreature } from "./lowPolyLife";

const SIZE = 240;
const cache = new Map<string, string | null>();

interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

let studio: Studio | null | undefined;

function getStudio(): Studio | null {
  if (studio !== undefined) return studio;
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // required for toDataURL
    });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xfff6e0, 1.35);
    sun.position.set(3, 5, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd8ff, 0.55);
    fill.position.set(-4, -2, -4);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    studio = { renderer, scene, camera };
  } catch {
    studio = null;
  }
  return studio;
}

/** Photo-booth portrait of a creature (hero 3/4 angle), cached per id. */
export function getCreatureSnapshot(id: string): string | null {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;

  const spec = CREATURE_BY_ID.get(id);
  const s = spec ? getStudio() : null;
  if (!spec || !s) {
    cache.set(id, null);
    return null;
  }

  try {
    const g = buildCreature(spec);
    const box = new THREE.Box3().setFromObject(g);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    g.position.sub(center);
    g.rotation.y = -0.55; // 3/4 hero angle, nose toward the viewer

    s.scene.add(g);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const dist = (maxDim / (2 * Math.tan((35 * Math.PI) / 360))) * 1.22;
    s.camera.position.set(dist * 0.18, dist * 0.28, dist);
    s.camera.lookAt(0, 0, 0);
    s.renderer.render(s.scene, s.camera);
    const url = s.renderer.domElement.toDataURL("image/png");
    s.scene.remove(g);
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
      else if (m) m.dispose();
    });
    cache.set(id, url);
    return url;
  } catch {
    cache.set(id, null);
    return null;
  }
}
