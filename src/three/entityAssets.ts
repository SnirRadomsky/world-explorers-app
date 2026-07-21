/**
 * Painted entity sprites: animals, landmark heroes, land-journey props.
 * Prefer billboards when available; callers keep procedural mesh as fallback.
 * Magenta-keyed PNGs under public/assets/entities/sprites.
 */
import * as THREE from "three";

export type AnimalSpriteId =
  | "camel"
  | "kangaroo"
  | "panda"
  | "lion"
  | "elephant"
  | "bear"
  | "llama"
  | "toucan"
  | "eagle"
  | "rooster"
  | "ibex"
  | "wolf"
  | "sheep"
  | "cow"
  | "crane"
  | "giraffe"
  | "deer"
  | "penguin";

export type LandmarkSpriteId =
  | "liberty"
  | "christRedeemer"
  | "moai"
  | "kotel"
  | "eiffel"
  | "pyramid"
  | "colosseum"
  | "bigben"
  | "tajMahal"
  | "operaHouse"
  | "greatWall"
  | "windmill"
  | "torii"
  | "pisa"
  | "kremlin"
  | "machuPicchu"
  | "azrieli"
  | "burj"
  | "petra"
  | "neuschwanstein"
  | "niagara"
  | "fuji"
  | "redeemer";

export type SightSpriteId =
  | "deer"
  | "castle"
  | "windmill"
  | "waterfall"
  | "volcano"
  | "balloons"
  | "sheep"
  | "snowman"
  | "farm"
  | "ruins"
  | "tunnel"
  | "trainStation"
  | "city"
  | "island"
  | "cloudCastle";

export type EntitySpriteId = AnimalSpriteId | LandmarkSpriteId | SightSpriteId;

const ANIMAL_SPRITES: Record<AnimalSpriteId, string> = {
  camel: "entities/sprites/animal-camel.png",
  kangaroo: "entities/sprites/animal-kangaroo.png",
  panda: "entities/sprites/animal-panda.png",
  lion: "entities/sprites/animal-lion.png",
  elephant: "entities/sprites/animal-elephant.png",
  bear: "entities/sprites/animal-bear.png",
  llama: "entities/sprites/animal-llama.png",
  toucan: "entities/sprites/animal-toucan.png",
  eagle: "entities/sprites/animal-eagle.png",
  rooster: "entities/sprites/animal-rooster.png",
  ibex: "entities/sprites/animal-ibex.png",
  wolf: "entities/sprites/animal-wolf.png",
  sheep: "entities/sprites/animal-sheep.png",
  cow: "entities/sprites/animal-cow.png",
  crane: "entities/sprites/animal-crane.png",
  giraffe: "entities/sprites/animal-giraffe.png",
  deer: "entities/sprites/animal-deer.png",
  penguin: "entities/sprites/animal-penguin.png",
};

const LANDMARK_SPRITES: Record<LandmarkSpriteId, string> = {
  liberty: "entities/sprites/landmark-liberty.png",
  christRedeemer: "entities/sprites/landmark-christ-redeemer.png",
  moai: "entities/sprites/landmark-moai.png",
  kotel: "entities/sprites/landmark-kotel.png",
  eiffel: "entities/sprites/landmark-eiffel.png",
  pyramid: "entities/sprites/landmark-pyramid.png",
  colosseum: "entities/sprites/landmark-colosseum.png",
  bigben: "entities/sprites/landmark-bigben.png",
  tajMahal: "entities/sprites/landmark-tajmahal.png",
  operaHouse: "entities/sprites/landmark-opera.png",
  greatWall: "entities/sprites/landmark-greatwall.png",
  windmill: "entities/sprites/landmark-windmill.png",
  torii: "entities/sprites/landmark-torii.png",
  pisa: "entities/sprites/landmark-pisa.png",
  kremlin: "entities/sprites/landmark-kremlin.png",
  machuPicchu: "entities/sprites/landmark-machu.png",
  azrieli: "entities/sprites/landmark-azrieli.png",
  burj: "entities/sprites/landmark-burj.png",
  petra: "entities/sprites/landmark-petra.png",
  neuschwanstein: "entities/sprites/landmark-neuschwanstein.png",
  niagara: "entities/sprites/landmark-niagara.png",
  fuji: "entities/sprites/landmark-fuji.png",
  redeemer: "entities/sprites/landmark-christ-redeemer.png",
};

const SIGHT_SPRITES: Record<SightSpriteId, string> = {
  deer: "entities/sprites/sight-deer.png",
  castle: "entities/sprites/sight-castle.png",
  windmill: "entities/sprites/sight-windmill.png",
  waterfall: "entities/sprites/sight-waterfall.png",
  volcano: "entities/sprites/sight-volcano.png",
  balloons: "entities/sprites/sight-balloons.png",
  sheep: "entities/sprites/sight-sheep.png",
  snowman: "entities/sprites/sight-snowman.png",
  farm: "entities/sprites/sight-farm.png",
  ruins: "entities/sprites/sight-ruins.png",
  tunnel: "entities/sprites/sight-tunnel.png",
  trainStation: "entities/sprites/sight-train-station.png",
  city: "entities/sprites/sight-city.png",
  island: "entities/sprites/sight-island.png",
  cloudCastle: "entities/sprites/sight-cloud-castle.png",
};

const ALL_SPRITES: Record<string, string> = {
  ...ANIMAL_SPRITES,
  ...LANDMARK_SPRITES,
  ...SIGHT_SPRITES,
};

const loader = new THREE.TextureLoader();
const texCache = new Map<string, THREE.Texture>();
const matCache = new Map<string, THREE.Material>();

function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}assets/${rel}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}

function loadSpriteTex(rel: string): THREE.Texture {
  const key = `ent:${rel}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  // Vitest / Node has no DOM Image - use a tiny placeholder so builders still work in tests.
  let tex: THREE.Texture;
  if (typeof document === "undefined") {
    tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    tex.needsUpdate = true;
  } else {
    tex = loader.load(assetUrl(rel));
  }
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

function spriteRel(kind: string): string | null {
  return ALL_SPRITES[kind] || null;
}

export function hasEntitySprite(kind: string): boolean {
  return Boolean(spriteRel(kind));
}

export function hasAnimalSprite(id: string): boolean {
  return id in ANIMAL_SPRITES;
}

export function hasLandmarkSprite(id: string): boolean {
  return id in LANDMARK_SPRITES;
}

export function hasSightSprite(id: string): boolean {
  return id in SIGHT_SPRITES;
}

/** Camera-facing sprite standing on feet (good for animals). */
export function entitySprite(
  kind: string,
  size = 2,
  opts: { widthScale?: number; y?: number; tint?: number } = {}
): THREE.Sprite | null {
  const rel = spriteRel(kind);
  if (!rel) return null;
  const matKey = `entSpr:${kind}`;
  let m = matCache.get(matKey) as THREE.SpriteMaterial | undefined;
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: loadSpriteTex(rel),
      transparent: true,
      depthWrite: false,
      alphaTest: 0.15,
    });
    matCache.set(matKey, m);
  }
  const s = new THREE.Sprite(m);
  const h = size;
  const w = size * (opts.widthScale || 0.85);
  s.scale.set(w, h, 1);
  s.center.set(0.5, 0);
  s.position.y = opts.y ?? 0;
  s.name = "noshadow";
  if (opts.tint != null) {
    s.material = m.clone();
    s.material.color = new THREE.Color(opts.tint);
  }
  return s;
}

/** Crossed planes - better for landmarks that sit on a rotating stage. */
export function entityBillboard(
  kind: string,
  size = 2,
  opts: { widthScale?: number; tint?: number; sway?: number } = {}
): THREE.Group | null {
  const rel = spriteRel(kind);
  if (!rel) return null;
  const tex = loadSpriteTex(rel);
  const matKey = `entBb:${kind}`;
  let m = matCache.get(matKey) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    matCache.set(matKey, m);
  }
  const g = new THREE.Group();
  const h = size;
  const w = size * (opts.widthScale || 0.75);
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  const a = new THREE.Mesh(geo, m);
  const b = new THREE.Mesh(geo, m);
  b.rotation.y = Math.PI / 2;
  a.name = b.name = "noshadow";
  g.add(a, b);
  if (opts.tint != null) {
    const tinted = m.clone();
    tinted.color = new THREE.Color(opts.tint);
    a.material = tinted;
    b.material = tinted;
  }
  if (opts.sway != null) {
    g.userData.sway = { node: g, ph: Math.random() * 10, amt: opts.sway };
  }
  return g;
}

/**
 * Painted animal: camera-facing sprite in a group (so scenes can still
 * position/rotate the group). Optional tiny invisible hit box.
 */
export function paintedAnimal(
  id: AnimalSpriteId | string,
  size = 2.2,
  opts: { widthScale?: number } = {}
): THREE.Group | null {
  const spr = entitySprite(id, size, { widthScale: opts.widthScale ?? 0.9 });
  if (!spr) return null;
  const g = new THREE.Group();
  g.add(spr);
  // Invisible proxy for raycast / layout height
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.45, size * 0.85, size * 0.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = size * 0.42;
  hit.name = "hitproxy";
  g.add(hit);
  return g;
}

/**
 * Painted landmark hero: crossed billboard. Callers may still add a
 * procedural pedestal/base underneath.
 */
export function paintedLandmark(
  id: LandmarkSpriteId | string,
  size = 3.5,
  opts: { widthScale?: number } = {}
): THREE.Group | null {
  return entityBillboard(id, size, { widthScale: opts.widthScale ?? 0.7 });
}

/** Land-journey roadside / sight prop. */
export function paintedSight(
  id: SightSpriteId | string,
  size = 3,
  opts: { widthScale?: number } = {}
): THREE.Group | null {
  return entityBillboard(id, size, { widthScale: opts.widthScale ?? 0.8 });
}

/** Map wonder-site ids (kotel, liberty, …) onto landmark sprite keys. */
export function landmarkSpriteKeyForWonder(id: string): LandmarkSpriteId | null {
  const map: Record<string, LandmarkSpriteId> = {
    kotel: "kotel",
    liberty: "liberty",
    redeemer: "redeemer",
    moai: "moai",
    eiffel: "eiffel",
    pyramids: "pyramid",
    colosseum: "colosseum",
    bigben: "bigben",
    tajmahal: "tajMahal",
    opera: "operaHouse",
    greatwall: "greatWall",
    burj: "burj",
    petra: "petra",
    neuschwanstein: "neuschwanstein",
    niagara: "niagara",
    fuji: "fuji",
    machu: "machuPicchu",
  };
  return map[id] ?? null;
}
